<?php
namespace Tests;

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/../mail_utils.php';

class MailUtilsTest extends TestCase {

    public function testRenderEmailTemplateWithAllParameters() {
        $html = renderEmailTemplate(
            'Test Titel DE',
            'Test Tytuł PL',
            'Test Badge',
            '<p>Test Inhalt DE</p>',
            '<p>Test Treść PL</p>',
            'Test Button',
            'https://example.com/cta-link',
            'Test Extra Footer'
        );

        $this->assertStringContainsString('Test Titel DE', $html, 'Title DE is missing');
        $this->assertStringContainsString('Test Tytuł PL', $html, 'Title PL is missing');
        $this->assertStringContainsString('Test Badge', $html, 'Badge is missing');
        $this->assertStringContainsString('<p>Test Inhalt DE</p>', $html, 'Content DE is missing');
        $this->assertStringContainsString('<p>Test Treść PL</p>', $html, 'Content PL is missing');
        $this->assertStringContainsString('Test Button', $html, 'CTA Text is missing');
        $this->assertStringContainsString('https://example.com/cta-link', $html, 'CTA URL is missing');
        $this->assertStringContainsString('Test Extra Footer', $html, 'Extra Footer is missing');
    }

    public function testRenderEmailTemplateWithoutOptionalParameters() {
        $html = renderEmailTemplate(
            'Test Titel DE',
            'Test Tytuł PL',
            'Test Badge',
            '<p>Test Inhalt DE</p>',
            '<p>Test Treść PL</p>'
        );

        $this->assertStringContainsString('Test Titel DE', $html);
        $this->assertStringContainsString('Test Tytuł PL', $html);

        $this->assertStringNotContainsString('https://example.com/cta-link', $html, 'CTA button should not be rendered');
        $this->assertStringNotContainsString('Test Button', $html);
    }

    public function testRenderEmailTemplateEscapesOutputProperly() {
        $html = renderEmailTemplate(
            '<script>alert("Title DE")</script>',
            '<script>alert("Title PL")</script>',
            '<script>alert("Badge")</script>',
            '<p>Safe Content DE</p>',
            '<p>Safe Content PL</p>',
            '<script>alert("CTA")</script>',
            'javascript:alert(1)'
        );

        $this->assertStringNotContainsString('<script>alert("Title DE")</script>', $html);
        $this->assertStringContainsString('&lt;script&gt;alert(&quot;Title DE&quot;)&lt;/script&gt;', $html);

        $this->assertStringNotContainsString('<script>alert("Title PL")</script>', $html);
        $this->assertStringContainsString('&lt;script&gt;alert(&quot;Title PL&quot;)&lt;/script&gt;', $html);

        $this->assertStringNotContainsString('<script>alert("Badge")</script>', $html);
        $this->assertStringContainsString('&lt;script&gt;alert(&quot;Badge&quot;)&lt;/script&gt;', $html);

        $this->assertStringNotContainsString('<script>alert("CTA")</script>', $html);
        $this->assertStringContainsString('&lt;script&gt;alert(&quot;CTA&quot;)&lt;/script&gt;', $html);
    }
}
