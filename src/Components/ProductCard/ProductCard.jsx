import React from 'react'
import './product-card.css'

function ProductCard({ product, onClick }) {
    const variants = product.product_variants || [];
     // get lowest price (important)
  const minPrice = Math.min(
    ...variants.map(v => v.discount_price || v.price)
  );

   const formattedPrice = `₹${(minPrice / 100).toLocaleString()}`;
   const image =
    variants[0]?.image_url ||
    product.image_url ||
    "https://via.placeholder.com/300";


  return (
    <div onClick={() => onClick(product)} className="product-card card pointer">
      
      {/* Image */}
      <div className="img-wrapper">
        <img
          src={image}
          alt={product.name}
          className="product-image"
        />
      </div>

      {/* Category */}
      {product.category && (
        <small className="text-primary">
          {product.category}
        </small>
      )}

      {/* Name */}
      <h6 className="bold-700">
        {product.name}
      </h6>

      {/* Price */}
      <h5 className="text-primary bold-700">
        {formattedPrice}
      </h5>

      {/* Button */}
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