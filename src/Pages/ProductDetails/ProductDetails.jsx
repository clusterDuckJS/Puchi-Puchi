import { useEffect, useRef, useState } from 'react'
import './product-details.css'
import { NavLink, useNavigate, useParams } from 'react-router-dom'
import { LuArrowLeft, LuHeart, LuImagePlus, LuMinus, LuPlus, LuSearch, LuSend, LuShoppingBag, LuStar, LuX } from 'react-icons/lu'
import { supabase } from '../../utils/supabase'
import ProductCard from '../../Components/ProductCard/ProductCard'
import { addItemToCart, CUSTOM_BASE_FEE, formatCartPrice, getCurrentUserId, GIFT_BOX_FEE, uploadCustomOrderImage } from '../../utils/cart'
import { isTimeoutError, withRequestTimeout } from '../../utils/request'
import { sanitizeRichText } from '../../utils/richText'
import { deleteReviewImage, uploadReviewImage } from '../../utils/reviews'

const CUSTOM_IMAGE_MAX_BYTES = 15 * 1024 * 1024
const CUSTOM_BASE_TEXT_MAX_LENGTH = 40
const PRODUCT_PLACEHOLDER_IMAGE = "/product-placeholder.svg"
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

const parseListField = (value) => {
  if (Array.isArray(value)) return value.map(String).filter(Boolean)
  if (!value) return []
  return String(value).split(',').map((item) => item.trim()).filter(Boolean)
}

const createBlankReviewForm = () => ({
  reviewer_first_name: "",
  place: "",
  rating: "5",
  review_text: "",
})

const formatReviewDate = (value) => value && new Intl.DateTimeFormat("en-IN", {
  day: "numeric",
  month: "short",
  year: "numeric",
}).format(new Date(value))

const StarRating = ({ rating }) => (
  <div className="product-review-stars" aria-label={`${rating} out of 5 stars`}>
    {[1, 2, 3, 4, 5].map((star) => <LuStar className={star <= rating ? "filled" : ""} key={star} />)}
  </div>
)

function ProductReviews({ productId, productName }) {
  const reviewImageInputRef = useRef(null)
  const [reviews, setReviews] = useState([])
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState("")
  const [form, setForm] = useState(createBlankReviewForm)
  const [formStatus, setFormStatus] = useState("")
  const [formError, setFormError] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [reviewImageFile, setReviewImageFile] = useState(null)
  const [reviewImagePreview, setReviewImagePreview] = useState("")

  useEffect(() => () => {
    if (reviewImagePreview) URL.revokeObjectURL(reviewImagePreview)
  }, [reviewImagePreview])

  useEffect(() => {
    let isCurrent = true

    const fetchReviews = async () => {
      setLoading(true)
      setErrorMessage("")

      try {
        const { data, error } = await withRequestTimeout(supabase
          .from("reviews")
          .select("*")
          .eq("product_id", productId)
          .eq("is_approved", true)
          .order("review_date", { ascending: false })
          .order("created_at", { ascending: false }))

        if (error) throw error
        if (isCurrent) setReviews(data || [])
      } catch (error) {
        if (isCurrent) {
          console.error("Product reviews load error:", error)
          setErrorMessage(isTimeoutError(error)
            ? "Reviews are taking too long to load. Please refresh in a moment."
            : "We could not load reviews right now.")
        }
      } finally {
        if (isCurrent) setLoading(false)
      }
    }

    fetchReviews()
    return () => { isCurrent = false }
  }, [productId])

  const averageRating = reviews.length
    ? reviews.reduce((total, review) => total + Number(review.rating || 0), 0) / reviews.length
    : 0

  const handleFormChange = (field, value) => {
    setFormStatus("")
    setFormError("")
    setForm((current) => ({ ...current, [field]: value }))
  }

  const clearReviewImage = () => {
    if (reviewImagePreview) URL.revokeObjectURL(reviewImagePreview)
    setReviewImageFile(null)
    setReviewImagePreview("")
    if (reviewImageInputRef.current) reviewImageInputRef.current.value = ""
  }

  const handleReviewImageChange = (event) => {
    const file = event.target.files?.[0]
    setFormStatus("")
    setFormError("")

    if (!file) {
      clearReviewImage()
      return
    }

    if (!file.type.startsWith("image/")) {
      clearReviewImage()
      setFormError("Please choose an image file.")
      return
    }

    if (file.size > 10 * 1024 * 1024) {
      clearReviewImage()
      setFormError("Review images must be 10MB or smaller.")
      return
    }

    if (reviewImagePreview) URL.revokeObjectURL(reviewImagePreview)
    setReviewImageFile(file)
    setReviewImagePreview(URL.createObjectURL(file))
  }

  const submitReview = async (event) => {
    event.preventDefault()
    setFormStatus("")
    setFormError("")

    const userId = await getCurrentUserId()

    if (!userId) {
      setFormError("Please log in to submit a review.")
      return
    }

    const payload = {
      product_id: productId,
      product_name: productName,
      reviewer_first_name: form.reviewer_first_name.trim(),
      place: form.place.trim(),
      rating: Number(form.rating),
      review_text: form.review_text.trim(),
      is_approved: false,
      source: "customer",
    }

    if (!payload.reviewer_first_name || !payload.place || !payload.review_text) {
      setFormError("Please fill every field before submitting your review.")
      return
    }

    setIsSubmitting(true)
    let uploadedImagePath = ""
    try {
      const uploadedImage = reviewImageFile
        ? await uploadReviewImage({ file: reviewImageFile, userId })
        : null

      uploadedImagePath = uploadedImage?.path || ""
      payload.review_image_url = uploadedImage?.publicUrl || null

      const { error } = await withRequestTimeout(supabase.from("reviews").insert(payload))
      if (error) throw error

      setForm(createBlankReviewForm())
      clearReviewImage()
      setFormStatus("Thank you. Your review is waiting for approval.")
    } catch (error) {
      if (uploadedImagePath) {
        try {
          await deleteReviewImage(uploadedImagePath)
        } catch (cleanupError) {
          console.error("Review image cleanup error:", cleanupError)
        }
      }
      console.error("Product review submit error:", error)
      setFormError("We could not submit your review right now. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <section className="product-reviews" aria-label={`${productName} reviews`}>
      <div className="product-reviews-heading">
        <div>
          <small>Customer reviews</small>
          <h2>What people say about {productName}</h2>
        </div>
        <div className="product-review-score">
          <strong>{reviews.length ? averageRating.toFixed(1) : "0.0"}</strong>
          <StarRating rating={Math.round(averageRating)} />
          <span>{reviews.length} review{reviews.length === 1 ? "" : "s"}</span>
        </div>
      </div>

      {loading && <p className="product-review-status">Loading reviews...</p>}
      {!loading && errorMessage && <p className="product-review-status">{errorMessage}</p>}
      {!loading && !errorMessage && reviews.length === 0 && (
        <p className="product-review-status">No reviews yet. Be the first to share your experience.</p>
      )}
      {!loading && !errorMessage && reviews.length > 0 && (
        <div className="product-review-list">
          {reviews.map((review) => (
            <article className="product-review-card" key={review.id}>
              <header>
                <div className="product-review-avatar" aria-hidden="true">{review.reviewer_first_name?.charAt(0) || "P"}</div>
                <div><strong>{review.reviewer_first_name}</strong><span>{review.place}</span></div>
                <time>{formatReviewDate(review.review_date)}</time>
              </header>
              <StarRating rating={review.rating} />
              <p>{review.review_text}</p>
              {review.review_image_url && <img className="product-review-image" src={review.review_image_url} alt={`Photo shared by ${review.reviewer_first_name}`} loading="lazy" />}
              {review.admin_reply_text && (
                <aside className="product-review-reply">
                  <strong>Puchi Puchi</strong>
                  <p>{review.admin_reply_text}</p>
                </aside>
              )}
            </article>
          ))}
        </div>
      )}

      <form className="product-review-form" onSubmit={submitReview}>
        <h3>Leave a review</h3>
        <div className="product-review-form-grid">
          <label>First name<input type="text" value={form.reviewer_first_name} onChange={(event) => handleFormChange("reviewer_first_name", event.target.value.slice(0, 40))} maxLength={40} required /></label>
          <label>Place<input type="text" value={form.place} onChange={(event) => handleFormChange("place", event.target.value.slice(0, 80))} maxLength={80} required /></label>
          <label>Rating<select value={form.rating} onChange={(event) => handleFormChange("rating", event.target.value)}>{[5, 4, 3, 2, 1].map((rating) => <option value={rating} key={rating}>{rating} star{rating === 1 ? "" : "s"}</option>)}</select></label>
          <label className="product-review-form-wide">Review<textarea value={form.review_text} onChange={(event) => handleFormChange("review_text", event.target.value.slice(0, 1000))} maxLength={1000} rows={5} required /></label>
          <label className="product-review-form-wide product-review-image-upload">
            Add a photo (optional)
            <input ref={reviewImageInputRef} type="file" accept="image/*" onChange={handleReviewImageChange} />
            <small>Any uploaded photo is converted to WebP. Maximum 10MB.</small>
          </label>
          {reviewImagePreview && (
            <div className="product-review-image-preview">
              <img src={reviewImagePreview} alt="Review upload preview" />
              <div><strong>{reviewImageFile?.name}</strong><span>Will be saved as WebP</span></div>
              <button type="button" onClick={clearReviewImage} aria-label="Remove review image"><LuX /></button>
            </div>
          )}
        </div>
        {formError && <p className="product-review-message error">{formError}</p>}
        {formStatus && <p className="product-review-message">{formStatus}</p>}
        <button type="submit" className="primary product-review-submit" disabled={isSubmitting}><LuSend /> {isSubmitting ? "Submitting..." : "Submit Review"}</button>
      </form>
    </section>
  )
}

function ProductDetails() {
  const { productKey } = useParams()
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
  const [includeProductBox, setIncludeProductBox] = useState(false)

  useEffect(() => {
    let isCurrent = true

    const fetchProduct = async () => {
      if (!productKey) {
        setProduct(false)
        setLoading(false)
        return
      }

      setLoading(true)
      setProduct(null)
      setProductError("")

      try {
        let query = supabase
          .from("products")
          .select(`
            *,
            product_variants (
              *
            )
          `)

        query = UUID_PATTERN.test(productKey)
          ? query.eq("id", productKey)
          : query.eq("slug", productKey)

        const { data, error } = await withRequestTimeout(query.single())

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
  }, [productKey])

  useEffect(() => {
    if (!product?.name) return undefined

    const previousTitle = document.title
    document.title = `${product.name} | Puchi Puchi`

    return () => {
      document.title = previousTitle
    }
  }, [product?.name])

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
    setIncludeProductBox(false)
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
          .neq("id", product?.id || "")
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
  }, [product?.id])

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
  const canAddProductBox = product.allow_product_box === true
  const hasNameOptions = canAddName || canAddNamePlate || canAddProductBox
  const selectedNameOption = customNameOption === "name_plate" && canAddNamePlate
    ? "name_plate"
    : customNameOption === "name" && canAddName
      ? "name"
      : "none"
  const customNameFee = selectedNameOption === "name_plate" ? CUSTOM_BASE_FEE : 0
  const displayPrice = price + customNameFee + (includeProductBox ? GIFT_BOX_FEE : 0)
  const formattedPrice = formatCartPrice(displayPrice)
  const variantImages = parseListField(variant?.image_urls || variant?.image_url)
  const image = variantImages[selectedImageIndex] || variantImages[0] || PRODUCT_PLACEHOLDER_IMAGE
  const categories = parseListField(product.categories || product.category)
  const categoryLabel = categories.join(", ")
  const descriptionHtml = sanitizeRichText(product.description)
  const stockCount = Number(variant?.stock ?? 0)
  const hasStock = stockCount > 0
  const canAddToCart = Boolean(variant?.id) && hasStock && !isAddingToCart
  const isMadeJustForYou = categories.some((category) => (
    category.toLowerCase().replace(/[^a-z0-9]/g, "").includes("madejustforyou")
  ))

  const handleAddToCart = async () => {
    setCartMessage("")
    setCartError("")

    if (!variant?.id) {
      setCartError("Please choose an available variant.")
      return
    }

    if (!hasStock) {
      setCartError("This variant is out of stock.")
      return
    }

    if (quantity > stockCount) {
      setCartError(`Only ${stockCount} ${stockCount === 1 ? "item is" : "items are"} available.`)
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
        customBaseFee: customNameFee,
        customTextType: selectedNameOption === "name_plate" ? "name_plate" : "name",
        addProductBox: includeProductBox,
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

            {descriptionHtml ? (
              <div
                className="product-description"
                dangerouslySetInnerHTML={{ __html: descriptionHtml }}
              />
            ) : (
              <p className="product-description">No description available</p>
            )}

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
                            setQuantity(1)
                            setCartMessage("")
                            setCartError("")
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
                    <h6>Personalization & product box</h6>

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

                    {canAddProductBox && (
                      <label className={`custom-base-option ${includeProductBox ? "selected" : ""}`}>
                        <input
                          type="checkbox"
                          checked={includeProductBox}
                          onChange={(event) => {
                            setIncludeProductBox(event.target.checked)
                            setCartMessage("")
                            setCartError("")
                          }}
                        />
                        <span>
                          <strong>Add product box</strong>
                          <small>+{formatCartPrice(GIFT_BOX_FEE)}</small>
                        </span>
                      </label>
                    )}
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
                  disabled={!hasStock}
                >
                  <LuMinus />
                </button>
                <strong>{quantity}</strong>
                <button
                  type="button"
                  aria-label="Increase quantity"
                  onClick={() => setQuantity((current) => Math.min(stockCount, current + 1))}
                  disabled={!hasStock || quantity >= stockCount}
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
                disabled={!canAddToCart}
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

        <ProductReviews productId={product.id} productName={product.name} />

        {relatedProducts.length > 0 && (
          <div className="related-products">
            <h3>You Might Also Like</h3>
            <div className="related-products-grid">
              {relatedProducts.map((item) => (
                <ProductCard
                  key={item.id}
                  product={item}
                  onClick={(selectedProduct) => navigate(`/product/${selectedProduct.slug || selectedProduct.id}`)}
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
