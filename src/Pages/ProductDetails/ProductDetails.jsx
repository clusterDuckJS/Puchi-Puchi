import { useEffect, useRef, useState } from 'react'
import './product-details.css'
import { NavLink, useNavigate, useParams } from 'react-router-dom'
import { LuArrowLeft, LuHeart, LuImagePlus, LuMinus, LuPlus, LuSearch, LuShoppingBag, LuX } from 'react-icons/lu'
import { supabase } from '../../utils/supabase'
import ProductCard from '../../Components/ProductCard/ProductCard'
import { addItemToCart, CUSTOM_BASE_FEE, formatCartPrice, getCurrentUserId, uploadCustomOrderImage } from '../../utils/cart'
import { isTimeoutError, withRequestTimeout } from '../../utils/request'

const CUSTOM_IMAGE_MAX_BYTES = 15 * 1024 * 1024
const CUSTOM_BASE_TEXT_MAX_LENGTH = 40
const PRODUCT_PLACEHOLDER_IMAGE = "/product-placeholder.svg"

const parseListField = (value) => {
  if (Array.isArray(value)) return value.map(String).filter(Boolean)
  if (!value) return []
  return String(value).split(',').map((item) => item.trim()).filter(Boolean)
}

function ProductDetails() {
  const { id } = useParams()
  const navigate = useNavigate()
  const customImageInputRef = useRef(null)
  const [product, setProduct] = useState(null)
  const [relatedProducts, setRelatedProducts] = useState([])
  const [quantity, setQuantity] = useState(1)
  const [selectedVariantId, setSelectedVariantId] = useState(null)
  const [selectedImageIndex, setSelectedImageIndex] = useState(0)
  const [variantSearch, setVariantSearch] = useState("")
  const [loading, setLoading] = useState(true)
  const [productError, setProductError] = useState("")
  const [isAddingToCart, setIsAddingToCart] = useState(false)
  const [cartMessage, setCartMessage] = useState("")
  const [cartError, setCartError] = useState("")
  const [customImageFile, setCustomImageFile] = useState(null)
  const [customImagePreview, setCustomImagePreview] = useState("")
  const [customNameOption, setCustomNameOption] = useState("none")
  const [customBaseText, setCustomBaseText] = useState("")

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
      setProductError("")

      try {
        const { data, error } = await withRequestTimeout(supabase
          .from("products")
          .select(`
            *,
            product_variants (
              *
            )
          `)
          .eq("id", id)
          .single())

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
          if (isTimeoutError(error)) {
            setProductError("This product is taking too long to load. Please refresh in a moment.")
          }
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
    return () => {
      if (customImagePreview) {
        URL.revokeObjectURL(customImagePreview)
      }
    }
  }, [customImagePreview])

  useEffect(() => {
    const variants = product?.product_variants || []
    const firstAvailableVariant = variants.find((variant) => variant.is_active !== false) || variants[0]

    setSelectedVariantId(firstAvailableVariant?.id || null)
    setSelectedImageIndex(0)
    setVariantSearch("")
    setQuantity(1)
    setCustomImageFile(null)
    setCustomImagePreview("")
    setCustomNameOption("none")
    setCustomBaseText("")
  }, [product])

  useEffect(() => {
    let isCurrent = true

    const fetchRelatedProducts = async () => {
      try {
        const { data, error } = await withRequestTimeout(supabase
          .from("products")
          .select(`
            *,
            product_variants (
              *
            )
          `)
          .eq("is_active", true)
          .neq("id", id)
          .limit(3))

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
        <p className="product-status">{productError || "Product not found"}</p>
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
  const canAddName = product.allow_custom_name === true
  const canAddNamePlate = product.allow_name_plate === true
  const hasNameOptions = canAddName || canAddNamePlate
  const selectedNameOption = customNameOption === "name_plate" && canAddNamePlate
    ? "name_plate"
    : customNameOption === "name" && canAddName
      ? "name"
      : "none"
  const customBaseFee = selectedNameOption === "name_plate" ? CUSTOM_BASE_FEE : 0
  const displayPrice = price + customBaseFee
  const formattedPrice = formatCartPrice(displayPrice)
  const variantImages = parseListField(variant?.image_urls || variant?.image_url)
  const image = variantImages[selectedImageIndex] || variantImages[0] || PRODUCT_PLACEHOLDER_IMAGE
  const categories = parseListField(product.categories || product.category)
  const categoryLabel = categories.join(", ")
  const stockCount = Number(variant?.stock ?? 0)
  const hasStock = stockCount > 0
  const isMadeJustForYou = categories.some((category) => (
    category.toLowerCase().replace(/[^a-z0-9]/g, "").includes("madejustforyou")
  ))

  const details = [
    variant?.name && `Variant: ${variant.name}`,
    categoryLabel && `Series: ${categoryLabel}`,
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

    if (isMadeJustForYou && !customImageFile) {
      setCartError("Please upload one reference image before adding this custom product to your cart.")
      return
    }

    if (selectedNameOption !== "none" && !customBaseText.trim()) {
      setCartError("Please enter the name or text for this personalization.")
      return
    }

    setIsAddingToCart(true)

    try {
      const userId = await getCurrentUserId()

      if (!userId) {
        navigate("/profile")
        return
      }

      const customImageUrl = isMadeJustForYou
        ? await uploadCustomOrderImage({ file: customImageFile, userId })
        : null

      await addItemToCart({
        userId,
        productId: product.id,
        variantId: variant.id,
        quantity,
        price,
        customImageUrl,
        customBaseText: selectedNameOption !== "none" ? customBaseText : "",
        customBaseFee,
        customTextType: selectedNameOption === "name_plate" ? "name_plate" : "name",
      })

      setCartMessage("Added to cart.")
      setCustomImageFile(null)
      setCustomImagePreview("")
    } catch (error) {
      console.error("Add to cart error:", error)
      setCartError(error.message || "We could not add this item to your cart.")
    } finally {
      setIsAddingToCart(false)
    }
  }

  const handleCustomBaseTextChange = (event) => {
    setCartMessage("")
    setCartError("")
    setCustomBaseText(event.target.value.slice(0, CUSTOM_BASE_TEXT_MAX_LENGTH))
  }

  const handleCustomImageChange = (event) => {
    const file = event.target.files?.[0]
    setCartMessage("")
    setCartError("")

    if (!file) {
      setCustomImageFile(null)
      setCustomImagePreview("")
      return
    }

    if (!file.type.startsWith("image/")) {
      setCustomImageFile(null)
      setCustomImagePreview("")
      setCartError("Please upload an image file.")
      event.target.value = ""
      return
    }

    if (file.size > CUSTOM_IMAGE_MAX_BYTES) {
      setCustomImageFile(null)
      setCustomImagePreview("")
      setCartError("Image must be 15MB or smaller.")
      event.target.value = ""
      return
    }

    if (customImagePreview) {
      URL.revokeObjectURL(customImagePreview)
    }

    setCustomImageFile(file)
    setCustomImagePreview(URL.createObjectURL(file))
  }

  const clearCustomImage = () => {
    if (customImagePreview) {
      URL.revokeObjectURL(customImagePreview)
    }

    setCustomImageFile(null)
    setCustomImagePreview("")

    if (customImageInputRef.current) {
      customImageInputRef.current.value = ""
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
            {variantImages.length > 1 && (
              <div className="product-image-strip" aria-label="Product images">
                {variantImages.map((imageUrl, index) => (
                  <button
                    type="button"
                    className={index === selectedImageIndex ? "selected" : ""}
                    key={`${imageUrl}-${index}`}
                    onClick={() => setSelectedImageIndex(index)}
                    aria-label={`Show product image ${index + 1}`}
                  >
                    <img src={imageUrl} alt="" />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="product-info-panel">
            {categoryLabel && (
              <small className="product-category">{categoryLabel}</small>
            )}

            <h1>{product.name}</h1>
            <h3>{formattedPrice}</h3>

            {variant?.id && (
              <p className={`product-stock ${hasStock ? "" : "out"}`}>
                {hasStock ? `${stockCount} ${stockCount === 1 ? "item" : "items"} left in stock` : "Out of stock"}
              </p>
            )}

            <p className="product-description">
              {product.description || "No description available"}
            </p>

            {variants.length > 1 && (
              <div className="variant-picker">
                <div className="variant-picker-heading">
                  <span>Choose Variant</span>
                  <small>{variants.length} available</small>
                </div>

                {/* <label className="variant-search" htmlFor="variantSearch">
                  <LuSearch aria-hidden="true" />
                  <input
                    id="variantSearch"
                    type="search"
                    value={variantSearch}
                    onChange={(event) => setVariantSearch(event.target.value)}
                    placeholder="Search variants"
                    autoComplete="off"
                  />
                </label> */}

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
                          onClick={() => {
                            setSelectedVariantId(item.id)
                            setSelectedImageIndex(0)
                          }}
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

            {/* <div className="detail-card">
              <h6>Details</h6>
              <ul>
                {details.map((detail) => (
                  <li key={detail}>{detail}</li>
                ))}
              </ul>
            </div> */}

            {(isMadeJustForYou || hasNameOptions) && (
              <div className="custom-upload-card">
                {isMadeJustForYou && (
                  <>
                    <div>
                      <h6>Reference Image</h6>
                      <p>Upload one image under 15MB before adding this custom product to cart.</p>
                    </div>

                    {customImagePreview ? (
                      <div className="custom-upload-preview">
                        <img src={customImagePreview} alt="Uploaded reference preview" />
                        <div>
                          <strong>{customImageFile?.name}</strong>
                          <span>{((customImageFile?.size || 0) / (1024 * 1024)).toFixed(2)} MB</span>
                        </div>
                        <button type="button" onClick={clearCustomImage} aria-label="Remove uploaded image">
                          <LuX />
                        </button>
                      </div>
                    ) : (
                      <label className="custom-upload-dropzone" htmlFor="customReferenceImage">
                        <LuImagePlus />
                        <span>Choose Image</span>
                        <small>PNG, JPG, WEBP, or HEIC up to 15MB</small>
                      </label>
                    )}

                    <input
                      id="customReferenceImage"
                      ref={customImageInputRef}
                      className="custom-upload-input"
                      type="file"
                      accept="image/*"
                      onChange={handleCustomImageChange}
                    />
                  </>
                )}

                {hasNameOptions && (
                  <div className="custom-name-options">
                    <h6>Personalization</h6>

                    {canAddNamePlate && (
                      <label className={`custom-base-option ${selectedNameOption === "name_plate" ? "selected" : ""}`}>
                        <input
                          type="radio"
                          name="customNameOption"
                          checked={selectedNameOption === "name_plate"}
                          onChange={() => {
                            setCustomNameOption("name_plate")
                            setCartMessage("")
                            setCartError("")
                          }}
                        />
                        <span>
                          <strong>Add name plate</strong>
                          <small>+{formatCartPrice(CUSTOM_BASE_FEE)}</small>
                        </span>
                      </label>
                    )}

                    {canAddName && (
                      <label className={`custom-base-option ${selectedNameOption === "name" ? "selected" : ""}`}>
                        <input
                          type="radio"
                          name="customNameOption"
                          checked={selectedNameOption === "name"}
                          onChange={() => {
                            setCustomNameOption("name")
                            setCartMessage("")
                            setCartError("")
                          }}
                        />
                        <span>
                          <strong>Add name</strong>
                          <small>No extra cost</small>
                        </span>
                      </label>
                    )}

                    <label className={`custom-base-option ${selectedNameOption === "none" ? "selected" : ""}`}>
                      <input
                        type="radio"
                        name="customNameOption"
                        checked={selectedNameOption === "none"}
                        onChange={() => {
                          setCustomNameOption("none")
                          setCustomBaseText("")
                          setCartMessage("")
                          setCartError("")
                        }}
                      />
                      <span>
                        <strong>No name</strong>
                        <small>Keep it simple</small>
                      </span>
                    </label>
                  </div>
                )}

                {selectedNameOption !== "none" && (
                  <label className="custom-base-text" htmlFor="customBaseText">
                    <span>{selectedNameOption === "name_plate" ? "Name plate text" : "Name"}</span>
                    <input
                      id="customBaseText"
                      type="text"
                      value={customBaseText}
                      onChange={handleCustomBaseTextChange}
                      maxLength={CUSTOM_BASE_TEXT_MAX_LENGTH}
                      placeholder="Name or short text"
                    />
                    <small>{customBaseText.length}/{CUSTOM_BASE_TEXT_MAX_LENGTH} characters</small>
                  </label>
                )}
              </div>
            )}

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
