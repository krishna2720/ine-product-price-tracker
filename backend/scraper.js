import { chromium } from 'playwright';

/**
 * Scrapes a single product's price and stock from INE's mock storefront.
 * Handles:
 * - Anti-scraping mouse-movement tracking & dwell time
 * - "Reveal price" button clicks
 * - Dynamic loading spinners and retry states
 * - Error handling with clean status codes
 * 
 * @param {number|string} productId - Mock store product ID (e.g. 380)
 * @param {object} options - { headed: boolean, maxRetries: number }
 * @returns {Promise<object>} Scrape result object
 */
async function scrapeProduct(productId, options = {}) {
  const isHeaded = options.headed ?? (process.env.HEADED === 'true');
  const maxRetries = options.maxRetries ?? 3;
  const targetUrl = `https://demo.inelabteamdev.com/product/${productId}`;

  const startTime = Date.now();
  let attempt = 0;
  let lastError = null;
  let browser = null;

  while (attempt < maxRetries) {
    attempt++;
    try {
      console.log(`[Scraper] Attempt ${attempt}/${maxRetries} for product #${productId} (Headed: ${isHeaded})`);

      // 1. Launch browser
      browser = await chromium.launch({
        headless: !isHeaded,
        slowMo: isHeaded ? 1000 : 0 // slight slowdown in headed mode so it is visible
      });

      const context = await browser.newContext({
        viewport: { width: 1280, height: 800 },
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      });

      const page = await context.newPage();
      // 2. Navigate to product page
      const response = await page.goto(targetUrl, {
        waitUntil: 'commit',
        timeout: 35000
      });

      const httpStatus = response ? response.status() : null;
      if (httpStatus && httpStatus >= 400) {
        throw new Error(`HTTP ${httpStatus} while loading product page`);
      }

      // 2.5 Nuke cookie overlay and keep it gone
      await page.evaluate(() => {
        document.querySelectorAll('.cookie-overlay, [class*="cookie"], [class*="consent"]')
          .forEach(el => el.remove());

        const observer = new MutationObserver(() => {
          document.querySelectorAll('.cookie-overlay, [class*="cookie"], [class*="consent"]')
            .forEach(el => el.remove());
        });
        observer.observe(document.body, { childList: true, subtree: true });
      }).catch(() => { });

      // 3. Locate the price block
      const priceBlock = page.locator('.price-block').first();
      await priceBlock.waitFor({ state: 'visible', timeout: 25000 });

      await page.evaluate(() => {
        document.querySelectorAll('.cookie-overlay, .cookie-banner, [class*="cookie"], [class*="consent"]')
          .forEach(el => el.remove());
      }).catch(() => { });

      // 4. Use real Playwright mouse hover
      const box = await priceBlock.boundingBox();
      if (box) {
        const centerX = box.x + box.width / 2;
        const centerY = box.y + box.height / 2;

        await page.mouse.move(centerX, centerY);
        await page.waitForTimeout(500);

        for (let i = 0; i < 50; i++) {
          const jitterX = centerX + (Math.random() - 0.5) * 20;
          const jitterY = centerY + (Math.random() - 0.5) * 10;
          await page.mouse.move(jitterX, jitterY);
          await page.waitForTimeout(100);
        }

        await page.mouse.move(centerX, centerY);
        await page.waitForTimeout(3000);
      }

      // 5. Remove overlay right before clicking
      await page.evaluate(() => {
        document.querySelectorAll('.cookie-overlay, [class*="cookie"], [class*="consent"]')
          .forEach(el => el.remove());
        document.querySelectorAll('*').forEach(el => {
          const s = window.getComputedStyle(el);
          if ((s.position === 'fixed' || s.position === 'absolute') &&
            parseInt(s.zIndex) > 100 &&
            !el.querySelector('button[aria-label="Reveal price"]')) {
            el.style.pointerEvents = 'none';
          }
        });
      }).catch(() => { });

      const revealButton = page.locator('button[aria-label="Reveal price"]').first();
      if (await revealButton.count() > 0) {
        await revealButton.click({ force: true });
        console.log('[Scraper] Clicked "Reveal price" via Playwright (trusted)');
      }

      // 6. Wait for spinner and retrying phase to completely settle (Updated for product delays)
      console.log('[Scraper] Waiting for price challenge to settle...');
      await page.waitForTimeout(2000);

      await page.waitForFunction(() => {
        const priceBlock = document.querySelector('.price-block');
        if (!priceBlock) return false;

        const text = priceBlock.textContent || '';
        const hasSpinner = !!priceBlock.querySelector('.spinner');
        const isRetrying = text.includes('Retrying') || text.includes('Loading');

        if (hasSpinner || isRetrying) return false;

        const hasPriceMain = !!priceBlock.querySelector('.price-main');
        const hasPriceText = /₹|Rs|INR|\d+/.test(text);
        const hasPermanentError = text.includes("Couldn’t load") || text.includes("Price hidden");

        return hasPriceMain || hasPriceText || hasPermanentError;
      }, { timeout: 60000 });

      const priceBlockText = await priceBlock.textContent();

      if (priceBlockText.includes("Couldn’t load") || priceBlockText.includes("Price hidden")) {
        throw new Error(`Store returned permanent failure: ${priceBlockText.trim()}`);
      }

      // 7. Extract real visible numeric price
      const realPrice = await page.evaluate(() => {
        const priceMain = document.querySelector('.price-main') || document.querySelector('.price-block');
        if (!priceMain) return null;

        const spans = Array.from(priceMain.querySelectorAll('span'));

        const activeSpans = spans.filter(span => {
          const style = window.getComputedStyle(span);
          if (style.display === 'none' || style.visibility === 'hidden') return false;
          if (span.getAttribute('aria-hidden') === 'true') return false;

          const decoration = style.textDecorationLine || style.textDecoration || '';
          if (decoration.includes('line-through')) return false;

          const text = span.textContent.replace(/\u00a0/g, ' ').trim();
          if (text.includes('% off') || text.toLowerCase().includes('deal price') ||
            text.includes('attempt') || text.includes('Updating')) return false;

          return true;
        });

        let combinedText = (activeSpans.length > 0 ? activeSpans : [priceMain])
          .map(s => s.textContent)
          .join('')
          .replace(/[\u200b-\u200d\ufeff\u00a0]/g, '')
          .replace(/[０-９]/g, c => String.fromCharCode(c.charCodeAt(0) - 0xFEE0))
          .replace(/，/g, ',').replace(/．/g, '.')
          .trim();

        const match = combinedText.match(/(?:₹|Rs\.?|INR)?\s*([\d.,]+)/i);
        if (match) {
          let numStr = match[1];

          if (numStr.includes(',') && numStr.includes('.')) {
            if (numStr.lastIndexOf(',') > numStr.lastIndexOf('.')) {
              numStr = numStr.replace(/\./g, '').replace(',', '.');
            } else {
              numStr = numStr.replace(/,/g, '');
            }
          } else if (numStr.includes(',')) {
            numStr = numStr.replace(/,/g, '');
          }

          const val = parseFloat(numStr);
          if (!isNaN(val) && val > 0) return val;
        }

        return null;
      });

      let price = realPrice;
      if (price === null || isNaN(price)) {
        throw new Error(`Could not parse valid real selling price from: "${priceBlockText}"`);
      }

      // 8. Extract stock information
      const stockInfo = await page.evaluate(() => {
        const block = document.querySelector('.price-block');
        if (!block) return { stockStatus: 'UNKNOWN', stockCount: null };

        const text = block.textContent.replace(/[\u200b-\u200d\ufeff\u00a0]/g, ' ').toLowerCase();

        if (text.includes('out of stock')) {
          return { stockStatus: 'OUT_OF_STOCK', stockCount: 0 };
        }

        const countMatch = text.match(/(\d+)\s*(?:in stock|left)/i) || text.match(/(?:in stock|left)[^\d]*(\d+)/i);
        if (countMatch) {
          return {
            stockStatus: 'IN_STOCK',
            stockCount: parseInt(countMatch[1], 10)
          };
        }

        if (text.includes('in stock')) {
          return { stockStatus: 'IN_STOCK', stockCount: null };
        }

        return { stockStatus: 'UNKNOWN', stockCount: null };
      });

      const stockStatus = stockInfo.stockStatus;
      const stockCount = stockInfo.stockCount;

      const durationMs = Date.now() - startTime;
      console.log(`[Scraper] SUCCESS: Price = ₹${price}, Stock = ${stockStatus} (${stockCount ?? 'N/A'}), Duration = ${durationMs}ms`);

      await browser.close();

      return {
        success: true,
        productId,
        price,
        currency: 'INR',
        stockStatus,
        stockCount,
        attempts: attempt,
        status: attempt > 1 ? 'RETRIED' : 'SUCCESS',
        durationMs,
        httpStatus: 200,
        errorMessage: null,
        scrapedAt: new Date().toISOString()
      };

    } catch (err) {
      lastError = err.message;
      console.warn(`[Scraper] Attempt ${attempt} failed: ${lastError}`);

      if (browser) {
        await browser.close().catch(() => { });
      }

      if (attempt < maxRetries) {
        console.log(`[Scraper] Retrying in 1.5 seconds...`);
        await new Promise(r => setTimeout(r, 1500));
      }
    }
  }

  const durationMs = Date.now() - startTime;
  console.error(`[Scraper] FAILED after ${attempt} attempts: ${lastError}`);

  return {
    success: false,
    productId,
    price: null,
    currency: 'INR',
    stockStatus: 'UNKNOWN',
    stockCount: null,
    attempts: attempt,
    status: 'FAILED',
    durationMs,
    httpStatus: 500,
    errorMessage: lastError,
    scrapedAt: new Date().toISOString()
  };
}
export { scrapeProduct };