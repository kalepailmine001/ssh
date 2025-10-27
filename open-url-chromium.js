const { chromium } = require('playwright');

async function openUrl() {
  let browser;
  try {
    console.log('Launching Chromium browser...');
    
    // Launch browser with options to handle potential issues
    browser = await chromium.launch({
      headless: false, // Set to true if you want headless mode
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu',
        '--no-first-run',
        '--no-zygote',
        '--single-process',
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows',
        '--disable-renderer-backgrounding'
      ]
    });

    console.log('Creating new page...');
    const page = await browser.newPage();

    console.log('Navigating to https://ltc-trx-faucet.xyz/login');
    await page.goto('https://ltc-trx-faucet.xyz/login', {
      waitUntil: 'networkidle',
      timeout: 30000
    });

    console.log('Page loaded successfully!');
    console.log('Page title:', await page.title());
    console.log('Current URL:', page.url());

    // Keep the browser open for a while so you can see it
    console.log('Browser will stay open for 30 seconds...');
    await page.waitForTimeout(30000);

  } catch (error) {
    console.error('Error occurred:', error.message);
    
    if (error.message.includes('executable doesn\'t exist')) {
      console.error('Chromium browser is not properly installed. Try running: npx playwright install chromium');
    } else if (error.message.includes('net::ERR_')) {
      console.error('Network error - please check your internet connection and the URL');
    }
  } finally {
    if (browser) {
      console.log('Closing browser...');
      await browser.close();
    }
  }
}

// Run the function
openUrl().catch(console.error);