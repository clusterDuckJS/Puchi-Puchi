import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import ProductCard from '../../Components/ProductCard/ProductCard'
import { supabase } from '../../utils/supabase'
import { isTimeoutError, withRequestTimeout } from '../../utils/request'
import './shop.css'

const normalizeCategory = (category) => category?.trim().toLowerCase() || ''

const parseListField = (value) => {
  if (Array.isArray(value)) return value.map(String).filter(Boolean)
  if (!value) return []
  return String(value).split(',').map((item) => item.trim()).filter(Boolean)
}

const getProductCategories = (product) => parseListField(product.categories || product.category)

const formatCategory = (category) => {
  const normalized = normalizeCategory(category)

  if (!normalized) return ''

  return normalized
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

function Shop() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const searchTerm = searchParams.get('search')?.trim() || ''
  const [products, setProducts] = useState([])
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    let isCurrent = true

    const fetchProducts = async () => {
      setLoading(true)
      setErrorMessage('')

      try {
        const { data, error } = await withRequestTimeout(supabase
          .from('products')
          .select(`
            *,
            product_variants (
              *
            )
          `)
          .eq('is_active', true))

        if (!isCurrent) return

        if (error) {
          console.error('Shop products error:', error)
          setErrorMessage('We could not load the collection right now.')
          setProducts([])
        } else {
          setProducts(data || [])
        }
      } catch (error) {
        if (isCurrent) {
          console.error('Shop products error:', error)
          setErrorMessage(
            isTimeoutError(error)
              ? 'The collection is taking too long to load. Please refresh in a moment.'
              : 'We could not load the collection right now.'
          )
          setProducts([])
        }
      } finally {
        if (isCurrent) {
          setLoading(false)
        }
      }
    }

    fetchProducts()

    return () => {
      isCurrent = false
    }
  }, [])

  const categories = useMemo(() => {
    const categoryMap = new Map()

    products.forEach((product) => {
      getProductCategories(product).forEach((category) => {
        const key = normalizeCategory(category)

        if (key && !categoryMap.has(key)) {
          categoryMap.set(key, formatCategory(category))
        }
      })
    })

    return [
      { key: 'all', label: 'All' },
      ...Array.from(categoryMap, ([key, label]) => ({ key, label })),
    ]
  }, [products])

  const filteredProducts = useMemo(() => {
    const normalizedSearchTerm = searchTerm.toLowerCase()

    return products.filter((product) => {
      const matchesCategory = selectedCategory === 'all' || (
        getProductCategories(product).some((category) => normalizeCategory(category) === selectedCategory)
      )

      if (!matchesCategory) return false
      if (!normalizedSearchTerm) return true

      const searchableText = [
        product.name,
        product.description,
        ...getProductCategories(product),
        ...(product.product_variants || []).map((variant) => variant.name),
      ].filter(Boolean).join(' ').toLowerCase()

      return searchableText.includes(normalizedSearchTerm)
    })
  }, [products, selectedCategory, searchTerm])

  return (
    <main className="shop-page">
      <section className="shop-hero">
        <h1 className="bold-800 center">Our Collection</h1>
        <p className="center">
          Browse our adorable chibi figurines and find your perfect companion.
        </p>
      </section>

      <section className="shop-collection" aria-label="Product collection">
        {searchTerm && (
          <div className="shop-search-summary">
            <p>
              Search results for <strong>{searchTerm}</strong>
            </p>
            <button type="button" onClick={() => setSearchParams({})}>
              Clear
            </button>
          </div>
        )}

        {categories.length > 1 && (
          <div className="shop-filter-row" aria-label="Filter products by category">
            {categories.map((category) => (
              <button
                key={category.key}
                type="button"
                className={`shop-filter-pill ${selectedCategory === category.key ? 'active' : ''}`}
                onClick={() => setSelectedCategory(category.key)}
              >
                {category.label}
              </button>
            ))}
          </div>
        )}

        {loading && (
          <div className="shop-status-grid" aria-label="Loading products">
            {[1, 2, 3].map((item) => (
              <div className="shop-skeleton-card" key={item}>
                <span />
                <small />
                <strong />
                <em />
              </div>
            ))}
          </div>
        )}

        {!loading && errorMessage && (
          <p className="shop-status">{errorMessage}</p>
        )}

        {!loading && !errorMessage && filteredProducts.length === 0 && (
          <p className="shop-status">
            {searchTerm
              ? `No figurines match "${searchTerm}" yet.`
              : 'No figurines found in this collection yet.'}
          </p>
        )}

        {!loading && !errorMessage && filteredProducts.length > 0 && (
          <div className="shop-product-grid">
            {filteredProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={{
                  ...product,
                  categories: getProductCategories(product).map(formatCategory),
                  category: formatCategory(getProductCategories(product)[0] || product.category),
                }}
                onClick={(selectedProduct) => navigate(`/product/${selectedProduct.id}`)}
              />
            ))}
          </div>
        )}
      </section>
    </main>
  )
}

export default Shop
