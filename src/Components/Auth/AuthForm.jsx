import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../utils/supabase";
import "./auth.css";
import LOGO from "../../assets/puchi_logo_tran.svg";

function AuthForm({ onAuthSuccess }) {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const switchAuthMode = (nextIsLogin) => {
    setAuthError("");
    setIsLogin(nextIsLogin);
  };

  const handleAuth = async (event) => {
    event.preventDefault();
    setAuthError("");
    setIsSubmitting(true);

    if (isLogin) {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) setAuthError(error.message);
      else {
        onAuthSuccess?.();
        navigate("/");
      }
    } else {
      if (password !== confirmPassword) {
        setAuthError("Passwords do not match.");
        setIsSubmitting(false);
        return;
      }

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            first_name: firstName.trim(),
            last_name: lastName.trim(),
            full_name: `${firstName.trim()} ${lastName.trim()}`.trim(),
            phone: phone.trim(),
          },
        },
      });
      if (error) setAuthError(error.message);
      else if (data.session) {
        onAuthSuccess?.();
        navigate("/");
      } else {
        setAuthError("Account created. Please check your email to confirm your signup.");
      }
    }

    setIsSubmitting(false);
  };

  const handleGoogleLogin = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/`,
      }
    });

    if (error) {
      console.error("Google login error:", error.message);
    }
  };

  return (
    <div className="auth-form-container">
      <div className="svg-wrapper mb-05">
        <img src={LOGO} alt="Puchi Puchi Logo" />
      </div>
      <h4 className="center bold-700 mb-1">{isLogin ? "Welcome Back! ✨" : "Join Puchi Puchi 🌸"}</h4>

      <div className="flex align-center w-100 switch-btn-container br-15 mb-2">
        <button className={`flex-1 sm ${isLogin ? "active" : ""}`} onClick={() => switchAuthMode(true)}>Log In</button>
        <button className={`flex-1 sm ${!isLogin ? "active" : ""}`} onClick={() => switchAuthMode(false)}>Sign Up</button>
      </div>

      <form className="w-100 auth-fields" onSubmit={handleAuth}>
        {!isLogin && (
          <>
            <div className="auth-field-row">
              <fieldset className="w-100">
                <label htmlFor="firstName">First Name</label>
                <input
                  id="firstName"
                  name="firstName"
                  className="w-100 mt-05"
                  type="text"
                  placeholder="First name"
                  autoComplete="given-name"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                />
              </fieldset>

              <fieldset className="w-100">
                <label htmlFor="lastName">Last Name</label>
                <input
                  id="lastName"
                  name="lastName"
                  className="w-100 mt-05"
                  type="text"
                  placeholder="Last name"
                  autoComplete="family-name"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required
                />
              </fieldset>
            </div>

            <fieldset className="w-100">
              <label htmlFor="phone">Phone</label>
              <input
                id="phone"
                name="phone"
                className="w-100 mt-05"
                type="tel"
                placeholder="98765 43210"
                autoComplete="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
              />
            </fieldset>
          </>
        )}

        <fieldset className="w-100">
          <label htmlFor="email">Email</label>
          <input
            id="email"
            name="email"
            className="w-100 mt-05"
            type="email"
            placeholder="hello@example.com"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </fieldset>

        <fieldset className="w-100">
          <label htmlFor="password">Password</label>
          <input
            id="password"
            name="password"
            className="w-100 mt-05"
            type="password"
            autoComplete={isLogin ? "current-password" : "new-password"}
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </fieldset>

        {!isLogin && (
          <fieldset className="w-100">
            <label htmlFor="confirmPassword">Confirm Password</label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              className="w-100 mt-05"
              type="password"
              autoComplete="new-password"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </fieldset>
        )}

        {authError && <p className="auth-error text-error">{authError}</p>}

        <button className="primary w-100 mt-1" type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Please wait..." : isLogin ? "Log In" : "Create Account"}
        </button>
      </form>
      <button
        className="secondary w-100 mt-1"
        onClick={handleGoogleLogin}
      >
        Continue with Google
      </button>
    </div>
  );
}

export default AuthForm;
