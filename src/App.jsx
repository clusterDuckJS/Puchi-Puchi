import { useEffect, useState } from 'react';
import Header from './Components/Header/Header'
import Home from './Pages/Home/Home'
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import Shop from './Pages/Shop/Shop';
import About from './Pages/About/About';
import Reviews from './Pages/Reviews/Reviews';
import Faq from './Pages/Faq/Faq';
import Footer from './Components/Footer/Footer';
import ProductDetails from './Pages/ProductDetails/ProductDetails';
import { supabase } from './utils/supabase';
import AuthForm from './Components/Auth/AuthForm';
import Profile from './Pages/Profile/Profile';
import AdminLogin from './Pages/Admin/AdminLogin';
import Admin from './Pages/Admin/Admin';
import Cart from './Pages/Cart/Cart';
import PaymentStatus from './Pages/PaymentStatus/PaymentStatus';

function App() {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);

  const navigate = useNavigate();
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith("/admin");

  const createProfile = async (user) => {
    const metadata = user.user_metadata ?? {};
    const fullName = metadata.full_name || metadata.name || "";
    const [fallbackFirstName, ...fallbackLastName] = fullName.split(" ").filter(Boolean);

    const profileData = {
      id: user.id,
      email: user.email,
    };

    const firstName = metadata.first_name || fallbackFirstName;
    const lastName = metadata.last_name || fallbackLastName.join(" ");

    if (firstName) profileData.first_name = firstName;
    if (lastName) profileData.last_name = lastName;
    if (metadata.phone) profileData.phone = metadata.phone;

    const { error } = await supabase.from("profiles").upsert(profileData, {
      onConflict: "id",
    });

    if (error) console.error("Profile error:", error.message);
  };

  const fetchProfile = async (userId) => {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    if (error) {
      console.error("Fetch profile error:", error.message);
      setProfile(null);
      return null;
    } else {
      setProfile(data);
      return data;
    }
  };

  useEffect(() => {
    let isCurrent = true;

    supabase.auth.getSession().then(async ({ data }) => {
      if (!isCurrent) return;

      setSession(data.session);

      if (data.session?.user) {
        await createProfile(data.session.user);
        await fetchProfile(data.session.user.id);
      }

    }).catch((error) => {
      console.error("Session error:", error.message);

      if (isCurrent) {
        setSession(null);
        setProfile(null);
      }
    });

    const { data: listener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);

        if (event === "SIGNED_IN" && session?.user) {
          await createProfile(session.user);
          await fetchProfile(session.user.id);
        }

        if (event === "SIGNED_OUT") {
          setProfile(null);
          const isSigningOutFromAdmin = window.location.pathname.startsWith("/admin");
          navigate(isSigningOutFromAdmin ? "/admin/login" : "/");
        }
      }
    );

    return () => {
      isCurrent = false;
      listener.subscription.unsubscribe();
    };
  }, [navigate]);

  return (
    <>
      {!isAdminRoute && (
        <Header
          key={session?.user?.id ?? "guest"}
          user={session?.user}
          profile={profile}
        />
      )}

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/product/:id" element={<ProductDetails />} />
        <Route path="/about" element={<About />} />
        <Route path="/shop" element={<Shop />} />
        <Route path="/cart" element={<Cart />} />
        <Route path="/payment-status" element={<PaymentStatus />} />
        <Route path="/reviews" element={<Reviews />} />
        <Route path="/faq" element={<Faq />} />
        <Route
          path="/profile"
          element={
            session?.user ? (
              <Profile
                user={session.user}
                profile={profile}
                onProfileUpdated={setProfile}
              />
            ) : (
              <AuthForm />
            )
          }
        />
        <Route
          path="/admin/login"
          element={
            profile?.role === "admin" ? (
              <Navigate to="/admin" replace />
            ) : (
              <AdminLogin />
            )
          }
        />
        <Route
          path="/admin/*"
          element={
            session?.user && profile?.role === "admin" ? (
              <Admin />
            ) : (
              <Navigate to="/admin/login" replace />
            )
          }
        />
      </Routes>

      {!isAdminRoute && <Footer />}
    </>
  );
}

export default App
