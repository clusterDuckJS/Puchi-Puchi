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

    const firstName = metadata.first_name || fallbackFirstName;
    const lastName = metadata.last_name || fallbackLastName.join(" ");
    const phone = metadata.phone?.trim();

    const { data: existingProfile, error: fetchError } = await supabase
      .from("profiles")
      .select("id, first_name, last_name, phone")
      .eq("id", user.id)
      .maybeSingle();

    if (fetchError) {
      console.error("Profile lookup error:", fetchError.message);
      return;
    }

    const profileData = {
      id: user.id,
      email: user.email,
    };

    if (!existingProfile?.first_name && firstName) profileData.first_name = firstName;
    if (!existingProfile?.last_name && lastName) profileData.last_name = lastName;
    if (!existingProfile?.phone && phone) profileData.phone = phone;

    const query = existingProfile
      ? supabase.from("profiles").update(profileData).eq("id", user.id)
      : supabase.from("profiles").insert(profileData);

    const { error } = await query;

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
    const { data: listener } = supabase.auth.onAuthStateChange(
      (event, nextSession) => {
        setSession(nextSession);

        if (event === "SIGNED_OUT") {
          setProfile(null);
          const isSigningOutFromAdmin = window.location.pathname.startsWith("/admin");
          navigate(isSigningOutFromAdmin ? "/admin/login" : "/");
        }
      }
    );

    return () => {
      listener.subscription.unsubscribe();
    };
  }, [navigate]);

  useEffect(() => {
    let isCurrent = true;
    const user = session?.user;

    if (!user) {
      return () => {
        isCurrent = false;
      };
    }

    const syncProfile = async () => {
      await createProfile(user);

      if (isCurrent) {
        await fetchProfile(user.id);
      }
    };

    syncProfile().catch((error) => {
      console.error("Profile sync error:", error.message);

      if (isCurrent) {
        setProfile(null);
      }
    });

    return () => {
      isCurrent = false;
    };
  }, [session?.user]);

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
