#!/usr/bin/env python3
"""
Quick test to verify proxies and timeout optimizations are working
"""
import asyncio
from playwright.async_api import async_playwright
import time

async def test_draft_generation():
    async with async_playwright() as p:
        # Launch browser
        browser = await p.chromium.launch(headless=False)
        page = await browser.new_page()

        print("✓ Opening draft writer...")
        await page.goto('http://localhost:3000/write')

        # Wait for page to load
        await page.wait_for_timeout(2000)

        print("✓ Filling in draft details...")

        # Fill in topic
        topic_input = page.locator('input[name="topic"], textarea[placeholder*="topic" i], input[placeholder*="topic" i]').first
        await topic_input.fill('Testing Proxy and Timeout Optimization in Academic Citation APIs')

        # Select language if needed
        await page.wait_for_timeout(1000)

        print("✓ Starting draft generation...")

        # Click generate button
        generate_btn = page.locator('button:has-text("Generate"), button:has-text("Start"), button:has-text("Create")').first
        await generate_btn.click()

        print("✓ Draft generation started!")
        print("✓ Monitoring progress...")

        # Monitor progress for 30 seconds
        start_time = time.time()
        last_progress = None

        for i in range(30):
            await page.wait_for_timeout(1000)

            # Check if progress is visible
            progress_text = await page.locator('text=/\\d+%/').first.text_content() if await page.locator('text=/\\d+%/').count() > 0 else None

            if progress_text and progress_text != last_progress:
                elapsed = time.time() - start_time
                print(f"  [{elapsed:.1f}s] Progress: {progress_text}")
                last_progress = progress_text

            # Check if we see "Searching CrossRef" or similar
            if await page.locator('text=/searching/i').count() > 0:
                status = await page.locator('text=/searching/i').first.text_content()
                print(f"  Status: {status}")

        print("\n✓ Test complete!")
        print("  - Check if progress bars moved smoothly")
        print("  - Check Modal logs for proxy usage")
        print("  - Check if timeouts are faster (10s instead of 60s)")

        # Keep browser open for inspection
        await page.wait_for_timeout(5000)
        await browser.close()

if __name__ == '__main__':
    asyncio.run(test_draft_generation())
