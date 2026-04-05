import { useState } from "react";
import { supabase } from "../../utils/supabase";
import "./auth.css";
import LOGO from "../../assets/puchi_logo_tran.svg";

function AuthForm() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleAuth = async () => {
    if (isLogin) {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) alert(error.message);
    } else {
      const { error } = await supabase.auth.signUp({
        email,
        password,
      });
      if (error) alert(error.message);
    }
  };

  return (
    <div className="auth-form-container">
      <div className="svg-wrapper mb-05">
        <img src={LOGO} alt="Puchi Puchi Logo" />
      </div>
      <h4 className="center bold-700 mb-1">{isLogin ? "Welcome Back! ✨" : "Join Puchi Puchi 🌸"}</h4>

      <div className="flex align-center w-100 switch-btn-container br-15 mb-2">
        <button className={`flex-1 sm ${isLogin ? "active" : ""}`} onClick={() => setIsLogin(true)}>Log In</button>
        <button className={`flex-1 sm ${!isLogin ? "active" : ""}`} onClick={() => setIsLogin(false)}>Sign Up</button>
      </div>

      <fieldset className="w-100 mb-1">
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
        />
      </fieldset>

      <fieldset className="w-100">
        <label htmlFor="password">Password</label>
        <input
          id="password"
          name="password"
          className="w-100 mt-05"
          type="password"
          autoComplete="current-password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </fieldset>



      <button className="primary w-100 mt-1" onClick={handleAuth}>
        {isLogin ? "Log In" : "Sign Up"}
      </button>
    </div>
  );
}

export default AuthForm;