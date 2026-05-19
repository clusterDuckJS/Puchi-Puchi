import { useEffect, useRef, useState } from "react";
import { LuLogOut, LuMenu, LuSearch, LuShoppingBag, LuUser, LuX } from "react-icons/lu";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import LOGO from "../../assets/puchi_logo_tran.svg";
import { CART_UPDATED_EVENT, getCartItemCount } from "../../utils/cart";
import { supabase } from "../../utils/supabase";
import AuthForm from "../Auth/AuthForm";
import AuthModal from "../Auth/AuthModal";
import "./header.css";

function Header({ profile, user }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [openAuth, setOpenAuth] = useState(false);
  const [openMenu, setOpenMenu] = useState(false);
  const [openSearch, setOpenSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [cartCount, setCartCount] = useState(0);
  const searchInputRef = useRef(null);
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

  useEffect(() => {
    if (openSearch) {
      searchInputRef.current?.focus();
    }
  }, [openSearch]);

  useEffect(() => {
    if (location.pathname !== "/shop") return;

    const query = new URLSearchParams(location.search).get("search") || "";
    setSearchQuery(query);

    if (query) {
      setOpenSearch(true);
    }
  }, [location.pathname, location.search]);

  const closeMobileMenu = () => {
    setOpenMenu(false);
  };

  const navigateToSearch = (query, options = {}) => {
    const trimmedQuery = query.trim();
    const target = trimmedQuery ? `/shop?search=${encodeURIComponent(trimmedQuery)}` : "/shop";

    navigate(target, { replace: options.replace ?? false });
  };

  const submitSearch = (event) => {
    event.preventDefault();

    const query = searchQuery.trim();

    if (!query) {
      setOpenSearch(true);
      searchInputRef.current?.focus();
      return;
    }

    navigateToSearch(query);
    closeMobileMenu();
  };

  const handleSearchButtonClick = () => {
    if (!openSearch) {
      setOpenSearch(true);
      return;
    }

    const query = searchQuery.trim();

    if (!query) {
      searchInputRef.current?.focus();
      return;
    }

    navigateToSearch(query);
    closeMobileMenu();
  };

  const handleSearchChange = (event) => {
    const nextQuery = event.target.value;
    setSearchQuery(nextQuery);
    navigateToSearch(nextQuery, { replace: location.pathname === "/shop" });
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
      <header className={`site-header ${openSearch ? "search-open" : ""}`}>
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
            <NavLink to="/gallery" className="nav-link" onClick={closeMobileMenu}>
              Gallery
            </NavLink>
            <NavLink to="/about" className="nav-link" onClick={closeMobileMenu}>
              About
            </NavLink>
            <NavLink to="/reviews" className="nav-link" onClick={closeMobileMenu}>
              Reviews
            </NavLink>
          </nav>

          <div className="header-account">
            <form className={`header-search ${openSearch ? "open" : ""}`} onSubmit={submitSearch}>
              {openSearch && (
                <input
                  ref={searchInputRef}
                  type="search"
                  value={searchQuery}
                  onChange={handleSearchChange}
                  placeholder="Search products"
                  aria-label="Search products"
                  onKeyDown={(event) => {
                    if (event.key === "Escape") {
                      setOpenSearch(false);
                    }
                  }}
                />
              )}
              <button
                className="header-icon-btn"
                type="button"
                aria-label={openSearch ? "Submit search" : "Search"}
                onClick={handleSearchButtonClick}
              >
                <LuSearch />
              </button>
            </form>

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
