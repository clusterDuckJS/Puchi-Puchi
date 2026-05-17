import { useEffect, useState } from 'react'
import './product-details.css'
import { NavLink, useNavigate, useParams } from 'react-router-dom'
import { LuArrowLeft, LuHeart, LuMinus, LuPlus, LuShoppingBag } from 'react-icons/lu'
import { supabase } from '../../utils/supabase'
import ProductCard from '../../Components/ProductCard/ProductCard'

function ProductDetails() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [product, setProduct] = useState(null)
  const [relatedProducts, setRelatedProducts] = useState([])
  const [quantity, setQuantity] = useState(1)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let isCurrent = true

    const fetchProduct = async () => {
      if (!id) {
        setProduct(false)
        setLoading(false)
        return
      }

      setLoading(true)
      setProduct(null)

      try {
        const { data, error } = await supabase
          .from("products")
          .select(`
            id,
            name,
            description,
            category,
            product_variants (
              id,
              name,
              price,
              discount_price,
              image_url
            )
          `)
          .eq("id", id)
          .single()

        if (!isCurrent) return

        if (error) {
          console.error(error)
          setProduct(false)
        } else {
          setProduct(data)
        }
      } catch (error) {
        if (isCurrent) {
          console.error(error)
          setProduct(false)
        }
      } finally {
        if (isCurrent) {
          setLoading(false)
        }
      }
    }

    fetchProduct()

    return () => {
      isCurrent = false
    }
  }, [id])

  useEffect(() => {
    let isCurrent = true

    const fetchRelatedProducts = async () => {
      try {
        const { data, error } = await supabase
          .from("products")
          .select(`
            id,
            name,
            category,
            is_active,
            product_variants (
              id,
              name,
              price,
              discount_price,
              image_url
            )
          `)
          .eq("is_active", true)
          .neq("id", id)
          .limit(3)

        if (!isCurrent) return

        if (error) {
          console.error("Related products error:", error)
        } else {
          setRelatedProducts(data || [])
        }
      } catch (error) {
        if (isCurrent) {
          console.error("Related products error:", error)
        }
      }
    }

    setRelatedProducts([])
    fetchRelatedProducts()

    return () => {
      isCurrent = false
    }
  }, [id])

  if (loading) {
    return (
      <section className="product-details-section">
        <p className="product-status">Loading...</p>
      </section>
    )
  }

  if (!product) {
    return (
      <section className="product-details-section">
        <NavLink to="/shop" className="product-back-link">
          <LuArrowLeft /> Back to Shop
        </NavLink>
        <p className="product-status">Product not found</p>
      </section>
    )
  }

  const variant = product.product_variants?.[0]
  const price = variant?.discount_price || variant?.price || 0
  const formattedPrice = `₹${(price / 100).toLocaleString("en-IN")}`
  const image = variant?.image_url || "https://via.placeholder.com/600"

  const details = [
    variant?.name && `Variant: ${variant.name}`,
    product.category && `Series: ${product.category}`,
    "Hand-painted details",
    "Includes careful gift-ready packaging",
  ].filter(Boolean)

  return (
    <div className="product-details-page">
      <section className="product-details-section">
        <NavLink to="/shop" className="product-back-link">
          <LuArrowLeft /> Back to Shop
        </NavLink>

        <div className="product-detail-grid">
          <div className="product-visual-card">
            <img src={image} alt={product.name} className="product-detail-image" />
          </div>

          <div className="product-info-panel">
            {product.category && (
              <small className="product-category">{product.category}</small>
            )}

            <h1>{product.name}</h1>
            <h3>{formattedPrice}</h3>

            <p className="product-description">
              {product.description || "No description available"}
            </p>

            <div className="detail-card">
              <h6>Details</h6>
              <ul>
                {details.map((detail) => (
                  <li key={detail}>{detail}</li>
                ))}
              </ul>
            </div>

            <div className="quantity-row">
              <span>Quantity:</span>
              <div className="quantity-stepper" aria-label="Quantity selector">
                <button
                  type="button"
                  aria-label="Decrease quantity"
                  onClick={() => setQuantity((current) => Math.max(1, current - 1))}
                >
                  <LuMinus />
                </button>
                <strong>{quantity}</strong>
                <button
                  type="button"
                  aria-label="Increase quantity"
                  onClick={() => setQuantity((current) => current + 1)}
                >
                  <LuPlus />
                </button>
              </div>
            </div>

            <div className="product-action-row">
              <button className="primary add-cart-button" type="button">
                <LuShoppingBag /> Add to Cart
              </button>
              <button className="wishlist-button" type="button" aria-label="Add to wishlist">
                <LuHeart />
              </button>
            </div>
          </div>
        </div>

        {relatedProducts.length > 0 && (
          <div className="related-products">
            <h3>You Might Also Like</h3>
            <div className="related-products-grid">
              {relatedProducts.map((item) => (
                <ProductCard
                  key={item.id}
                  product={item}
                  onClick={(selectedProduct) => navigate(`/product/${selectedProduct.id}`)}
                />
              ))}
            </div>
          </div>
        )}
      </section>
    </div>
  )
}

export default ProductDetails
