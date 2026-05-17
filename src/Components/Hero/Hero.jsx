import { LuArrowRight, LuSparkles } from 'react-icons/lu'
import { useNavigate } from 'react-router-dom'
import './hero.css'

function Hero() {
  const navigate = useNavigate()

  const handleCustomChibiClick = () => {
    document.getElementById("custom-chibi")?.scrollIntoView({
      behavior: "smooth",
    })
  }

  return (
    <section className="hero">
      <div className="hero-copy">
        <small className="tag color-primary bold-700">✨ Handmade with Love</small>
        <h1 className="bold-800">
          Tiny figurines,
          <span className="gradient-text">big feelings</span>
        </h1>
        <p>
          Adorable chibi figurines that capture your favorite characters, or
          even yourself! Each piece is crafted with love and care.
        </p>
        <div className="btn-container hero-actions">
          <button className="primary" type="button" onClick={() => navigate("/shop")}>
            Shop Figurines <LuArrowRight />
          </button>
          <button className="secondary" type="button" onClick={handleCustomChibiClick}>
            <LuSparkles /> Create Your Mini
          </button>
        </div>
      </div>

      <div className="hero-mark" aria-label="Puchi Puchi in Japanese">
        <span>プチ</span>
        <span>プチ</span>
      </div>
    </section>
  )
}

export default Hero
