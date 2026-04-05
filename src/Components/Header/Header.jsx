import React from 'react'
import { LuSearch, LuShoppingBag, LuUser } from 'react-icons/lu'
import { NavLink } from 'react-router-dom'
import LOGO from '../../assets/puchi_logo_tran.svg'
import './header.css'
import { useState } from "react";
import AuthModal from "../Auth/AuthModal";
import AuthForm from "../Auth/AuthForm";

function Header() {
  const [openAuth, setOpenAuth] = useState(false);
  return (
    <>
      <header className='flex space-btw align-center'>
        <img className='logo' src={LOGO} alt="Puchi Puchi Logo" />
        <nav className="header-links">
          <NavLink to="/" end className="nav-link">
            Home
          </NavLink>
          <NavLink to="/" end className="nav-link">
            Shop
          </NavLink>
          <NavLink to="/" end className="nav-link">
            About
          </NavLink>
        </nav>
        <nav className="header-btns flex align-center">
          <NavLink to="/" end className="nav-link">
            <LuSearch />
          </NavLink>
          <NavLink to="/" end className="nav-link">
            <LuUser />
          </NavLink>

          <button
            className='primary sm'
            onClick={() => setOpenAuth(true)}
          >
            Sign Up/Login
          </button>
          <NavLink to="/" end className="nav-link">
            <LuShoppingBag />
          </NavLink>
        </nav>

      </header>
      {/* 🔥 Modal */}
      <AuthModal isOpen={openAuth} onClose={() => setOpenAuth(false)}>
        <AuthForm />
      </AuthModal>
    </>
  )
}

export default Header