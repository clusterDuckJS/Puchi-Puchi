import './product-card.css'
import { NavLink } from 'react-router-dom'

const PRODUCT_PLACEHOLDER_IMAGE = "/product-placeholder.svg"

const parseListField = (value) => {
  if (Array.isArray(value)) return value.filter(Boolean)
  if (!value) return []
  return String(value).split(',').map((item) => item.trim()).filter(Boolean)
}

const getVariantDisplayPrice = (variant) => {
  const discountPrice = Number(variant.discount_price)
  const price = Number(variant.price)

  if (Number.isFinite(discountPrice) && discountPrice > 0) return discountPrice
  if (Number.isFinite(price) && price > 0) return price
  return null
}

const getLowestVariantPrice = (variants) => {
  const prices = variants
    .filter((variant) => variant.is_active !== false)
    .map(getVariantDisplayPrice)
    .filter((price) => price !== null)

  return prices.length ? Math.min(...prices) : 0
}

function ProductCard({ product, onClick }) {
  const variants = product.product_variants || []
  const minPrice = getLowestVariantPrice(variants)
  const formattedPrice = `\u20b9${(minPrice / 100).toLocaleString("en-IN")}`
  const categories = parseListField(product.categories || product.category)
  const image =
    parseListField(variants[0]?.image_urls)[0] ||
    variants[0]?.image_url ||
    product.image_url ||
    PRODUCT_PLACEHOLDER_IMAGE

  return (
    <div onClick={() => onClick(product)} className="product-card card pointer">
      <div className="img-wrapper">
        <img
          src={image}
          alt={product.name}
          className="product-image"
        />
      </div>

      {categories.length > 0 && (
        <small className="text-primary">
          {categories.join(", ")}
        </small>
      )}

      <h6 className="bold-700">
        {product.name}
      </h6>

      <h5 className="text-primary bold-700">
        {formattedPrice}
      </h5>

      {product.id ? (
        <NavLink
          to={`/product/${product.id}`}
          onClick={(event) => event.stopPropagation()}
          className="secondary mt-1 product-card-link"
        >
          View Details
        </NavLink>
      ) : (
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation()
            onClick(product)
          }}
          className="secondary mt-1"
        >
          View Details
        </button>
      )}
    </div>
  )
}

export default ProductCard
