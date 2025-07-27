const { webkit } = require('playwright');

async function openUrl() {
  let browser;
  try {
    console.log('Launching WebKit browser in headless mode...');
    
    // Launch browser in headless mode to avoid GUI dependencies
    browser = await webkit.launch({
      headless: true, // Headless mode to avoid GUI dependencies
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu',
        '--no-first-run',
        '--no-zygote',
        '--single-process'
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

    // Take a screenshot to verify the page loaded
    console.log('Taking screenshot...');
    await page.screenshot({ path: 'ltc-trx-faucet-login.png', fullPage: true });
    console.log('Screenshot saved as ltc-trx-faucet-login.png');

    // Get some basic page info
    const pageContent = await page.textContent('body');
    console.log('Page contains text:', pageContent ? pageContent.substring(0, 200) + '...' : 'No text found');

  } catch (error) {
    console.error('Error occurred:', error.message);
    
    if (error.message.includes('executable doesn\'t exist')) {
      console.error('WebKit browser is not properly installed. Try running: npx playwright install webkit');
    } else if (error.message.includes('net::ERR_')) {
      console.error('Network error - please check your internet connection and the URL');
    } else if (error.message.includes('Host system is missing dependencies')) {
      console.error('System dependencies missing. Try using Chromium instead: node open-url-chromium.js');
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