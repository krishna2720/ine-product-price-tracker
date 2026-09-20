import dotenv from 'dotenv';

import {
    getTrackedProducts,
    recordPriceSnapshot,
    recordScrapeLog
} from './db.js';

import { scrapeProduct } from './scraper.js';

dotenv.config();

async function runScraperForTrackedProducts() {
  console.log('==================================================');
  console.log('🚀 Starting Scraper for All Tracked Products...');
  console.log('==================================================\n');

  try {
    // 1. Database se tracked products fetch karo
    const products = await getTrackedProducts();

    if (!products || products.length === 0) {
      console.log('⚠️ Database me koi tracked product nahi mila.');
      return;
    }

    console.log(`📦 Found ${products.length} products to scrape.\n`);

    // 2. Dynamic loop for scraping each product
    for (const product of products) {
      const targetId = product.storeId || product.store_id || product.id;
      
      console.log(`👉 Scraping Product #${targetId}: ${product.name || product.title || 'Item'}...`);

      const result = await scrapeProduct(targetId, { headed: false });

      if (result.success) {
        // 3. Save live price to DB
        await recordPriceSnapshot(product.id, {
          price: result.price,
          currency: result.currency || 'INR',
          stockStatus: result.stockStatus,
          stockCount: result.stockCount,
          scrapedAt: result.scrapedAt
        });

        // 4. Save audit log
        await recordScrapeLog(product.id, {
          status: result.status,
          attempts: result.attempts,
          durationMs: result.durationMs,
          httpStatus: result.httpStatus,
          errorMessage: result.errorMessage,
          scrapedAt: result.scrapedAt
        });

        console.log(`✅ Product #${targetId} updated successfully: ₹${result.price}\n`);
      } else {
        console.error(`❌ Scraping failed for Product #${targetId}: ${result.errorMessage}\n`);
      }
    }

    console.log('==================================================');
    console.log('🎉 ALL TRACKED PRODUCTS UPDATED SUCCESSFULLY!');
    console.log('==================================================');

  } catch (err) {
    console.error('❌ Scraper Loop Error:', err);
  }
}

runScraperForTrackedProducts();