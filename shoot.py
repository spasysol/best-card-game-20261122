import sys, time
from playwright.sync_api import sync_playwright

SHOTS = [
    ("title", "1-title.png"),
    ("play", "2-play.png"),
    ("win", "3-win.png"),
    ("loss", "4-loss.png"),
]

with sync_playwright() as p:
    browser = p.chromium.launch(
        executable_path="/home/hatch/.cache/ms-playwright/chromium-1255/chrome-linux64/chrome",
        args=["--no-sandbox", "--disable-gpu"],
    )
    page = browser.new_page(viewport={"width": 1280, "height": 800})
    for name, out in SHOTS:
        page.goto(f"http://localhost:8091/index.html?shot={name}&seed=7")
        page.wait_for_function("window.__shotReady === true", timeout=15000)
        page.wait_for_timeout(1400)
        page.screenshot(path=f"/tmp/shots/{out}")
        print("captured", out)
    browser.close()
print("done")
