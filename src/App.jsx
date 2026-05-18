
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

function App() {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const navigate = useNavigate();
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith("/admin");

  // 🔹 create profile
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

  // 🔹 fetch profile
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
    // 🔹 handle existing session
    supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session);

      if (data.session?.user) {
        await createProfile(data.session.user);
        await fetchProfile(data.session.user.id);
      }

      setLoading(false);
    });

    // 🔹 listen to auth changes
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

    return () => listener.subscription.unsubscribe();
  }, [navigate]);

  // 🔴 loading
  if (loading) return <div>Loading...</div>;

  // ✅ MAIN APP (always render layout)
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
