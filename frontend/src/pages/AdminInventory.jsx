import { useCallback, useEffect, useState } from "react";
import { ApiError, createAdminVariant, fetchAdminInventory, updateAdminVariant } from "../api";
import "./admin.css";

const money = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(value || 0));

function inventoryStatus(variant) {
  if (!variant.is_active) return "INACTIVE";
  if (!variant.is_available) return "DISABLED";
  if (variant.available_quantity <= 0) return "OUT OF STOCK";
  if (variant.available_quantity <= variant.low_stock_threshold) return "LOW STOCK";
  return "IN STOCK";
}

function AdminInventory() {
  const [variants, setVariants] = useState([]);
  const [drafts, setDrafts] = useState({});
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);
  const [newVariant, setNewVariant] = useState({
    product_id: "",
    name: "",
    quantity_value: "",
    unit: "g",
    selling_price: "",
    cost_price: "0",
    stock_quantity: "0",
    low_stock_threshold: "5",
  });

  const load = useCallback(async () => {
    try {
      const rows = await fetchAdminInventory();
      setVariants(rows);
      setDrafts(Object.fromEntries(rows.map((row) => [row.id, {
        selling_price: row.selling_price,
        cost_price: row.cost_price,
        stock_quantity: row.stock_quantity,
        low_stock_threshold: row.low_stock_threshold,
        is_available: row.is_available,
      }])));
      setError("");
    } catch (requestError) {
      if (requestError instanceof ApiError && requestError.status === 401) {
        window.location.replace("/admin/login");
        return;
      }
      setError(requestError.message || "Unable to load inventory.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const initialLoad = window.setTimeout(load, 0);
    return () => window.clearTimeout(initialLoad);
  }, [load]);

  const changeDraft = (id, key, value) => {
    setDrafts((current) => ({
      ...current,
      [id]: { ...current[id], [key]: value },
    }));
  };

  const save = async (id) => {
    setSavingId(id);
    setError("");
    setSuccess("");
    try {
      await updateAdminVariant(id, {
        ...drafts[id],
        selling_price: Number(drafts[id].selling_price),
        cost_price: Number(drafts[id].cost_price),
        stock_quantity: Number(drafts[id].stock_quantity),
        low_stock_threshold: Number(drafts[id].low_stock_threshold),
      });
      setSuccess("Inventory updated.");
      await load();
    } catch (requestError) {
      setError(requestError.message || "Unable to update inventory.");
    } finally {
      setSavingId(null);
    }
  };

  const addVariant = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");
    try {
      await createAdminVariant(Number(newVariant.product_id), {
        name: newVariant.name,
        quantity_value: Number(newVariant.quantity_value),
        unit: newVariant.unit,
        selling_price: Number(newVariant.selling_price),
        cost_price: Number(newVariant.cost_price),
        stock_quantity: Number(newVariant.stock_quantity),
        low_stock_threshold: Number(newVariant.low_stock_threshold),
        is_available: false,
      });
      setNewVariant((current) => ({
        ...current,
        name: "",
        quantity_value: "",
        selling_price: "",
      }));
      setSuccess("Variant added as unavailable. Set its real stock and enable it when ready.");
      await load();
    } catch (requestError) {
      setError(requestError.message || "Unable to add variant.");
    }
  };

  const products = [...new Map(
    variants.map((variant) => [variant.product_id, variant.product_name])
  ).entries()];

  return (
    <section className="admin-panel">
      <div className="admin-page-heading">
        <div><p className="admin-eyebrow">PRODUCT VARIANTS</p><h1>Inventory</h1></div>
        <button className="admin-button admin-button-secondary" type="button" onClick={load}>Refresh</button>
      </div>
      <p className="admin-muted">Orders reserve stock when placed. Stock is deducted when an order is accepted and restored if that accepted order is cancelled.</p>
      {error && <p className="admin-alert" role="alert">{error}</p>}
      {success && <p className="admin-success" role="status">{success}</p>}
      <form className="admin-variant-form" onSubmit={addVariant}>
        <h2>Add Product Variant</h2>
        <label>Product<select value={newVariant.product_id} onChange={(event) => setNewVariant((current) => ({ ...current, product_id: event.target.value }))} required><option value="">Choose product</option>{products.map(([id, name]) => <option value={id} key={id}>{name}</option>)}</select></label>
        <label>Variant name<input value={newVariant.name} onChange={(event) => setNewVariant((current) => ({ ...current, name: event.target.value }))} required maxLength="60" placeholder="e.g. 2kg" /></label>
        <label>Quantity<input type="number" min="0.001" step="0.001" value={newVariant.quantity_value} onChange={(event) => setNewVariant((current) => ({ ...current, quantity_value: event.target.value }))} required /></label>
        <label>Unit<input value={newVariant.unit} onChange={(event) => setNewVariant((current) => ({ ...current, unit: event.target.value }))} required maxLength="20" /></label>
        <label>Selling price<input type="number" min="0.01" step="0.01" value={newVariant.selling_price} onChange={(event) => setNewVariant((current) => ({ ...current, selling_price: event.target.value }))} required /></label>
        <button className="admin-button" type="submit" disabled={loading || products.length === 0}>Add Variant</button>
      </form>
      {loading ? <p className="admin-muted" role="status">Loading inventory...</p> : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead><tr><th>Product / Variant</th><th>Selling</th><th>Cost</th><th>Stock</th><th>Low Threshold</th><th>Available</th><th>Status</th><th /></tr></thead>
            <tbody>
              {variants.map((variant) => {
                const draft = drafts[variant.id];
                return (
                  <tr key={variant.id}>
                    <td>{variant.product_name}<small className="admin-cell-detail">{variant.name} · reserved {variant.reserved_quantity}</small></td>
                    {["selling_price", "cost_price", "stock_quantity", "low_stock_threshold"].map((field) => (
                      <td key={field}>
                        <input
                          className="admin-small-input"
                          type="number"
                          min={field === "selling_price" ? "0.01" : "0"}
                          step={field.includes("price") ? "0.01" : "1"}
                          value={draft?.[field] ?? ""}
                          aria-label={`${variant.name} ${field.replaceAll("_", " ")}`}
                          disabled={!variant.is_active}
                          onChange={(event) => changeDraft(variant.id, field, event.target.value)}
                        />
                        {field.includes("price") && <small>{money(draft?.[field])}</small>}
                      </td>
                    ))}
                    <td><input type="checkbox" checked={Boolean(draft?.is_available)} disabled={!variant.is_active} onChange={(event) => changeDraft(variant.id, "is_available", event.target.checked)} aria-label={`Enable ${variant.name}`} /></td>
                    <td>{inventoryStatus(variant)}</td>
                    <td><button type="button" className="admin-button" disabled={!variant.is_active || savingId === variant.id} onClick={() => save(variant.id)}>{savingId === variant.id ? "Saving..." : "Save"}</button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export default AdminInventory;
