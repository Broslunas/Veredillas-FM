from playwright.sync_api import sync_playwright

def verify():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        page.set_viewport_size({"width": 1280, "height": 800})
        page.set_default_timeout(60000)

        # Verify index page
        print("Navigating to index...")
        page.goto('http://localhost:4321/blog', wait_until="networkidle")
        print("Navigated. Waiting for post-item...")
        page.wait_for_selector('.post-item')
        page.screenshot(path='/home/jules/verification/blog-index-v2.png', full_page=True)
        print("Index screenshot taken.")

        # Click on a post
        print("Clicking post...")
        page.click('.post-item a')
        print("Clicked post. Waiting for networkidle...")
        page.wait_for_load_state('networkidle')
        page.screenshot(path='/home/jules/verification/blog-post-v2.png', full_page=True)
        print("Post screenshot taken.")

        browser.close()

if __name__ == "__main__":
    verify()
