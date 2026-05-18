import './about.css'
import { LuHeart, LuIndianRupee, LuSparkles, LuStar, LuUsers } from 'react-icons/lu'
import LOGO from '../../assets/puchi_logo_tran.svg'

function About() {
  const story = [
    "Welcome to Puchi Puchi! ✨",
    'If you’re imagining a giant, bustling factory, you might be surprised to learn that the "headquarters" of Puchi Puchi is actually just my dining table right here in Kollam, Kerala!',
    "This whole adventure is a one-person passion project, powered by a whole lot of love for character design and the quiet, cozy humming of my two very hardworking co-workers my printers, Mars and Saturn.",
    "At Puchi Puchi, I specialize in bringing your ideas to life as custom, personalized resin figurines. Whether it’s an adorable, big-headed chibi or a stylized pop figure of someone you love, my absolute favorite thing is turning big imaginations into tiny, tangible pieces of art.",
    "Because my workshop is just me and my table, there is no massive assembly line. Every single little figure that leaves my hands has been meticulously printed, perfectly cured, and carefully checked by yours truly. It means a little bit of creative chaos, a few late nights, and an endless amount of care poured into every single order.",
    "When you take home a Puchi Puchi figure, you aren't just getting a toy, you're getting a little piece of dining-table magic, made just for you.",
    "Thank you so much for stopping by, supporting handmade, and helping my little tabletop dream grow! 💖",
  ]

  const beliefs = [
    {
      icon: <LuHeart />,
      title: "Made with Love",
      text: "Every figure is crafted with genuine care and passion",
    },
    {
      icon: <LuStar />,
      title: "Quality First",
      text: "Thoughtful printing, curing, and checks for lasting cuteness",
    },
    {
      icon: <LuSparkles />,
      title: "Unique Designs",
      text: "Personalized characters you won't find anywhere else",
    },
    {
      icon: <LuIndianRupee />,
      title: "Affordable Joy",
      text: "Bringing your dream characters to life at a friendly price",
    },
  ]

  return (
    <main className="about-page">
      <section className="about-hero">
        <img className="about-logo" src={LOGO} alt="Puchi Puchi" />

        <h1 className="bold-800 center">Our Story</h1>
        <p className="about-subtitle center">
          Tiny resin figurines, dining-table magic, and a whole lot of heart.
        </p>

        <article className="about-story-card">
          {story.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </article>
      </section>

      <section className="about-beliefs">
        <h2 className="bold-800 center">What We Believe In</h2>

        <div className="about-belief-grid">
          {beliefs.map((belief) => (
            <article className="about-belief-card" key={belief.title}>
              <div className="about-belief-icon" aria-hidden="true">
                {belief.icon}
              </div>
              <h3 className="bold-800 center">{belief.title}</h3>
              <p className="center">{belief.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="about-quote-wrap" aria-label="Puchi Puchi quote">
        <blockquote>
          <p>"I sacrificed my dining table so your shelves could look awesome."</p>
          <cite>— Just Me & My Printers 💖</cite>
        </blockquote>
      </section>
    </main>
  )
}

export default About
