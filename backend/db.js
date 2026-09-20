import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('[Database Error] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
}
const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  }
});

async function getTrackedProducts() {
  const { data: products, error } = await supabase
    .from('products')
    .select(`
      *,
      price_history (
        price,
        currency,
        stock_status,
        stock_count,
        scraped_at
      )
    `)
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  if (error) throw error;

  // Format so each product has its latest price info cleanly attached
  return (products || []).map(p => {
    const history = p.price_history || [];
    // Sort descending by scraped_at to pick the most recent
    history.sort((a, b) => new Date(b.scraped_at) - new Date(a.scraped_at));
    const latest = history[0] || null;

    return {
      id: p.id,
      storeId: p.store_id,
      name: p.name,
      slug: p.slug,
      brand: p.brand,
      category: p.category,
      sku: p.sku,
      description: p.description,
      isActive: p.is_active,
      createdAt: p.created_at,
      latestPrice: latest ? latest.price : null,
      latestStockStatus: latest ? latest.stock_status : 'UNKNOWN',
      latestStockCount: latest ? latest.stock_count : null,
      lastScrapedAt: latest ? latest.scraped_at : null
    };
  });
}

async function addTrackedProduct(product) {
  const { data, error } = await supabase
    .from('products')
    .insert([
      {
        store_id: product.storeId,
        name: product.name,
        slug: product.slug,
        brand: product.brand,
        category: product.category,
        sku: product.sku,
        description: product.description,
        is_active: true
      }
    ])
    .select()
    .single();

  if (error) throw error;
  return data;
}

async function removeTrackedProduct(productId) {
  const { data, error } = await supabase
    .from('products')
    .delete()
    .eq('id', productId)
    .select();

  if (error) throw error;
  return data;
}

async function recordPriceSnapshot(productId, priceData) {
  try {
    const { data: product } = await supabase
      .from('products')
      .select('id, storeId')
      .or(`id.eq.${productId},storeId.eq.${productId}`)
      .maybeSingle();

    const dbProductId = product ? product.id : productId;

    const { data, error } = await supabase
      .from('price_history') // Yahan 'price_snapshots' ki jagah 'price_history' hona chahiye!
      .insert([
        {
          product_id: dbProductId,
          price: priceData.price,
          currency: priceData.currency || 'INR',
          stock_status: priceData.stockStatus || 'IN_STOCK',
          stock_count: priceData.stockCount || null,
          scraped_at: priceData.scrapedAt || new Date().toISOString()
        }
      ]);

    if (error) console.error("Error inserting snapshot:", error);
    return data;
  } catch (err) {
    console.error("recordPriceSnapshot failed:", err.message);
  }
}

async function recordScrapeLog(productId, logData) {
  try {
    const { data, error } = await supabase
      .from('scrape_logs')
      .insert([
        {
          product_id: productId,
          status: logData.status || 'SUCCESS',
          attempts: logData.attempts || 1,
          duration_ms: logData.durationMs || 0,
          http_status: logData.httpStatus || 200,
          error_message: logData.errorMessage || null,
          scraped_at: logData.scrapedAt || new Date().toISOString()
        }
      ])
      .select();

    if (error) {
      console.warn('⚠️ Log insert error details:', error);
    }
    return data;
  } catch (err) {
    console.warn('⚠️ Log save skipped:', err.message);
    return null;
  }
}

async function getProductPriceHistory(productId) {
  try {
    const { data: product } = await supabase
      .from('products')
      .select('id, storeId')
      .or(`id.eq.${productId},storeId.eq.${productId}`)
      .maybeSingle();

    const targetIds = [productId];
    if (product) {
      if (product.id) targetIds.push(product.id);
      if (product.storeId) targetIds.push(product.storeId);
    }

    const { data, error } = await supabase
      .from('price_history') // Yahan bhi 'price_history'
      .select('*')
      .in('product_id', targetIds)
      .order('scraped_at', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error('Error in getProductPriceHistory:', err.message);
    return [];
  }
}
async function getProductScrapeLogs(productId) {
  try {
    const { data: product } = await supabase
      .from('products')
      .select('id, storeId')
      .or(`id.eq.${productId},storeId.eq.${productId}`)
      .maybeSingle();

    const targetIds = [productId];
    if (product) {
      if (product.id) targetIds.push(product.id);
      if (product.storeId) targetIds.push(product.storeId);
    }

    const { data, error } = await supabase
      .from('scrape_logs')
      .select('*')
      .in('product_id', targetIds)
      .order('scraped_at', { ascending: false });

    if (error) throw error;

    return (data || []).map(log => ({
      ...log,
      timestamp: log.scraped_at || log.created_at || log.timestamp,
      scraped_at: log.scraped_at || log.created_at,
      created_at: log.created_at || log.scraped_at
    }));
  } catch (err) {
    console.error('Error in getProductScrapeLogs:', err.message);
    return [];
  }
}
export {
    supabase,
    getTrackedProducts,
    addTrackedProduct,
    removeTrackedProduct,
    recordPriceSnapshot,
    recordScrapeLog,
    getProductPriceHistory,
    getProductScrapeLogs
};
