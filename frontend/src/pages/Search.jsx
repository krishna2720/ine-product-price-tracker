import { useState } from 'react'
import axios from 'axios'

const API = import.meta.env.VITE_API_URL

export default function Search({ goTo }) {
    const [query, setQuery] = useState('')
    const [results, setResults] = useState([])
    const [loading, setLoading] = useState(false)
    const [tracking, setTracking] = useState({}) 
    const [error, setError] = useState(null)

    
    async function handleSearch() {
        if (!query.trim()) return
        setLoading(true)
        setError(null)
        try {
            const res = await axios.get(`${API}/search`, { params: { q: query } })
            setResults(res.data.items || [])
        } catch (err) {
            setError('Search failed. Is the backend running?')
        }
        setLoading(false)
    }

    async function handleTrack(item) {
        setTracking(t => ({ ...t, [item.id]: 'loading' }))
        try {
            await axios.post(`${API}/products`, {
                storeId: item.id,
                name: item.name,
                slug: item.slug,
                brand: item.brand,
                category: item.category,
                sku: item.sku,
                description: item.description
            })
            setTracking(t => ({ ...t, [item.id]: 'tracked' }))
        } catch (err) {
            if (err.response?.status === 409) {
                setTracking(t => ({ ...t, [item.id]: 'tracked' }))
            } else {
                setTracking(t => ({ ...t, [item.id]: 'error' }))
            }
        }
    }

    return (
        <div className="min-h-[85vh] bg-slate-50 py-10 px-4">
            <div className="max-w-3xl mx-auto">
                <div className="bg-white rounded-2xl shadow-xl border border-slate-100 p-6 md:p-8 mb-8">
                    <div className="flex items-center gap-3 mb-6">
                        <span className="p-3 bg-emerald-50 text-emerald-600 rounded-xl text-xl font-bold">⚡</span>
                        <div>
                            <h1 className="text-2xl font-bold text-slate-900">Search Catalog</h1>
                            <p className="text-slate-500 text-sm">Discover and add new products to your tracking panel.</p>
                        </div>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-3">
                        <input
                            type="text"
                            value={query}
                            onChange={e => setQuery(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleSearch()}
                            placeholder="Search by name, brand or category..."
                            className="flex-1 px-4 py-3.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-700 bg-slate-50/50 text-sm"
                        />
                        <button
                            onClick={handleSearch}
                            className="px-6 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-xl transition-all shadow-md shadow-emerald-600/20 text-sm"
                        >
                            {loading ? 'Searching...' : 'Search Catalog'}
                        </button>
                    </div>

                    {error && <p className="mt-4 text-sm text-red-500 bg-red-50 p-3 rounded-lg">{error}</p>}
                </div>
                {results.length > 0 && (
                    <div className="mb-4 px-2 flex justify-between items-center text-sm text-slate-500 font-medium">
                        <span>Found {results.length} items in live store</span>
                    </div>
                )}
                <div className="flex flex-col gap-4">
                    {results.map(item => (
                        <div key={item.id} className="bg-white p-5 rounded-xl border border-slate-200/80 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:shadow-md transition-all">
                            <div>
                                <h3 className="font-semibold text-slate-800 text-base">{item.name}</h3>
                                <div className="text-slate-500 text-xs mt-1 flex items-center gap-2">
                                    <span className="bg-slate-100 px-2 py-0.5 rounded font-medium text-slate-600">{item.brand}</span>
                                    <span>·</span>
                                    <span>{item.category}</span>
                                    <span>·</span>
                                    <span className="font-mono text-slate-400">{item.sku}</span>
                                </div>
                            </div>
                            <button
                                onClick={() => handleTrack(item)}
                                disabled={tracking[item.id] === 'tracked' || tracking[item.id] === 'loading'}
                                className={`px-5 py-2.5 rounded-xl text-xs font-semibold tracking-wide transition-all shadow-sm ${
                                    tracking[item.id] === 'tracked' 
                                        ? 'bg-emerald-100 text-emerald-700 cursor-default' :
                                    tracking[item.id] === 'error' 
                                        ? 'bg-red-500 text-white' : 
                                    tracking[item.id] === 'loading'
                                        ? 'bg-slate-200 text-slate-500 cursor-wait'
                                        : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20'
                                }`}
                            >
                                {tracking[item.id] === 'tracked' ? '✓ Tracked' :
                                    tracking[item.id] === 'loading' ? 'Adding...' :
                                    tracking[item.id] === 'error' ? 'Failed' : '+ Track Product'}
                            </button>
                        </div>
                    ))}
                </div>

            </div>
        </div>
    )
}