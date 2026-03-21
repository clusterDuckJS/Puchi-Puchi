import React from 'react'
import { LuSearch, LuShoppingBag, LuUser } from 'react-icons/lu'
import { NavLink } from 'react-router-dom'
import LOGO from '../../assets/puchi_logo_tran.svg'
import './header.css'

function Header() {
  return (
    <header className='flex space-btween align-center'>
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
      <nav className="header-btns">
        <NavLink to="/" end className="nav-link">
          <LuSearch />
        </NavLink>
        <NavLink to="/" end className="nav-link">
          <LuUser />
        </NavLink>
        <NavLink to="/" end className="nav-link">
          <LuShoppingBag />
        </NavLink>
      </nav>

    </header>
  )
}

export default Header