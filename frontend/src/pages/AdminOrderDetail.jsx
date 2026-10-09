import { useCallback, useEffect, useState } from "react";
import { ApiError, fetchAdminOrder, updateAdminOrderStatus } from "../api";
import "./admin.css";

const money = (amount) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(amount || 0));

const STATUS_NEXT = {
  NEW: "ACCEPTED",
  ACCEPTED: "PREPARING",
  PREPARING: "READY_FOR_PICKUP",
  READY_FOR_PICKUP: "COMPLETED",
};

const formatStatus = (status) =>
  status.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());

function AdminOrderDetail({ orderNumber }) {
  const [order, setOrder] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);

  const loadOrder = useCallback(async () => {
    try {
      setOrder(await fetchAdminOrder(orderNumber));
      setError("");
    } catch (requestError) {
      if (requestError instanceof ApiError && requestError.status === 401) {
        window.location.replace("/admin/login");
        return;
      }
      setError("Unable to load this order. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, [orderNumber]);

  useEffect(() => {
    const initialLoad = window.setTimeout(loadOrder, 0);
    return () => window.clearTimeout(initialLoad);
  }, [loadOrder]);

  const updateStatus = async (status) => {
    setIsUpdating(true);
    setError("");
    setSuccess("");
    try {
      const updatedOrder = await updateAdminOrderStatus(orderNumber, status);
      setOrder(updatedOrder);
      setSuccess(`Order status updated to ${formatStatus(updatedOrder.status)}.`);
    } catch (requestError) {
      if (requestError instanceof ApiError && requestError.status === 401) {
        window.location.replace("/admin/login");
        return;
      }
      setError(requestError instanceof Error ? requestError.message : "Unable to update order status.");
    } finally {
      setIsUpdating(false);
    }
  };

  if (isLoading) {
    return <p className="admin-muted" role="status">Loading order...</p>;
  }
  if (!order) {
    return (
      <section className="admin-panel">
        <p className="admin-alert" role="alert">{error || "Order not found."}</p>
        <a className="admin-button admin-inline-button" href="/admin/orders">Back to Orders</a>
      </section>
    );
  }

  const nextStatus = STATUS_NEXT[order.status];

  return (
    <section className="admin-panel">
      <a className="admin-back-link" href="/admin/orders">← Back to Orders</a>
      <div className="admin-page-heading admin-detail-heading">
        <div>
          <p className="admin-eyebrow">ORDER DETAILS</p>
          <h1>{order.order_number}</h1>
        </div>
        <span className={`admin-status status-${order.status.toLowerCase()}`}>{formatStatus(order.status)}</span>
      </div>

      {error && <p className="admin-alert" role="alert">{error}</p>}
      {success && <p className="admin-success" role="status">{success}</p>}

      <div className="admin-detail-grid">
        <section className="admin-info-card">
          <h2>Customer</h2>
          <p><strong>Name</strong><span>{order.customer_name}</span></p>
          <p><strong>Phone</strong><span>{order.customer_phone}</span></p>
        </section>
        <section className="admin-info-card">
          <h2>Pickup</h2>
          <p><strong>Date</strong><span>{order.pickup_date}</span></p>
          <p><strong>Time</strong><span>{order.pickup_time.slice(0, 5)}</span></p>
          <p><strong>Created</strong><span>{new Date(order.created_at).toLocaleString()}</span></p>
        </section>
      </div>

      <section className="admin-section admin-info-card">
        <h2>Items</h2>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead><tr><th>Product</th><th>Variant</th><th>Quantity</th><th>Unit Price</th><th>Line Total</th></tr></thead>
            <tbody>
              {order.items.map((item, index) => (
                <tr key={`${item.product_id}-${item.variant}-${index}`}>
                  <td>{item.product_name}</td>
                  <td>{item.variant}</td>
                  <td>{item.quantity}</td>
                  <td>{money(item.unit_price)}</td>
                  <td>{money(item.line_total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="admin-order-totals">
          <p><span>Subtotal</span><strong>{money(order.subtotal)}</strong></p>
          <p><span>Discount</span><strong>{money(order.discount)}</strong></p>
          <p><span>Total</span><strong>{money(order.total_amount)}</strong></p>
          <p><span>Payment</span><strong>{order.payment_status.replaceAll("_", " ")}</strong></p>
        </div>
        <div className="admin-instructions">
          <strong>Special Instructions</strong>
          <p>{order.special_instructions || "None"}</p>
        </div>
      </section>

      <section className="admin-section admin-info-card">
        <h2>Update Status</h2>
        <div className="admin-status-actions">
          {nextStatus && (
            <button className="admin-button" type="button" disabled={isUpdating} onClick={() => updateStatus(nextStatus)}>
              {isUpdating ? "Updating..." : `Move to ${formatStatus(nextStatus)}`}
            </button>
          )}
          {!["COMPLETED", "CANCELLED"].includes(order.status) && (
            <button className="admin-button admin-button-danger" type="button" disabled={isUpdating} onClick={() => updateStatus("CANCELLED")}>
              Cancel Order
            </button>
          )}
          {!nextStatus && ["COMPLETED", "CANCELLED"].includes(order.status) && (
            <p className="admin-muted">This order is in a final status.</p>
          )}
        </div>
      </section>
    </section>
  );
}

export default AdminOrderDetail;
