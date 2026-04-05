import React, { useEffect, useState } from 'react'
import './product-details.css'
import { NavLink, useParams } from 'react-router-dom';
import { LuArrowLeft } from 'react-icons/lu';
import { supabase } from '../../utils/supabase';

function ProductDetails() {
  const { id } = useParams();
  const [product, setProduct] = useState(null);

  useEffect(() => {
    const fetchProduct = async () => {
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
        .single();

      if (error) {
        console.error(error);
      } else {
        setProduct(data);
      }
    };



    fetchProduct();
  }, [id]);

  if (product === null) return <p>Loading...</p>;
  if (!product) return <p>Product not found</p>;
  const variant = product.product_variants?.[0];

  const price = variant?.discount_price || variant?.price;

  const formattedPrice = `₹${(price / 100).toLocaleString()}`;

  const image =
    variant?.image_url || "https://via.placeholder.com/300";
  return (
    <div>
      <section>
        <NavLink to="/shop" className="flex align-center gap-05"><LuArrowLeft /> Back to Shop</NavLink>
        <div className="grid-col-2 gap-2">
          <div className="card img-wrapper">
            <img
              src={image}
              alt={product.name}
              className="product-image br-15"
            />
          </div>
          <div className="product-details">
            {/* Category */}
            <small className="text-primary">
              {product.category}
            </small>
            {/* Name */}
            <h2>{product.name}</h2>
            {/* Price */}
            <h3 className="text-primary">
              {formattedPrice}
            </h3>
            {/* Description */}
            <p>
              {product.description || "No description available"}
            </p>
            {/* Quantity (basic UI) */}
            <div className="flex align-center gap-1 mt-1">
              <span>Quantity:</span>
              <button>-</button>
              <span>1</span>
              <button>+</button>
            </div>
            {/* CTA */}
            <button className="primary mt-2">
              Add to Cart
            </button>
          </div>

          <p>Product ID: {id}</p>
        </div>
      </section>
    </div>
  )
}

export default ProductDetails