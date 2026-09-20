import { useState, useEffect } from 'react'
import axios from 'axios'
const API = import.meta.env.VITE_API_URL
export default function Dashboard({ goTo }) {
    const [products, setProducts] = useState([])
    const [loading, setLoading] = useState(true)
    useEffect(() => {
        fetchProducts()
    }, [])
    async function fetchProducts() {
        setLoading(true)
        try {
            const res = await axios.get(`${API}/products`)
            setProducts(res.data)
        } catch (err) {
            console.error('Failed to load products', err)
        }
        setLoading(false)
    }
    async function handleRemove(productId) {
        if (!confirm('Stop tracking this product?')) return
        try {
            await axios.delete(`${API}/products/${productId}`)
            setProducts(p => p.filter(x => x.id !== productId))
        } catch (err) {
            alert('Failed to remove product')
        }
    }

    function stockColor(status) {
        if (status === 'IN_STOCK') return '#22c55e'
        if (status === 'OUT_OF_STOCK') return '#ef4444'
        return '#999'
    }

    if (loading) return <div style={{ padding: '2rem' }}>Loading...</div>

    return (
        <div style={{ maxWidth: '900px', margin: '2rem auto', padding: '0 1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h1 style={{ color: "blue", fontWeight: "bold" }}>
    Tracked Products
</h1>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                        onClick={fetchProducts}
                        style={{ background: 'blue', color: 'white', border: 'none', padding: '0.5rem 1rem', borderRadius: '6px' }}
                    >
                        ↻ Refresh
                    </button>
                    <button
                        onClick={() => goTo('search')}
                        style={{ background: 'green', color: 'white', border: 'none', padding: '0.5rem 1rem', borderRadius: '6px' }}
                    >
                        + Add Product
                    </button>
                </div>
            </div>

            {products.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '4rem', color: '#666' }}>
                    <p style={{ fontSize: '1.2rem' }}>No products tracked yet.</p>
                    <button
                        onClick={() => goTo('search')}
                        style={{ marginTop: '1rem', background: '#e94560', color: 'white', border: 'none', padding: '0.75rem 1.5rem', borderRadius: '6px' }}
                    >
                        Search & Track a Product
                    </button>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {products.map(product => (
                        <div key={product.id} style={{
                            background: 'white', padding: '1.25rem', borderRadius: '8px',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                        }}>
                            <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: 'bold', fontSize: '1.05rem' }}>{product.name}</div>
                                <div style={{ color: '#666', fontSize: '0.9rem', marginTop: '0.25rem' }}>
                                    {product.brand} · {product.category}
                                </div>
                                <div style={{ marginTop: '0.5rem', display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
                                    {/* Latest price */}
                                    <span style={{ fontSize: '1.3rem', fontWeight: 'bold', color: '#1a1a2e' }}>
                                        {product.latestPrice ? `₹${product.latestPrice.toLocaleString('en-IN')}` : 'Not scraped yet'}
                                    </span>
                                    {/* Stock status badge */}
                                    <span style={{
                                        background: stockColor(product.latestStockStatus),
                                        color: 'white', padding: '0.2rem 0.6rem',
                                        borderRadius: '999px', fontSize: '0.8rem'
                                    }}>
                                        {product.latestStockStatus === 'IN_STOCK' ? `In Stock${product.latestStockCount ? ` · ${product.latestStockCount} left` : ''}` :
                                            product.latestStockStatus === 'OUT_OF_STOCK' ? 'Out of Stock' : 'Unknown'}
                                    </span>
                                    {/* Last scraped time */}
                                    {product.lastScrapedAt && (
                                        <span style={{ color: '#999', fontSize: '0.8rem' }}>
                                            Last scraped: {new Date(product.lastScrapedAt).toLocaleString()}
                                        </span>
                                    )}
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <button
                                    onClick={() => goTo('detail', product)}
                                    style={{
    background: 'red',
    color: 'black',
    border: 'none',
    padding: '0.5rem 1rem',
    borderRadius: '8px',
    fontWeight: '600',
    boxShadow: '0 4px 12px rgba(220, 38, 38, 0.3)',
    cursor: 'pointer',
    transition: 'all 0.2s ease'
}}
                                >
                                    View History
                                </button>
                                <button
                                    onClick={() => handleRemove(product.id)}style={{
    background: 'black',
    color: 'white',
    border: 'none',
    padding: '0.6rem 1.2rem',
    borderRadius: '8px',
    fontWeight: '600',
    fontSize: '0.85rem',
    boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)',
    cursor: 'pointer',
    transition: 'all 0.2s ease'
}}
                                >
                                    Remove
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}