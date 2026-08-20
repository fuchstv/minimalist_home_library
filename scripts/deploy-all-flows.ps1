<#
.SYNOPSIS
    Deploys all 8 specialized Hausbibliothek Power Automate Flows to Microsoft 365.
#>

[CmdletBinding()]
param (
    [Parameter(Mandatory = $false)]
    [string]$SenderAddress = "bibliothek@sprachcafe-polnisch.org"
)

Write-Host "=================================================================" -ForegroundColor Cyan
Write-Host "🚀 DEPLOYING ALL 8 DEDICATED HAUSBIBLIOTHEK FLOWS TO M365" -ForegroundColor Green
Write-Host "=================================================================" -ForegroundColor Cyan
Write-Host ""

# 1. Obtain Flow Token
Write-Host "[1/4] Abrufen des Power Automate API-Tokens..." -ForegroundColor Yellow
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

# 2. Define the 8 Flows
$flowsToDeploy = @(
    @{
        Key = "POWER_AUTOMATE_WEBHOOK_WELCOME"
        Template = "welcome"
        DisplayName = "SprachCafé - Hausbibliothek: Willkommen & Registrierung"
        Description = "Sendet zweisprachige Willkommens-E-Mail bei Neuregistrierung eines Lesers."
        Importance = "Normal"
    },
    @{
        Key = "POWER_AUTOMATE_WEBHOOK_LOAN_CONFIRMATION"
        Template = "loan_confirmation"
        DisplayName = "SprachCafé - Hausbibliothek: Ausleihbestätigung"
        Description = "Sendet Ausleihbestätigung mit Buchtitel, Signatur und Rückgabefrist (4 Wochen)."
        Importance = "Normal"
    },
    @{
        Key = "POWER_AUTOMATE_WEBHOOK_BOOK_AVAILABLE"
        Template = "book_available"
        DisplayName = "SprachCafé - Hausbibliothek: Vormerkung abholbereit"
        Description = "Benachrichtigt Leser, sobald ein vorgemerktes Buch zurückgegeben wurde (7 Tage Abholfrist)."
        Importance = "High"
    },
    @{
        Key = "POWER_AUTOMATE_WEBHOOK_DUE_REMINDER"
        Template = "due_reminder"
        DisplayName = "SprachCafé - Hausbibliothek: Frist-Erinnerung"
        Description = "Automatische Erinnerung 3 Tage vor Ablauf der Leihfrist."
        Importance = "Normal"
    },
    @{
        Key = "POWER_AUTOMATE_WEBHOOK_OVERDUE"
        Template = "overdue_reminder"
        DisplayName = "SprachCafé - Hausbibliothek: Mahnung bei Überfälligkeit"
        Description = "Freundliche Mahnung bei überschrittener Leihfrist."
        Importance = "High"
    },
    @{
        Key = "POWER_AUTOMATE_WEBHOOK_PASSWORD_RESET"
        Template = "password_reset"
        DisplayName = "SprachCafé - Hausbibliothek: Passwort vergessen & Reset"
        Description = "Zusendung eines sicheren 1-Stunden-Sicherheitslinks zum Zurücksetzen des Passworts."
        Importance = "High"
    },
    @{
        Key = "POWER_AUTOMATE_WEBHOOK_ADMIN_NEW_USER"
        Template = "admin_new_user"
        DisplayName = "SprachCafé - Hausbibliothek: Neuregistrierungs-Alert"
        Description = "Sofortige Admin-Benachrichtigung bei neuen Nutzerregistrierungen."
        Importance = "Normal"
    },
    @{
        Key = "POWER_AUTOMATE_WEBHOOK_ADMIN_DIGEST"
        Template = "admin_daily_digest"
        DisplayName = "SprachCafé - Hausbibliothek: Täglicher Tagesbericht (Digest)"
        Description = "Täglicher Morgenbericht mit überfälligen Ausleihen und anstehenden Rückgaben für das Bibliotheksteam."
        Importance = "Normal"
    }
)

Write-Host "[2/4] Abrufen bestehender Flows in Umgebung '$envName'..." -ForegroundColor Yellow
$flowsUrl = "https://api.flow.microsoft.com/providers/Microsoft.ProcessSimple/environments/$envName/flows?api-version=2016-11-01"
$existingFlows = (Invoke-RestMethod -Uri $flowsUrl -Headers $headers).value

$results = @()
$envLines = @()

# 3. Deploy Each Flow
Write-Host "[3/4] Erstelle / Aktualisiere die 8 Flows..." -ForegroundColor Yellow

foreach ($item in $flowsToDeploy) {
    $dispName = $item.DisplayName
    Write-Host " -> Verarbeite: $dispName" -ForegroundColor Cyan

    $existing = $existingFlows | Where-Object { $_.properties.displayName -eq $dispName } | Select-Object -First 1

    $flowBody = @{
        properties = @{
            displayName = $dispName
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
                                "emailMessage/Importance" = $item.Importance
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
                                flow = $dispName
                                template = $item.Template
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

    if ($existing) {
        $flowId = $existing.name
        $targetUrl = "https://api.flow.microsoft.com/providers/Microsoft.ProcessSimple/environments/$envName/flows/$flowId`?api-version=2016-11-01"
        $flowResult = Invoke-RestMethod -Uri $targetUrl -Method Patch -Headers $headers -Body $flowBody
    } else {
        $targetUrl = "https://api.flow.microsoft.com/providers/Microsoft.ProcessSimple/environments/$envName/flows?api-version=2016-11-01"
        $flowResult = Invoke-RestMethod -Uri $targetUrl -Method Post -Headers $headers -Body $flowBody
        $flowId = $flowResult.name
    }

    # Fetch Callback URL
    $callbackUrlEndpoint = "https://api.flow.microsoft.com/providers/Microsoft.ProcessSimple/environments/$envName/flows/$flowId/triggers/manual/listCallbackUrl?api-version=2016-11-01"
    $callbackResponse = Invoke-RestMethod -Uri $callbackUrlEndpoint -Method Post -Headers $headers
    $webhookUrl = $callbackResponse.value
    if (-not $webhookUrl) {
        $webhookUrl = $callbackResponse.response.value
    }

    $envLines += "$($item.Key)=$webhookUrl"

    $results += [PSCustomObject]@{
        Workflow = $item.DisplayName
        Key = $item.Key
        FlowId = $flowId
        WebhookUrl = $webhookUrl
    }
}

# 4. Write all to backend/.env
Write-Host ""
Write-Host "[4/4] Speichere alle Webhook URLs in backend/.env..." -ForegroundColor Yellow
$envPath = "/home/ubuntu/minimalist_home_library/backend/.env"
# also keep master fallback
$masterUrl = ($results | Where-Object { $_.Key -eq "POWER_AUTOMATE_WEBHOOK_WELCOME" }).WebhookUrl
$fullEnvContent = "POWER_AUTOMATE_MAIL_WEBHOOK_URL=$masterUrl`n" + ($envLines -join "`n") + "`n"
Set-Content -Path $envPath -Value $fullEnvContent -Encoding UTF8

Write-Host "✅ In $envPath gespeichert!" -ForegroundColor Green
Write-Host ""
Write-Host "=== Übersicht aller 8 bereitgestellten Flows ===" -ForegroundColor Green
$results | Format-Table Workflow, Key, FlowId -AutoSize
Write-Host "🎉 Alle 8 Flows wurden erfolgreich bereitgestellt und aktiviert!" -ForegroundColor Green
