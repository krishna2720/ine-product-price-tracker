import dotenv from 'dotenv';

import {
    getTrackedProducts,
    addTrackedProduct,
    recordPriceSnapshot,
    recordScrapeLog,
    getProductPriceHistory,
    getProductScrapeLogs,
    removeTrackedProduct
} from './db.js';

dotenv.config();
async function testDatabase() {
  console.log('==================================================');
  console.log('Initializing database connectivity check...');
  console.log('==================================================\n');

  try {
    // 1. Test fetching products
    console.log('Step 1: Fetching existing items from database...');
    const initialProducts = await getTrackedProducts();
    console.log(`Database ping successful. Active items found: ${initialProducts.length}`);

    // 2. Add product 380 as tracked
    console.log('\nStep 2: Registering sample item ID 380...');
    let product;
    try {
      product = await addTrackedProduct({
        storeId: 380,
        name: 'Vantablack Hardshell Case Lite',
        slug: 'vantablack-hardshell-case-lite',
        brand: 'Vantablack',
        category: 'Bags',
        sku: 'VAN-10380',
        description: 'Dependable bags pick'
      });
      console.log('Item successfully registered:', product.id, product.name);
    } catch (e) {
      if (e.message?.includes('duplicate key') || e.code === '23505') {
        console.log('Item already exists in registry, pulling details...');
        const prods = await getTrackedProducts();
        product = prods.find(p => p.storeId === 380);
      } else {
        throw e;
      }
    }

    // 3. Record a test price snapshot
    console.log('\nStep 3: Appending price point entry (₹13,950)...');
    const snapshot = await recordPriceSnapshot(product.id, {
      price: 13950,
      currency: 'INR',
      stockStatus: 'IN_STOCK',
      stockCount: 22,
      scrapedAt: new Date().toISOString()
    });
    console.log('Price point saved, reference ID:', snapshot.id);

    // 4. Record a scrape audit log
    console.log('\nStep 4: Writing audit log for sync execution...');
    const log = await recordScrapeLog(product.id, {
      status: 'SUCCESS',
      attempts: 1,
      durationMs: 6700,
      httpStatus: 200,
      errorMessage: null,
      scrapedAt: new Date().toISOString()
    });
    console.log('Audit log successfully committed, ID:', log.id);

    // 5. Query back history and logs
    console.log('\nStep 5: Validating historical data pull...');
    const history = await getProductPriceHistory(product.id);
    const logs = await getProductScrapeLogs(product.id);
    console.log(`Data verification complete. History points: ${history.length}, Audit logs: ${logs.length}`);

    console.log('\n==================================================');
    console.log('All database integration tests passed successfully.');
    console.log('==================================================');

  } catch (err) {
    console.error('\nExecution error encountered during database test:');
    console.error(err);
  }
}

testDatabase();