import { useCallback, useEffect, useState } from "react";
import { ApiError, fetchAdminDashboard, fetchAdminOrders } from "../api";
import "./admin.css";

const money = (amount) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(amount || 0));

const formatStatus = (status) =>
  status.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());

function AdminPage() {
  const [summary, setSummary] = useState(null);
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const loadDashboard = useCallback(async () => {
    try {
      const [dashboard, recentOrders] = await Promise.all([
        fetchAdminDashboard(),
        fetchAdminOrders(),
      ]);
      setSummary(dashboard);
      setOrders(recentOrders.slice(0, 8));
      setError("");
    } catch (requestError) {
      if (requestError instanceof ApiError && requestError.status === 401) {
        window.location.replace("/admin/login");
        return;
      }
      setError("Unable to load dashboard data. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const initialLoad = window.setTimeout(loadDashboard, 0);
    const timer = window.setInterval(loadDashboard, 15000);
    return () => {
      window.clearTimeout(initialLoad);
      window.clearInterval(timer);
    };
  }, [loadDashboard]);

  if (isLoading) {
    return <p className="admin-muted" role="status">Loading dashboard...</p>;
  }

  if (error && !summary) {
    return (
      <section className="admin-panel">
        <h1>Dashboard</h1>
        <p className="admin-alert" role="alert">{error}</p>
        <button className="admin-button" type="button" onClick={loadDashboard}>Retry</button>
      </section>
    );
  }

  const cards = [
    ["Today's Orders", summary?.today_orders ?? 0],
    ["Today's Sales", money(summary?.today_sales)],
    ["Product Cost", summary?.today_cost_data_complete ? money(summary?.today_product_cost) : "Unavailable"],
    ["Gross Profit", money(summary?.today_gross_profit)],
    ["Today's Expenses", money(summary?.today_expenses)],
    ["Net Profit", money(summary?.today_net_profit)],
    ["New Orders", summary?.new_orders ?? 0],
    ["Preparing", summary?.preparing_orders ?? 0],
    ["Ready for Pickup", summary?.ready_for_pickup_orders ?? 0],
    ["Completed", summary?.completed_orders ?? 0],
  ];

  return (
    <section className="admin-panel">
      <div className="admin-page-heading">
        <div>
          <p className="admin-eyebrow">OVERVIEW</p>
          <h1>Dashboard</h1>
        </div>
        <button className="admin-button admin-button-secondary" type="button" onClick={loadDashboard}>
          Refresh
        </button>
      </div>
      {error && <p className="admin-alert" role="alert">{error} Showing the last loaded data.</p>}
      <div className="admin-summary-grid">
        {cards.map(([label, value]) => (
          <article className="admin-summary-card" key={label}>
            <p>{label}</p>
            <strong>{value}</strong>
          </article>
        ))}
      </div>
      <section className="admin-section">
        <div className="admin-section-heading">
          <h2>Recent Orders</h2>
          <a href="/admin/orders">View all orders</a>
        </div>
        <OrdersTable orders={orders} />
      </section>
    </section>
  );
}

export function OrdersTable({ orders }) {
  if (orders.length === 0) {
    return <p className="admin-empty">No orders found.</p>;
  }

  return (
    <div className="admin-table-wrap">
      <table className="admin-table">
        <thead>
          <tr>
            <th>Order</th>
            <th>Customer</th>
            <th>Pickup</th>
            <th>Total</th>
            <th>Status</th>
            <th aria-label="Action" />
          </tr>
        </thead>
        <tbody>
          {orders.map((order) => (
            <tr key={order.order_number}>
              <td>{order.order_number}</td>
              <td>{order.customer_name}</td>
              <td>{order.pickup_date} · {order.pickup_time.slice(0, 5)}</td>
              <td>{money(order.total_amount)}</td>
              <td><span className={`admin-status status-${order.status.toLowerCase()}`}>{formatStatus(order.status)}</span></td>
              <td><a className="admin-table-link" href={`/admin/orders/${encodeURIComponent(order.order_number)}`}>View</a></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default AdminPage;
