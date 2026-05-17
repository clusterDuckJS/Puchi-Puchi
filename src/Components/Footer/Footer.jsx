import { FaInstagram, FaTwitter } from "react-icons/fa";
import { Link } from "react-router-dom";
import LOGO from "../../assets/puchi_logo_tran.svg";
import "./footer.css";

function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-content">
        <div className="footer-brand">
          <img className="footer-logo" src={LOGO} alt="Puchi Puchi" />
          <p>Tiny figurines, big feelings. Handcrafted chibi figurines made with love and care, just for you.</p>

          <div className="footer-socials" aria-label="Social links">
            <a href="https://instagram.com" aria-label="Instagram">
              <FaInstagram />
            </a>
            <a href="https://twitter.com" aria-label="Twitter">
              <FaTwitter />
            </a>
          </div>
        </div>

        <nav className="footer-nav" aria-label="Shop">
          <h6>Shop</h6>
          <Link to="/shop">All Figurines</Link>
          <Link to="/#custom-chibi">Custom Chibi</Link>
          <Link to="/shop">New Arrivals</Link>
        </nav>

        <nav className="footer-nav" aria-label="Help">
          <h6>Help</h6>
          <Link to="/about">About Us</Link>
          <Link to="/faq">Shipping Info</Link>
          <a href="mailto:hello@puchipuchi.in">Contact</a>
        </nav>
      </div>

      <div className="footer-bottom">
        <small>&copy; 2024 Puchi Puchi. All rights reserved.</small>
        <small>Made with <span aria-hidden="true">&hearts;</span> in India</small>
      </div>
    </footer>
  );
}

export default Footer;
