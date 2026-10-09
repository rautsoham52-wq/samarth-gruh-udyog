import { useCallback, useEffect, useState } from "react";
import { ApiError, fetchAdminSales, fetchAdminSalesPeriods } from "../api";
import "./admin.css";

const money = (value) => value == null
  ? "Unavailable"
  : new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(Number(value));

function AdminSales() {
  const [period, setPeriod] = useState("today");
  const [groupBy, setGroupBy] = useState("daily");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [report, setReport] = useState(null);
  const [periodRows, setPeriodRows] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [summary, grouped] = await Promise.all([
        fetchAdminSales(period, period === "custom" ? startDate : "", period === "custom" ? endDate : ""),
        fetchAdminSalesPeriods(groupBy),
      ]);
      setReport(summary);
      setPeriodRows(grouped);
      setError("");
    } catch (requestError) {
      if (requestError instanceof ApiError && requestError.status === 401) {
        window.location.replace("/admin/login");
        return;
      }
      setError(requestError.message || "Unable to load sales and profit data.");
    } finally {
      setLoading(false);
    }
  }, [period, groupBy, startDate, endDate]);

  useEffect(() => {
    if (period === "custom" && (!startDate || !endDate)) return undefined;
    const initialLoad = window.setTimeout(load, 0);
    return () => window.clearTimeout(initialLoad);
  }, [load, period, startDate, endDate]);

  const cards = report ? [
    ["Completed Orders", report.total_orders],
    ["Revenue", money(report.total_revenue)],
    ["Product Cost", money(report.product_cost)],
    ["Gross Profit", money(report.gross_profit)],
    ["Expenses", money(report.total_expenses)],
    ["Net Profit", money(report.net_profit)],
    ["Average Order Value", money(report.average_order_value)],
  ] : [];

  return (
    <section className="admin-panel">
      <div className="admin-page-heading"><div><p className="admin-eyebrow">COMPLETED ORDERS · PAY AT SHOP</p><h1>Sales &amp; Profit</h1></div><button className="admin-button admin-button-secondary" type="button" onClick={load}>Refresh</button></div>
      <div className="admin-filters">
        <label>Period<select value={period} onChange={(event) => setPeriod(event.target.value)}><option value="today">Today</option><option value="week">This week</option><option value="month">This month</option><option value="custom">Custom range</option></select></label>
        {period === "custom" && <><label>From<input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} /></label><label>To<input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} /></label></>}
      </div>
      {error && <p className="admin-alert" role="alert">{error}</p>}
      {period === "custom" && (!startDate || !endDate) ? (
        <p className="admin-muted">Choose both dates to load a custom range.</p>
      ) : loading ? <p className="admin-muted" role="status">Loading sales...</p> : report && <>
        {!report.cost_data_complete && <p className="admin-alert">Profit is unavailable because {report.uncosted_order_items} completed historical order item(s) have no saved cost snapshot. No historical costs were guessed.</p>}
        <div className="admin-summary-grid">{cards.map(([label, value]) => <article className="admin-summary-card" key={label}><p>{label}</p><strong>{value}</strong></article>)}</div>
        <section className="admin-section"><div className="admin-section-heading"><h2>Product-wise Sales</h2><span>{report.start_date} – {report.end_date}</span></div>{report.product_sales.length === 0 ? <p className="admin-empty">No completed sales in this period.</p> : <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Product</th><th>Quantity Sold</th><th>Revenue</th></tr></thead><tbody>{report.product_sales.map((row) => <tr key={row.product_id}><td>{row.product_name}</td><td>{row.quantity_sold}</td><td>{money(row.revenue)}</td></tr>)}</tbody></table></div>}</section>
        <section className="admin-section"><div className="admin-section-heading"><h2>{groupBy[0].toUpperCase() + groupBy.slice(1)} Report</h2><select value={groupBy} onChange={(event) => setGroupBy(event.target.value)}><option value="daily">Daily sales</option><option value="weekly">Weekly sales</option><option value="monthly">Monthly sales</option></select></div>{periodRows.length === 0 ? <p className="admin-empty">No completed orders to report yet.</p> : <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Period starting</th><th>Orders</th><th>Revenue</th><th>Product Cost</th><th>Gross Profit</th><th>Expenses</th><th>Net Profit</th></tr></thead><tbody>{periodRows.map((row) => <tr key={row.period_start}><td>{row.period_start}</td><td>{row.completed_orders}</td><td>{money(row.revenue)}</td><td>{money(row.product_cost)}</td><td>{money(row.gross_profit)}</td><td>{money(row.expenses)}</td><td>{money(row.net_profit)}</td></tr>)}</tbody></table></div>}</section>
      </>}
    </section>
  );
}

export default AdminSales;
