import React from 'react'
import './hero.css'
import { LuArrowBigRight, LuArrowRight, LuSparkles } from 'react-icons/lu'
function Hero() {
  return (
    <section className='hero'>
      <small  className='tag color-primary bold-600'>✨ Handmade with Love</small>
      <h1 className='bold-800'>Tiny figurines,
        <span className='gradient-text'>big feelings</span></h1>
        <p>Adorable chibi figurines that capture your favorite characters, 
          or even yourself! Each piece is crafted with love and care.</p>
          <div className="btn-container">
            <button className="primary"><LuSparkles /> Create Your Mini</button>
            <button className="secondary">Shop Figurines <LuArrowRight /></button>
          </div>
    </section>

  )
}

export default Hero