import { useState } from 'react'
import Dashboard from './pages/Dashboard'
import ProductDetail from './pages/ProductDetail'
import Search from './pages/Search'
import Navbar from './components/Navbar'

export default function App() {
  // Simple client-side routing without react-router
  // page can be: 'dashboard', 'search', 'detail'
  const [page, setPage] = useState('dashboard')
  const [selectedProduct, setSelectedProduct] = useState(null)

  function goTo(pageName, product = null) {
    setPage(pageName)
    setSelectedProduct(product)
  }

  return (
    <div>
      <Navbar goTo={goTo} />
      {page === 'dashboard' && (
        <Dashboard goTo={goTo} />
      )}
      {page === 'search' && (
        <Search goTo={goTo} />
      )}
      {page === 'detail' && (
        <ProductDetail product={selectedProduct} goTo={goTo} />
      )}
    </div>
  )
}