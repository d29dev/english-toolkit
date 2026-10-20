import { useState } from "react";

export default function AccountPanel() {
  const [mode, setMode] = useState("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [notice, setNotice] = useState("");

  const isSignIn = mode === "signin";

  const identity = (name || email).trim();
  const initials =
    identity
      .split(/[\s@.]+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0].toUpperCase())
      .join("") || "?";

  function submit(e) {
    e.preventDefault();
    setNotice("Authentication backend is not connected yet.");
  }

  function toggleMode(e) {
    e.preventDefault();
    setMode(isSignIn ? "signup" : "signin");
    setNotice("");
  }

  return (
    <form className="auth" onSubmit={submit}>
      <div className="auth-avatar" aria-hidden="true">
        {initials}
      </div>

      <div className="auth-heading">
        <h2>{isSignIn ? "Welcome back" : "Create your account"}</h2>
        <p className="hint">
          {isSignIn
            ? "Sign in to sync your history and preferences."
            : "An account keeps your settings in one place."}
        </p>
      </div>

      {!isSignIn && (
        <div className="field">
          <label htmlFor="acc-name">Name</label>
          <input
            id="acc-name"
            type="text"
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
          />
        </div>
      )}

      <div className="field">
        <label htmlFor="acc-email">Email</label>
        <input
          id="acc-email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
        />
      </div>

      <div className="field">
        <label htmlFor="acc-password">Password</label>
        <input
          id="acc-password"
          type="password"
          autoComplete={isSignIn ? "current-password" : "new-password"}
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="At least 8 characters"
        />
      </div>

      <button type="submit">{isSignIn ? "Sign in" : "Create account"}</button>

      <button type="button" className="btn-text" onClick={toggleMode}>
        {isSignIn
          ? "New here? Create an account"
          : "Already have an account? Sign in"}
      </button>

      {notice && <p className="hint hint-info">{notice}</p>}
    </form>
  );
}
