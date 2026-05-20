import { useEffect, useState } from 'react'
import './home.css'
import Hero from '../../Components/Hero/Hero'
import Section from '../../Components/Section/Section'
import { LuArrowRight, LuBox, LuCamera, LuCheck, LuWandSparkles } from 'react-icons/lu'
import ProductCard from '../../Components/ProductCard/ProductCard'
import { supabase } from '../../utils/supabase.js'
import { withRequestTimeout } from '../../utils/request.js'
import { Link, useNavigate } from 'react-router-dom'

function Home() {
  const navigate = useNavigate()
  const [newArrivals, setNewArrivals] = useState([])
  const [bestSellers, setBestSellers] = useState([])

  useEffect(() => {
    let isCurrent = true

    const fetchProducts = async () => {
      const productFields = `
        *,
        product_variants (
          *
        )
      `

      const [newArrivalResult, bestSellerResult] = await Promise.all([
        withRequestTimeout(supabase
          .from("products")
          .select(productFields)
          .eq("is_active", true)
          .eq("is_new_arrival", true)
          .order("created_at", { ascending: false })
          .limit(3)),
        withRequestTimeout(supabase
          .from("products")
          .select(productFields)
          .eq("is_active", true)
          .eq("is_best_seller", true)
          .order("created_at", { ascending: false })
          .limit(3)),
      ])

      if (!isCurrent) return

      if (newArrivalResult.error || bestSellerResult.error) {
        console.error("Error fetching:", newArrivalResult.error || bestSellerResult.error)
        return
      }

      setNewArrivals(newArrivalResult.data || [])
      setBestSellers(bestSellerResult.data || [])
    }

    fetchProducts().catch((error) => {
      if (isCurrent) {
        console.error("Error fetching:", error)
      }
    })

    return () => {
      isCurrent = false
    }
  }, [])

  return (
    <div className='container home'>
      <Hero />

      <div className="damage-guarantee-banner" aria-label="Transit damage replacement guarantee">
        <div className="damage-guarantee-track">
          {Array.from({ length: 4 }).map((_, index) => (
            <span key={index}>
              We pack with love, but accidents happen. Enjoy our 100% replacement guarantee for transit damage. (
              <Link to="/faq#returns">T&Cs apply</Link>)
            </span>
          ))}
        </div>
      </div>

      <Section
        id="custom-chibi"
        sectionClass="home-section how-section"
        tag="🎀 Simple & Fun"
        title="How It Works"
        description="Getting your own chibi is as easy as 1-2-3!">
        <div className="card-container steps-grid">
          <div className="card step-card">
            <div className="step-icon">
              <LuCamera />
              <span>1</span>
            </div>
            <h5 className='bold-700 center'>Upload Your Photo</h5>
            <p className='center'>Easily upload your photo and place your order in just a few clicks.</p>
          </div>

          <div className="card step-card">
            <div className="step-icon">
              <LuWandSparkles />
              <span>2</span>
            </div>
            <h5 className='bold-700 center'>Preview & Approve</h5>
            <p className='center'>We create your custom design and send a preview on WhatsApp. Request changes until you love it.</p>
          </div>

          <div className="card step-card">
            <div className="step-icon">
              <LuBox />
              <span>3</span>
            </div>
            <h5 className='bold-700 center'>We Craft & Ship</h5>
            <p className='center'>Once approved, we handcraft your figurine and dispatch it within 5-7 working days.</p>
          </div>
        </div>

        <div className="promise-strip">
          <span><LuCheck /> Free revisions included</span>
          <span><LuCheck /> Preview before production</span>
          <span><LuCheck /> Handmade with care</span>
        </div>
      </Section>

      <Section
        sectionClass="home-section product-section"
        tag="🌸 Just Dropped"
        title="New Arrivals"
        description="Fresh off the crafting table, meet our newest cuties!">
        <div className="card-container product-grid">
          {newArrivals.map(product => (
            <ProductCard
              key={product.id}
              product={product}
              onClick={(p) => navigate(`/product/${p.id}`)}
            />
          ))}
        </div>
      </Section>

      <Section
        sectionClass="home-section product-section best-seller-section"
        tag="⭐ Best Sellers"
        title="Our Cutest Figurines"
        description="Discover our most loved chibi characters, ready to find a new home!">
        <div className="card-container product-grid">
          {bestSellers.map(product => (
            <ProductCard
              key={product.id}
              product={product}
              onClick={(p) => navigate(`/product/${p.id}`)}
            />
          ))}
        </div>

        <button className="view-all-btn" type="button" onClick={() => navigate("/shop")}>
          View All Products <LuArrowRight />
        </button>
      </Section>
    </div>
  )
}

export default Home
