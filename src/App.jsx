import { Suspense, lazy, useEffect, useState } from 'react';
import Header from './Components/Header/Header'
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import Footer from './Components/Footer/Footer';
import { supabase } from './utils/supabase';

const Home = lazy(() => import('./Pages/Home/Home'));
const Shop = lazy(() => import('./Pages/Shop/Shop'));
const About = lazy(() => import('./Pages/About/About'));
const Reviews = lazy(() => import('./Pages/Reviews/Reviews'));
const Faq = lazy(() => import('./Pages/Faq/Faq'));
const Gallery = lazy(() => import('./Pages/Gallery/Gallery'));
const ProductDetails = lazy(() => import('./Pages/ProductDetails/ProductDetails'));
const AuthForm = lazy(() => import('./Components/Auth/AuthForm'));
const Profile = lazy(() => import('./Pages/Profile/Profile'));
const AdminLogin = lazy(() => import('./Pages/Admin/AdminLogin'));
const Admin = lazy(() => import('./Pages/Admin/Admin'));
const Cart = lazy(() => import('./Pages/Cart/Cart'));
const PaymentStatus = lazy(() => import('./Pages/PaymentStatus/PaymentStatus'));

function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    if ("scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }

    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [pathname]);

  return null;
}

function PageLoading() {
  return (
    <main className="route-loading">
      <p>Loading...</p>
    </main>
  );
}

function App() {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith("/admin");
  const isCheckingAdminAccess = authLoading || (session?.user && profileLoading);

  const createProfile = async (user) => {
    const metadata = user.user_metadata ?? {};
    const fullName = metadata.full_name || metadata.name || "";
    const [fallbackFirstName, ...fallbackLastName] = fullName.split(" ").filter(Boolean);

    const firstName = metadata.first_name || fallbackFirstName;
    const lastName = metadata.last_name || fallbackLastName.join(" ");
    const phone = metadata.phone?.trim();

    const { data: existingProfile, error: fetchError } = await supabase
      .from("profiles")
      .select("id, email, first_name, last_name, phone")
      .eq("id", user.id)
      .maybeSingle();

    if (fetchError) {
      console.error("Profile lookup error:", fetchError.message);
      return;
    }

    const profileData = existingProfile ? {} : {
      id: user.id,
      email: user.email,
    };

    if (existingProfile?.email !== user.email) profileData.email = user.email;
    if (!existingProfile?.first_name && firstName) profileData.first_name = firstName;
    if (!existingProfile?.last_name && lastName) profileData.last_name = lastName;
    if (!existingProfile?.phone && phone) profileData.phone = phone;

    if (existingProfile && Object.keys(profileData).length === 0) return;

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
        if (nextSession?.user) {
          setProfileLoading(true);
        } else {
          setProfileLoading(false);
        }

        setSession(nextSession);
        setAuthLoading(false);

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
    }).finally(() => {
      if (isCurrent) {
        setProfileLoading(false);
      }
    });

    return () => {
      isCurrent = false;
    };
  }, [session?.user]);

  return (
    <>
      <ScrollToTop />

      {!isAdminRoute && (
        <Header
          key={session?.user?.id ?? "guest"}
          user={session?.user}
          profile={profile}
        />
      )}

      <Suspense fallback={<PageLoading />}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/product/:id" element={<ProductDetails />} />
          <Route path="/about" element={<About />} />
          <Route path="/shop" element={<Shop />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/payment-status" element={<PaymentStatus />} />
          <Route path="/reviews" element={<Reviews />} />
          <Route path="/reviews/new" element={<Reviews />} />
          <Route path="/gallery" element={<Gallery />} />
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
              isCheckingAdminAccess ? (
                <main className="admin-login-page">
                  <p className="admin-status-message">Checking admin access...</p>
                </main>
              ) : profile?.role === "admin" ? (
                <Navigate to="/admin" replace />
              ) : (
                <AdminLogin />
              )
            }
          />
          <Route
            path="/admin/*"
            element={
              isCheckingAdminAccess ? (
                <main className="admin-login-page">
                  <p className="admin-status-message">Checking admin access...</p>
                </main>
              ) : session?.user && profile?.role === "admin" ? (
                <Admin />
              ) : (
                <Navigate to="/admin/login" replace />
              )
            }
          />
        </Routes>
      </Suspense>

      {!isAdminRoute && <Footer />}
    </>
  );
}

export default App
