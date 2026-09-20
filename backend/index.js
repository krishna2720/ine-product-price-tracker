import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import {
    getTrackedProducts,
    addTrackedProduct,
    removeTrackedProduct,
    recordPriceSnapshot,
    recordScrapeLog,
    getProductPriceHistory,
    getProductScrapeLogs
} from './db.js';

import { scrapeProduct } from './scraper.js';

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());
app.get('/health', (req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
});
app.get('/search', async (req, res) => {
    const q = (req.query.q || '').toLowerCase().trim();
    if (!q) return res.status(400).json({ error: 'Missing query param ?q=' });
    try {
        const allItems = [];
        const pageSize = 50;
        let page = 1;
        let totalPages = 1;
        while (page <= totalPages) {
            const url = `https://demo.inelabteamdev.com/api/catalog?page=${page}&pageSize=${pageSize}`;
            const response = await fetch(url).catch(() => null);
            if (!response || !response.ok) {
                console.log("External catalog API unreachable, returning empty results");
                break; 
            }
            const data = await response.json();
            totalPages = data.pages || 1;
            allItems.push(...(data.items || []));
            page++;
        }
        const results = allItems.filter(item =>
            (item.name && item.name.toLowerCase().includes(q)) ||
            (item.brand && item.brand.toLowerCase().includes(q)) ||
            (item.category && item.category.toLowerCase().includes(q))
        );
        res.json({ query: q, total: results.length, items: results });
    } catch (err) {
        console.error("Search error:", err);
        res.json({ query: q, total: 0, items: [] });
    }
});
app.get('/products', async (req, res) => {
    try {
        const products = await getTrackedProducts();
        res.json(products);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});
app.post('/products', async (req, res) => {
    try {
        const product = await addTrackedProduct(req.body);
        res.status(201).json(product);
    } catch (err) {
        if (err.code === '23505') {
            return res.status(409).json({ error: 'Product already being tracked' });
        }
        res.status(500).json({ error: err.message });
    }
});
app.delete('/products/:id', async (req, res) => {
    try {
        await removeTrackedProduct(req.params.id);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});
app.get('/products/:id/history', async (req, res) => {
    try {
        const history = await getProductPriceHistory(req.params.id);
        res.json(history);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});
app.get('/products/:id/logs', async (req, res) => {
    try {
        const logs = await getProductScrapeLogs(req.params.id);
        res.json(logs);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});
app.post('/scrape/run', async (req, res) => {
    // Respond immediately so the cron job doesn't time out
    res.json({ status: 'started', time: new Date().toISOString() });
    try {
        const products = await getTrackedProducts();
        console.log(`[Cron] Starting scrape run for ${products.length} products`);
        for (const product of products) {
            const result = await scrapeProduct(product.storeId);
            await recordScrapeLog(product.id, {
                status: result.status,
                attempts: result.attempts,
                durationMs: result.durationMs,
                httpStatus: result.httpStatus,
                errorMessage: result.errorMessage,
                scrapedAt: result.scrapedAt
            });
            if (result.success) {
                await recordPriceSnapshot(product.id, {
                    price: result.price,
                    currency: result.currency,
                    stockStatus: result.stockStatus,
                    stockCount: result.stockCount,
                    scrapedAt: result.scrapedAt
                });
                console.log(`[Cron] ✅ ${product.name} — ₹${result.price}`);
            } else {
                console.log(`[Cron] ❌ ${product.name} — ${result.errorMessage}`);
            }
        }
        console.log('[Cron] Scrape run complete');
    } catch (err) {
        console.error('[Cron] Run failed:', err.message);
    }
});
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`[Server] Running on port ${PORT}`);
});