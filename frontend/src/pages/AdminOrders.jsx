import { useCallback, useEffect, useState } from "react";
import { useRef } from "react";
import { ApiError, fetchAdminOrders } from "../api";
import { OrdersTable } from "./AdminPage";
import "./admin.css";

const STATUSES = ["", "NEW", "ACCEPTED", "PREPARING", "READY_FOR_PICKUP", "COMPLETED", "CANCELLED"];

function AdminOrders() {
  const [orders, setOrders] = useState([]);
  const [status, setStatus] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const searchTimer = useRef(null);

  const loadOrders = useCallback(async () => {
    try {
      const results = await fetchAdminOrders({ status, search });
      setOrders(results);
      setError("");
    } catch (requestError) {
      if (requestError instanceof ApiError && requestError.status === 401) {
        window.location.replace("/admin/login");
        return;
      }
      setError("Unable to load orders. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, [status, search]);

  useEffect(() => {
    const initialLoad = window.setTimeout(loadOrders, 0);
    const timer = window.setInterval(loadOrders, 15000);
    return () => {
      window.clearTimeout(initialLoad);
      window.clearInterval(timer);
    };
  }, [loadOrders]);

  useEffect(() => () => window.clearTimeout(searchTimer.current), []);

  return (
    <section className="admin-panel">
      <div className="admin-page-heading">
        <div>
          <p className="admin-eyebrow">CUSTOMER ORDERS</p>
          <h1>Orders</h1>
        </div>
        <button className="admin-button admin-button-secondary" type="button" onClick={loadOrders}>
          Refresh
        </button>
      </div>
      <div className="admin-filters">
        <label>
          Search
          <input
            type="search"
            value={searchInput}
            onChange={(event) => {
              const value = event.target.value;
              setSearchInput(value);
              window.clearTimeout(searchTimer.current);
              searchTimer.current = window.setTimeout(() => setSearch(value), 300);
            }}
            placeholder="Order number, customer, phone"
          />
        </label>
        <label>
          Status
          <select value={status} onChange={(event) => {
            setIsLoading(true);
            setStatus(event.target.value);
          }}>
            {STATUSES.map((item) => (
              <option value={item} key={item}>{item ? item.replaceAll("_", " ") : "All statuses"}</option>
            ))}
          </select>
        </label>
      </div>
      {error && <p className="admin-alert" role="alert">{error}</p>}
      {isLoading ? (
        <p className="admin-muted" role="status">Loading orders...</p>
      ) : (
        <OrdersTable orders={orders} />
      )}
    </section>
  );
}

export default AdminOrders;
