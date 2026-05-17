import './product-card.css'

function ProductCard({ product, onClick }) {
  const variants = product.product_variants || []
  const minPrice = variants.length
    ? Math.min(...variants.map(v => v.discount_price || v.price))
    : 0
  const formattedPrice = `₹${(minPrice / 100).toLocaleString()}`
  const image =
    variants[0]?.image_url ||
    product.image_url ||
    "https://via.placeholder.com/300"

  return (
    <div onClick={() => onClick(product)} className="product-card card pointer">
      <div className="img-wrapper">
        <img
          src={image}
          alt={product.name}
          className="product-image"
        />
      </div>

      {product.category && (
        <small className="text-primary">
          {product.category}
        </small>
      )}

      <h6 className="bold-700">
        {product.name}
      </h6>

      <h5 className="text-primary bold-700">
        {formattedPrice}
      </h5>

      <button
        onClick={() => onClick(product)}
        className="secondary mt-1"
      >
        View Details
      </button>
    </div>
  )
}

export default ProductCard
