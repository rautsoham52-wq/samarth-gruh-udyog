import { useState } from "react";
import { adminLogin } from "../api";
import "./admin.css";

function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setError("");
    try {
      await adminLogin({ email: email.trim(), password });
      window.location.assign("/admin");
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to log in. Please try again."
      );
      setIsSubmitting(false);
    }
  };

  return (
    <main className="admin-auth-page">
      <section className="admin-auth-card">
        <p className="admin-auth-eyebrow">SAMARTH GRUH UDYOG</p>
        <h1>Admin Login</h1>
        <p className="admin-auth-description">
          Sign in to access the protected admin area.
        </p>

        <form className="admin-auth-form" onSubmit={handleSubmit}>
          <label>
            Email
            <input
              type="email"
              autoComplete="username"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </label>
          <label>
            Password
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </label>

          {error && (
            <p className="admin-auth-error" role="alert">
              {error}
            </p>
          )}

          <button
            className="admin-auth-button"
            type="submit"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Signing In..." : "Login"}
          </button>
        </form>
      </section>
    </main>
  );
}

export default AdminLogin;
