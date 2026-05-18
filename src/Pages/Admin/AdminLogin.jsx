import { useEffect, useState } from "react";
import { FcGoogle } from "react-icons/fc";
import { LuLock, LuShieldCheck } from "react-icons/lu";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../utils/supabase";
import "./admin.css";

function AdminLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false);

  useEffect(() => {
    const verifyExistingAdminSession = async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData.session?.user?.id;

      if (!userId) return;

      const { data: profile, error } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", userId)
        .maybeSingle();

      if (!error && profile?.role === "admin") {
        navigate("/admin", { replace: true });
        return;
      }

      await supabase.auth.signOut();
      setAuthError("This account does not have admin access.");
    };

    verifyExistingAdminSession();
  }, [navigate]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setAuthError("");
    setIsSubmitting(true);

    const { data: authData, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      setAuthError(signInError.message);
      setIsSubmitting(false);
      return;
    }

    const userId = authData.user?.id;

    if (!userId) {
      await supabase.auth.signOut();
      setAuthError("Unable to verify this admin account.");
      setIsSubmitting(false);
      return;
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .maybeSingle();

    if (profileError || profile?.role !== "admin") {
      await supabase.auth.signOut();
      setAuthError("This account does not have admin access.");
      setIsSubmitting(false);
      return;
    }

    navigate("/admin", { replace: true });
  };

  const handleGoogleLogin = async () => {
    setAuthError("");
    setIsGoogleSubmitting(true);

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/admin/login`,
      },
    });

    if (error) {
      setAuthError(error.message);
      setIsGoogleSubmitting(false);
    }
  };

  return (
    <main className="admin-login-page">
      <form className="admin-login-panel" onSubmit={handleSubmit}>
        <div className="admin-login-header">
          <span className="admin-login-icon">
            <LuShieldCheck />
          </span>
          <h1>Admin Login</h1>
          <p>Puchi Puchi internal dashboard</p>
        </div>

        <fieldset className="w-100">
          <label htmlFor="adminEmail">Email</label>
          <input
            id="adminEmail"
            className="w-100 mt-05"
            type="email"
            placeholder="admin@example.com"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </fieldset>

        <fieldset className="w-100">
          <label htmlFor="adminPassword">Password</label>
          <input
            id="adminPassword"
            className="w-100 mt-05"
            type="password"
            placeholder="Password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </fieldset>

        {authError && <p className="admin-auth-error text-error">{authError}</p>}

        <button className="primary admin-login-submit w-100" type="submit" disabled={isSubmitting || isGoogleSubmitting}>
          <LuLock />
          <span>{isSubmitting ? "Checking access..." : "Log In"}</span>
        </button>

        <div className="admin-login-divider">
          <span>or</span>
        </div>

        <button
          className="admin-google-btn w-100"
          type="button"
          onClick={handleGoogleLogin}
          disabled={isSubmitting || isGoogleSubmitting}
        >
          <FcGoogle />
          <span>{isGoogleSubmitting ? "Opening Google..." : "Continue with Google"}</span>
        </button>
      </form>
    </main>
  );
}

export default AdminLogin;
