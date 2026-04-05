import React, { useEffect, useState } from 'react'
import './home.css'
import Hero from '../../Components/Hero/Hero'
import Section from '../../Components/Section/Section'
import { LuBox, LuCamera, LuWandSparkles } from 'react-icons/lu'
import ProductCard from '../../Components/ProductCard/ProductCard'
import { supabase } from '../../utils/supabase.js'
import { useNavigate } from 'react-router-dom'

function Home() {
  console.log(supabase);
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);

  useEffect(() => {
    const fetchProducts = async () => {
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
        .eq("is_active", true);

      if (error) {
        console.error("Error fetching:", error);
      } else {
        console.log("DATA:", data); // debug
        setProducts(data);
      }
    };

    fetchProducts();
  }, []);
  return (
    <div>
      <Hero />

      {/* NEW ARRIVALS */}
      <Section
        tag="🌸 Just Dropped"
        title="New Arrivals"
        description="Fresh off the crafting table, meet our newest cuties!">
        <div className="card-container grid-col-3 gap-2">
          {products.map(product => (
            <ProductCard
              key={product.id}
              product={product}
              onClick={(p) => navigate(`/product/${p.id}`)}
            />
          ))}
        </div>
      </Section>
      {/* END--------NEW ARRIVALS--------END */}

      {/* BEST SELLERS */}
      <Section
        tag="⭐ Best Sellers"
        title="Our Cutest Figurines"
        description="Discover our most loved chibi characters, ready to find a new home!">
        <div className="card-container grid-col-3 gap-2">
          {products.map(product => (
            <ProductCard
              key={product.id}
              product={product}
              onClick={(p) => navigate(`/product/${p.id}`)}
            />
          ))}
        </div>
      </Section>
      {/* END--------BEST SELLERS--------END */}

      {/* HOW IT WORKS */}
      <Section
        tag="🎀 Simple & Fun"
        title="How It Works"
        description="Getting your own chibi is as easy as 1-2-3!">
        <div className="card-container grid-col-3 gap-2">
          <div className="card flex-col align-center gap-1">
            <div className="svg-wrapper">
              <LuCamera />
            </div>
            <h5 className='bold-700 center'>Upload Your Photo</h5>
            <p className='center'>Easily upload your photo and place your order in just a few clicks</p>
          </div>
          <div className="card flex-col align-center gap-1">
            <div className="svg-wrapper">
              <LuWandSparkles />
            </div>
            <h5 className='bold-700 center'>Preview & Approve</h5>
            <p className='center'>We create your custom design and send a preview on WhatsApp. Request changes until you love it. 100% satisfaction before we start making it.</p>
          </div>
          <div className="card flex-col align-center gap-1">
            <div className="svg-wrapper">
              <LuBox />
            </div>
            <h5 className='bold-700 center'>We Craft & Ship</h5>
            <p className='center'>Once approved, we handcraft your figurine and dispatch it within 5–7 working days.</p>
          </div>
        </div>
      </Section>
      {/* END--------HOW IT WORKS--------END */}

    </div>
  )
}

export default Home