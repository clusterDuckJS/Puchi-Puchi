import { useEffect, useState } from "react";
import { LuLogOut, LuMenu, LuSearch, LuShoppingBag, LuUser, LuX } from "react-icons/lu";
import { NavLink, useNavigate } from "react-router-dom";
import LOGO from "../../assets/puchi_logo_tran.svg";
import { CART_UPDATED_EVENT, getCartItemCount } from "../../utils/cart";
import { supabase } from "../../utils/supabase";
import AuthForm from "../Auth/AuthForm";
import AuthModal from "../Auth/AuthModal";
import "./header.css";

function Header({ profile, user }) {
  const navigate = useNavigate();
  const [openAuth, setOpenAuth] = useState(false);
  const [openMenu, setOpenMenu] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [cartCount, setCartCount] = useState(0);
  const firstName = profile?.first_name || user?.user_metadata?.first_name;

  useEffect(() => {
    let isCurrent = true;

    const refreshCartCount = async () => {
      if (!user?.id) {
        setCartCount(0);
        return;
      }

      try {
        const count = await getCartItemCount(user.id);

        if (isCurrent) {
          setCartCount(count);
        }
      } catch (error) {
        console.error("Cart count error:", error);

        if (isCurrent) {
          setCartCount(0);
        }
      }
    };

    refreshCartCount();
    window.addEventListener(CART_UPDATED_EVENT, refreshCartCount);

    return () => {
      isCurrent = false;
      window.removeEventListener(CART_UPDATED_EVENT, refreshCartCount);
    };
  }, [user?.id]);

  const closeMobileMenu = () => {
    setOpenMenu(false);
  };

  const handleCustomChibiClick = () => {
    closeMobileMenu();
    navigate("/");
    window.requestAnimationFrame(() => {
      document.getElementById("custom-chibi")?.scrollIntoView({
        behavior: "smooth",
      });
    });
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);

    try {
      const { error } = await supabase.auth.signOut();

      if (error) {
        console.error("Logout error:", error.message);
        setIsLoggingOut(false);
      }
    } catch (error) {
      console.error("Logout error:", error);
      setIsLoggingOut(false);
    }
  };

  return (
    <>
      <header className="site-header">
        <img className="logo" src={LOGO} alt="Puchi Puchi Logo" />

        <button
          className="mobile-menu-btn"
          type="button"
          aria-label={openMenu ? "Close menu" : "Open menu"}
          aria-expanded={openMenu}
          onClick={() => setOpenMenu((isOpen) => !isOpen)}
        >
          {openMenu ? <LuX /> : <LuMenu />}
        </button>

        <div className={`header-menu ${openMenu ? "open" : ""}`}>
          <nav className="header-links">
            <NavLink to="/" end className="nav-link" onClick={closeMobileMenu}>
              Home
            </NavLink>
            <NavLink to="/shop" className="nav-link" onClick={closeMobileMenu}>
              Shop
            </NavLink>
            <button
              className="nav-link nav-button"
              type="button"
              onClick={handleCustomChibiClick}
            >
              Custom Gifts
            </button>
            <NavLink to="/about" className="nav-link" onClick={closeMobileMenu}>
              About
            </NavLink>
            <NavLink to="/reviews" className="nav-link" onClick={closeMobileMenu}>
              Reviews
            </NavLink>
          </nav>

          <div className="header-account">
            <button className="header-icon-btn" type="button" aria-label="Search">
              <LuSearch />
            </button>

            {user ? (
              <>
                <NavLink to="/profile" className="user-greeting" onClick={closeMobileMenu}>
                  <LuUser />
                  <span>{firstName || "Account"}</span>
                </NavLink>
                <button
                  className="logout-btn"
                  type="button"
                  onClick={() => {
                    closeMobileMenu();
                    handleLogout();
                  }}
                  disabled={isLoggingOut}
                >
                  <LuLogOut size={18}/>
                  {/* <span>{isLoggingOut ? "Logging out" : "Log out"}</span> */}
                </button>
              </>
            ) : (
              <>
                <button
                  className="login-link"
                  type="button"
                  onClick={() => {
                    closeMobileMenu();
                    setOpenAuth(true);
                  }}
                >
                  Log In
                </button>
                <button
                  className="signup-btn"
                  type="button"
                  onClick={() => {
                    closeMobileMenu();
                    setOpenAuth(true);
                  }}
                >
                  Sign Up
                </button>
                <button className="header-icon-btn" type="button" aria-label="Account">
                  <LuUser />
                </button>
              </>
            )}

            <NavLink
              to="/cart"
              className="header-icon-btn cart-btn"
              aria-label="Cart"
              onClick={closeMobileMenu}
            >
              <LuShoppingBag />
              {cartCount > 0 && <span className="cart-count">{cartCount}</span>}
            </NavLink>
          </div>
        </div>
      </header>

      <AuthModal isOpen={openAuth} onClose={() => setOpenAuth(false)}>
        <AuthForm onAuthSuccess={() => setOpenAuth(false)} />
      </AuthModal>
    </>
  );
}

export default Header;
