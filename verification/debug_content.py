from playwright.sync_api import sync_playwright
import time

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context()

    context.add_init_script("""
        window.localStorage.setItem('user', JSON.stringify({id: 1, name: 'Admin', role: 'admin'}));
        window.localStorage.setItem('language', 'de');
    """)

    page = context.new_page()

    # Block the /api/auth/me call or mock it to return the admin user
    page.route("**/api/auth/me", lambda route: route.fulfill(
        status=200,
        content_type="application/json",
        body='{"id": 1, "name": "Admin", "role": "admin"}'
    ))

    page.goto("http://localhost:5173/admin")
    time.sleep(10)
    page.screenshot(path="verification/admin_openlibrary_final.png")
    browser.close()

with sync_playwright() as playwright:
    run(playwright)
