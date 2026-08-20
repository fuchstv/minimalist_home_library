<#
.SYNOPSIS
    Automated Deployment Script for Hausbibliothek Power Automate Flow in Microsoft 365.
#>

[CmdletBinding()]
param (
    [Parameter(Mandatory = $false)]
    [string]$FlowName = "SprachCafé - Hausbibliothek Mail Dispatcher",

    [Parameter(Mandatory = $false)]
    [string]$SenderAddress = "bibliothek@sprachcafe-polnisch.org"
)

Write-Host "=================================================================" -ForegroundColor Cyan
Write-Host "🚀 DEPLOYING HAUSBIBLIOTHEK FLOW TO MICROSOFT 365 POWER AUTOMATE" -ForegroundColor Green
Write-Host "=================================================================" -ForegroundColor Cyan
Write-Host ""

# 1. Obtain Flow Token
Write-Host "[1/5] Abrufen des Power Automate API-Tokens..." -ForegroundColor Yellow
$tokenJson = az account get-access-token --resource "https://service.flow.microsoft.com/" | ConvertFrom-Json
$token = $tokenJson.accessToken
if (-not $token) {
    Write-Error "Konnte kein Access-Token abrufen. Bitte 'az login' ausführen."
    exit 1
}

$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
}

$envName = "Default-b745a80a-f682-45e4-ba2e-d48bbd9e703d"
$office365ConnName = "shared-office365-c125f38c-a041-4066-9f00-11b9a707595c"

# 2. Check if flow already exists
Write-Host "[2/5] Prüfen auf bestehenden Flow..." -ForegroundColor Yellow
$flowsUrl = "https://api.flow.microsoft.com/providers/Microsoft.ProcessSimple/environments/$envName/flows?api-version=2016-11-01"
$existingFlows = (Invoke-RestMethod -Uri $flowsUrl -Headers $headers).value
$existingFlow = $existingFlows | Where-Object { $_.properties.displayName -eq $FlowName } | Select-Object -First 1

$flowDefinition = @{
    properties = @{
        displayName = $FlowName
        definition = @{
            "`$schema" = "https://schema.management.azure.com/providers/Microsoft.Logic/schemas/2016-06-01/workflowdefinition.json#"
            contentVersion = "1.0.0.0"
            parameters = @{
                "`$connections" = @{
                    defaultValue = @{}
                    type = "Object"
                }
                "`$authentication" = @{
                    defaultValue = @{}
                    type = "SecureObject"
                }
            }
            triggers = @{
                manual = @{
                    type = "Request"
                    kind = "Http"
                    inputs = @{
                        schema = @{
                            type = "object"
                            properties = @{
                                to = @{ type = "string" }
                                from = @{ type = "string" }
                                subject = @{ type = "string" }
                                bodyHtml = @{ type = "string" }
                                template = @{ type = "string" }
                                source = @{ type = "string" }
                                timestamp = @{ type = "string" }
                                metadata = @{ type = "object" }
                            }
                            required = @("to", "subject", "bodyHtml")
                        }
                        triggerAuthenticationType = "All"
                    }
                }
            }
            actions = @{
                "Send_an_email_(V2)" = @{
                    type = "OpenApiConnection"
                    inputs = @{
                        host = @{
                            apiId = "/providers/Microsoft.PowerApps/apis/shared_office365"
                            connectionName = "shared_office365"
                            operationId = "SendEmailV2"
                        }
                        parameters = @{
                            "emailMessage/To" = "@triggerBody()?['to']"
                            "emailMessage/Subject" = "@triggerBody()?['subject']"
                            "emailMessage/Body" = "@triggerBody()?['bodyHtml']"
                            "emailMessage/From" = $SenderAddress
                            "emailMessage/Importance" = "Normal"
                        }
                        authentication = "@parameters('`$authentication')"
                    }
                    runAfter = @{}
                }
                "Response_Success" = @{
                    type = "Response"
                    kind = "Http"
                    inputs = @{
                        statusCode = 200
                        headers = @{
                            "Content-Type" = "application/json"
                        }
                        body = @{
                            status = "success"
                            message = "Email successfully dispatched via M365 Exchange Online"
                            recipient = "@triggerBody()?['to']"
                            timestamp = "@{utcNow()}"
                        }
                    }
                    runAfter = @{
                        "Send_an_email_(V2)" = @("Succeeded")
                    }
                }
            }
        }
        connectionReferences = @{
            shared_office365 = @{
                connectionName = $office365ConnName
                source = "Embedded"
                id = "/providers/Microsoft.PowerApps/apis/shared_office365"
                displayName = "Office 365 Outlook"
                tier = "Standard"
            }
        }
        state = "Started"
    }
} | ConvertTo-Json -Depth 10

# 3. Create or Update Flow
if ($existingFlow) {
    Write-Host "[3/5] Aktualisiere bestehenden Flow '$FlowName' (ID: $($existingFlow.name))..." -ForegroundColor Cyan
    $targetUrl = "https://api.flow.microsoft.com/providers/Microsoft.ProcessSimple/environments/$envName/flows/$($existingFlow.name)?api-version=2016-11-01"
    $flowResult = Invoke-RestMethod -Uri $targetUrl -Method Patch -Headers $headers -Body $flowDefinition
    $flowId = $existingFlow.name
} else {
    Write-Host "[3/5] Erstelle neuen Flow '$FlowName' in Power Automate..." -ForegroundColor Cyan
    $targetUrl = "https://api.flow.microsoft.com/providers/Microsoft.ProcessSimple/environments/$envName/flows?api-version=2016-11-01"
    $flowResult = Invoke-RestMethod -Uri $targetUrl -Method Post -Headers $headers -Body $flowDefinition
    $flowId = $flowResult.name
}

Write-Host "✅ Flow erfolgreich bereitgestellt! (Flow ID: $flowId)" -ForegroundColor Green

# 4. Query Callback Webhook URL
Write-Host "[4/5] Abrufen der HTTP Webhook URL..." -ForegroundColor Yellow
$callbackUrlEndpoint = "https://api.flow.microsoft.com/providers/Microsoft.ProcessSimple/environments/$envName/flows/$flowId/triggers/manual/listCallbackUrl?api-version=2016-11-01"
$callbackResponse = Invoke-RestMethod -Uri $callbackUrlEndpoint -Method Post -Headers $headers
$webhookUrl = $callbackResponse.value

if (-not $webhookUrl) {
    # fallback to response.value
    $webhookUrl = $callbackResponse.response.value
}

Write-Host "✅ Webhook URL generiert:" -ForegroundColor Green
Write-Host "   $webhookUrl" -ForegroundColor Cyan

# 5. Write to .env
Write-Host "[5/5] Speichern der Webhook-URL in backend/.env..." -ForegroundColor Yellow
$envPath = "/home/ubuntu/minimalist_home_library/backend/.env"
$envContent = "POWER_AUTOMATE_MAIL_WEBHOOK_URL=$webhookUrl`n"
Set-Content -Path $envPath -Value $envContent -Encoding UTF8
Write-Host "✅ In $envPath gespeichert!" -ForegroundColor Green

Write-Host ""
Write-Host "🎉 DEPLOYMENT ABGESCHLOSSEN!" -ForegroundColor Green
