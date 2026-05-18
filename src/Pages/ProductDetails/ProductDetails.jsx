import { useEffect, useState } from 'react'
import './product-details.css'
import { NavLink, useNavigate, useParams } from 'react-router-dom'
import { LuArrowLeft, LuHeart, LuMinus, LuPlus, LuSearch, LuShoppingBag } from 'react-icons/lu'
import { supabase } from '../../utils/supabase'
import ProductCard from '../../Components/ProductCard/ProductCard'
import { addItemToCart, getCurrentUserId } from '../../utils/cart'

function ProductDetails() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [product, setProduct] = useState(null)
  const [relatedProducts, setRelatedProducts] = useState([])
  const [quantity, setQuantity] = useState(1)
  const [selectedVariantId, setSelectedVariantId] = useState(null)
  const [variantSearch, setVariantSearch] = useState("")
  const [loading, setLoading] = useState(true)
  const [isAddingToCart, setIsAddingToCart] = useState(false)
  const [cartMessage, setCartMessage] = useState("")
  const [cartError, setCartError] = useState("")

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
              image_url,
              stock,
              is_active
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
    const variants = product?.product_variants || []
    const firstAvailableVariant = variants.find((variant) => variant.is_active !== false) || variants[0]

    setSelectedVariantId(firstAvailableVariant?.id || null)
    setVariantSearch("")
    setQuantity(1)
  }, [product])

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

  const variants = (product.product_variants || []).filter((item) => item.is_active !== false)
  const variantSearchTerm = variantSearch.trim().toLowerCase()
  const filteredVariants = variantSearchTerm
    ? variants.filter((item) => {
      const searchableText = [
        item.name,
        item.price && `${(item.price / 100).toLocaleString("en-IN")}`,
        item.discount_price && `${(item.discount_price / 100).toLocaleString("en-IN")}`,
      ].filter(Boolean).join(" ").toLowerCase()

      return searchableText.includes(variantSearchTerm)
    })
    : variants
  const variant = variants.find((item) => item.id === selectedVariantId) || variants[0] || product.product_variants?.[0]
  const price = variant?.discount_price || variant?.price || 0
  const formattedPrice = `\u20b9${(price / 100).toLocaleString("en-IN")}`
  const image = variant?.image_url || "https://via.placeholder.com/600"

  const details = [
    variant?.name && `Variant: ${variant.name}`,
    product.category && `Series: ${product.category}`,
    "Hand-painted details",
    "Includes careful gift-ready packaging",
  ].filter(Boolean)

  const handleAddToCart = async () => {
    setCartMessage("")
    setCartError("")

    if (!variant?.id) {
      setCartError("Please choose an available variant.")
      return
    }

    setIsAddingToCart(true)

    try {
      const userId = await getCurrentUserId()

      if (!userId) {
        navigate("/profile")
        return
      }

      await addItemToCart({
        userId,
        productId: product.id,
        variantId: variant.id,
        quantity,
        price,
      })

      setCartMessage("Added to cart.")
    } catch (error) {
      console.error("Add to cart error:", error)
      setCartError(error.message || "We could not add this item to your cart.")
    } finally {
      setIsAddingToCart(false)
    }
  }

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

            {variants.length > 1 && (
              <div className="variant-picker">
                <div className="variant-picker-heading">
                  <span>Choose Variant</span>
                  <small>{variants.length} available</small>
                </div>

                <label className="variant-search" htmlFor="variantSearch">
                  <LuSearch aria-hidden="true" />
                  <input
                    id="variantSearch"
                    type="search"
                    value={variantSearch}
                    onChange={(event) => setVariantSearch(event.target.value)}
                    placeholder="Search variants"
                    autoComplete="off"
                  />
                </label>

                <div className="variant-options" role="listbox" aria-label="Product variants">
                  {filteredVariants.length > 0 ? (
                    filteredVariants.map((item) => {
                      const itemPrice = item.discount_price || item.price || 0
                      const isSelected = item.id === variant?.id

                      return (
                        <button
                          key={item.id}
                          type="button"
                          className={`variant-option${isSelected ? " selected" : ""}`}
                          onClick={() => setSelectedVariantId(item.id)}
                          role="option"
                          aria-selected={isSelected}
                        >
                          <span>{item.name || "Standard"}</span>
                          <strong>{`\u20b9${(itemPrice / 100).toLocaleString("en-IN")}`}</strong>
                        </button>
                      )
                    })
                  ) : (
                    <p className="variant-empty">No variants match your search.</p>
                  )}
                </div>
              </div>
            )}

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
              <button
                className="primary add-cart-button"
                type="button"
                onClick={handleAddToCart}
                disabled={isAddingToCart || !variant?.id}
              >
                <LuShoppingBag /> {isAddingToCart ? "Adding..." : "Add to Cart"}
              </button>
              <button className="wishlist-button" type="button" aria-label="Add to wishlist">
                <LuHeart />
              </button>
            </div>

            {(cartMessage || cartError) && (
              <p className={`cart-feedback ${cartError ? "error" : ""}`}>
                {cartError || cartMessage}
              </p>
            )}
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
