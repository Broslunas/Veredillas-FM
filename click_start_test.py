import sys
from playwright.sync_api import sync_playwright

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Capture console logs
        page.on("console", lambda msg: print(f"Browser Console: {msg.text}"))
        page.on("pageerror", lambda err: print(f"Browser Error: {err}"))

        page.goto('http://localhost:4321/runner', wait_until='networkidle')
        page.wait_for_selector('#start-btn', state='visible')
        button = page.locator('#start-btn')
        print(f"Start btn visible: {button.is_visible()}")

        print("Clicking start button...")
        button.click()
        page.wait_for_timeout(1000)

        start_screen_hidden = page.evaluate("document.getElementById('start-screen').classList.contains('hidden')")
        print(f"Start screen hidden after click: {start_screen_hidden}")

        page.screenshot(path='debug_after_click.png')
        browser.close()

if __name__ == '__main__':
    run()
