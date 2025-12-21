const { connect } = require('puppeteer-real-browser');

async function checkPerson(nid, firstName) {
  const { page, browser } = await connect({
    headless: false,
    turnstile: true,
  });

  try {
    await page.goto('https://pprvr.elections.gov.mv', {
      waitUntil: 'networkidle2'
    });

    await new Promise(resolve => setTimeout(resolve, 2000));

    await page.waitForSelector('input[name="NID"]', { visible: true });
    await page.evaluate((nid) => {
      document.querySelector('input[name="NID"]').value = nid;
    }, nid);

    await page.waitForSelector('input[name="FirstName"]', { visible: true });
    await page.evaluate((firstName) => {
      document.querySelector('input[name="FirstName"]').value = firstName;
    }, firstName);

    console.log(`Form filled for ${firstName} (${nid}). Waiting for CAPTCHA...`);

    await page.waitForFunction(
      () => document.querySelector('#CfTurnstileResponse')?.value?.length > 0,
      { timeout: 60000 }
    );

    console.log('CAPTCHA solved! Submitting...');

    await page.click('#submitBtn');

    // Wait for actual results to load (removed 'body' selector bug, increased timeout)
    await Promise.race([
      page.waitForNavigation({ timeout: 20000 }),
      page.waitForSelector('table tbody tr, h4 + p', { timeout: 20000 })
    ]).catch(() => {
      // Timeout is OK, we'll check what's on the page anyway
    });

    // Extra wait to ensure content is fully rendered
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Check for rate limiting
    const bodyText = await page.evaluate(() => document.body.textContent);
    if (bodyText.includes('We have detected malicious automated requests from your browser')) {
      await browser.close();
      const error = new Error('RATE_LIMITED');
      error.isRateLimit = true;
      throw error;
    }

    const result = await page.evaluate(() => {
      const row = document.querySelector('table tbody tr');
      if (row) {
        return {
          status: 'found',
          party: row.querySelector('td[data-label="Name"]')?.textContent.trim(),
          reg_date: row.querySelector('td[data-label="Registered On"]')?.textContent.trim()
        };
      }

      const notFound = document.querySelector('h4 + p')?.textContent.trim();
      if (notFound === 'NOT FOUND!') {
        return {
          status: 'notfound',
          party: '',
          reg_date: ''
        };
      }

      // Debug: capture what's actually on the page
      return {
        status: 'unknown',
        debug: {
          bodyText: document.body.textContent.substring(0, 500),
          hasTable: !!document.querySelector('table'),
          hasTableRow: !!document.querySelector('table tbody tr'),
          hasH4: !!document.querySelector('h4'),
          h4Text: document.querySelector('h4')?.textContent.trim()
        }
      };
    });

    await browser.close();
    return result;
  } catch (error) {
    await browser.close();
    throw error;
  }
}

module.exports = { checkPerson };