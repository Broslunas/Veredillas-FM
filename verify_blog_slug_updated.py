import asyncio
from playwright.async_api import async_playwright

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page(viewport={"width": 1280, "height": 800})

        print("Waiting for server to start...")
        # Start server first

        print("Navigating to local preview server...")
        await page.goto("http://localhost:4321/blog/bienvenida", timeout=60000)

        # Take screenshot of the blog post page
        await page.wait_for_timeout(4000)
        await page.screenshot(path="/home/jules/verification/blog-slug-v2.png", full_page=True)
        print("Screenshot saved to /home/jules/verification/blog-slug-v2.png")

        await browser.close()

if __name__ == "__main__":
    asyncio.run(main())
