import { useCallback, useEffect, useState } from "react";
import { adminLogout, ApiError, fetchCurrentAdmin } from "../api";
import "./admin.css";

function AdminLayout({ children }) {
  const [admin, setAdmin] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [error, setError] = useState("");

  const loadAdmin = useCallback(async () => {
    setError("");
    try {
      const currentAdmin = await fetchCurrentAdmin();
      setAdmin(currentAdmin);
    } catch (requestError) {
      if (requestError instanceof ApiError && requestError.status === 401) {
        window.location.replace("/admin/login");
        return;
      }
      setError("Unable to verify your admin session. Check the backend and retry.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const initialLoad = window.setTimeout(loadAdmin, 0);
    return () => window.clearTimeout(initialLoad);
  }, [loadAdmin]);

  const retryLoadAdmin = () => {
    setIsLoading(true);
    loadAdmin();
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    setError("");
    try {
      await adminLogout();
      window.location.assign("/admin/login");
    } catch {
      setError("Unable to log out right now. Please try again.");
      setIsLoggingOut(false);
    }
  };

  if (isLoading) {
    return (
      <main className="admin-auth-page">
        <p role="status">Verifying admin session...</p>
      </main>
    );
  }

  if (!admin) {
    return (
      <main className="admin-auth-page">
        <section className="admin-auth-card">
          <p className="admin-auth-eyebrow">SAMARTH GRUH UDYOG</p>
          <h1>Admin Panel</h1>
          <p className="admin-auth-error" role="alert">{error}</p>
          <button className="admin-auth-button" type="button" onClick={retryLoadAdmin}>
            Try Again
          </button>
          <a className="admin-back-link" href="/admin/login">Go to Admin Login</a>
        </section>
      </main>
    );
  }

  return (
    <div className="admin-app">
      <header className="admin-header">
        <a className="admin-brand" href="/admin">Samarth Gruh Udyog Admin</a>
        <div className="admin-account">
          <span>{admin.name}<small>{admin.email}</small></span>
          <button
            type="button"
            className="admin-logout-button"
            onClick={handleLogout}
            disabled={isLoggingOut}
          >
            {isLoggingOut ? "Logging Out..." : "Logout"}
          </button>
        </div>
      </header>
      <nav className="admin-nav" aria-label="Admin navigation">
        <a href="/admin" aria-current={window.location.pathname === "/admin" ? "page" : undefined}>
          Dashboard
        </a>
        <a href="/admin/orders" aria-current={window.location.pathname.startsWith("/admin/orders") ? "page" : undefined}>
          Orders
        </a>
        <a href="/admin/inventory" aria-current={window.location.pathname === "/admin/inventory" ? "page" : undefined}>
          Inventory
        </a>
        <a href="/admin/sales" aria-current={window.location.pathname === "/admin/sales" ? "page" : undefined}>
          Sales &amp; Profit
        </a>
        <a href="/admin/expenses" aria-current={window.location.pathname === "/admin/expenses" ? "page" : undefined}>
          Expenses
        </a>
        <a href="/admin/qr" aria-current={window.location.pathname === "/admin/qr" ? "page" : undefined}>
          Order QR
        </a>
      </nav>
      <main className="admin-main">
        {error && <p className="admin-alert" role="alert">{error}</p>}
        {children}
      </main>
    </div>
  );
}

export default AdminLayout;
