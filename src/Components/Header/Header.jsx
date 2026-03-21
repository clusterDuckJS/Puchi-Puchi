import React from 'react'
import { LuSearch, LuShoppingBag, LuUser } from 'react-icons/lu'
import { NavLink } from 'react-router-dom'

function Header() {
  return (
    <header>
        <nav>
            <NavLink to="/" end className="nav-link">
            Home
          </NavLink>
          <NavLink to="/" end className="nav-link">
            Shop
          </NavLink>
          <NavLink to="/" end className="nav-link">
            About
          </NavLink>
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