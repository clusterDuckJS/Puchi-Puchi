
import { useEffect } from 'react';
import Header from './Components/Header/Header'
import Home from './Pages/Home/Home'
import { Route, Routes } from 'react-router-dom';
import Shop from './Pages/Shop/Shop';
import About from './Pages/About/About';
import Reviews from './Pages/Reviews/Reviews';
import Faq from './Pages/Faq/Faq';
import Footer from './Components/Footer/Footer';
import ProductDetails from './Pages/ProductDetails/ProductDetails';

function App() {




  return (
    <>
    <Header />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/product/:id" element={<ProductDetails />} />
        <Route path="/about" element={<About />} />
        <Route path="/shop" element={<Shop />} />
        <Route path="/reviews" element={<Reviews />} />
        <Route path="/faq" element={<Faq />} />
      </Routes>
      <Footer/>
    </>
  )
}

export default App
