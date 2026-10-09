import { useCallback, useEffect, useState } from "react";
import {
  ApiError,
  createAdminExpense,
  deleteAdminExpense,
  fetchAdminExpenses,
  updateAdminExpense,
} from "../api";
import "./admin.css";

const CATEGORIES = ["Raw Materials", "Packaging", "Transportation", "Electricity", "Advertisement", "Shop", "Other"];
const emptyForm = () => ({
  title: "",
  category: "Raw Materials",
  amount: "",
  expense_date: new Date().toISOString().slice(0, 10),
  notes: "",
});

function AdminExpenses() {
  const [expenses, setExpenses] = useState([]);
  const [form, setForm] = useState(emptyForm());
  const [editingId, setEditingId] = useState(null);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [category, setCategory] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setExpenses(await fetchAdminExpenses({ startDate, endDate, category }));
      setError("");
    } catch (requestError) {
      if (requestError instanceof ApiError && requestError.status === 401) {
        window.location.replace("/admin/login");
        return;
      }
      setError(requestError.message || "Unable to load expenses.");
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, category]);

  useEffect(() => {
    if (Boolean(startDate) !== Boolean(endDate)) return undefined;
    const initialLoad = window.setTimeout(load, 0);
    return () => window.clearTimeout(initialLoad);
  }, [load, startDate, endDate]);

  const change = (event) => setForm((current) => ({ ...current, [event.target.name]: event.target.value }));

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");
    const payload = { ...form, amount: Number(form.amount), notes: form.notes || null };
    try {
      if (editingId) await updateAdminExpense(editingId, payload);
      else await createAdminExpense(payload);
      setForm(emptyForm());
      setEditingId(null);
      setSuccess(editingId ? "Expense updated." : "Expense added.");
      await load();
    } catch (requestError) {
      setError(requestError.message || "Unable to save expense.");
    }
  };

  const edit = (expense) => {
    setEditingId(expense.id);
    setForm({
      title: expense.title,
      category: expense.category,
      amount: expense.amount,
      expense_date: expense.expense_date,
      notes: expense.notes || "",
    });
  };

  const remove = async (expense) => {
    if (!window.confirm(`Delete expense "${expense.title}"?`)) return;
    try {
      await deleteAdminExpense(expense.id);
      setSuccess("Expense deleted.");
      await load();
    } catch (requestError) {
      setError(requestError.message || "Unable to delete expense.");
    }
  };

  return (
    <section className="admin-panel">
      <div className="admin-page-heading"><div><p className="admin-eyebrow">BUSINESS COSTS</p><h1>Expenses</h1></div><button className="admin-button admin-button-secondary" type="button" onClick={load}>Refresh</button></div>
      {error && <p className="admin-alert" role="alert">{error}</p>}
      {success && <p className="admin-success" role="status">{success}</p>}
      <form className="admin-expense-form" onSubmit={submit}>
        <label>Title<input name="title" maxLength="120" value={form.title} onChange={change} required /></label>
        <label>Category<select name="category" value={form.category} onChange={change}>{CATEGORIES.map((item) => <option key={item}>{item}</option>)}</select></label>
        <label>Amount<input name="amount" type="number" min="0.01" step="0.01" value={form.amount} onChange={change} required /></label>
        <label>Date<input name="expense_date" type="date" value={form.expense_date} onChange={change} required /></label>
        <label className="admin-expense-notes">Notes<textarea name="notes" rows="2" value={form.notes} onChange={change} /></label>
        <div className="admin-expense-actions"><button className="admin-button" type="submit">{editingId ? "Save Changes" : "Add Expense"}</button>{editingId && <button className="admin-button admin-button-secondary" type="button" onClick={() => { setEditingId(null); setForm(emptyForm()); }}>Cancel</button>}</div>
      </form>
      <div className="admin-filters">
        <label>From<input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} /></label>
        <label>To<input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} /></label>
        <label>Category<select value={category} onChange={(event) => setCategory(event.target.value)}><option value="">All categories</option>{CATEGORIES.map((item) => <option key={item}>{item}</option>)}</select></label>
      </div>
      {loading ? <p className="admin-muted" role="status">Loading expenses...</p> : expenses.length === 0 ? <p className="admin-empty">No expenses found.</p> : (
        <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Date</th><th>Title</th><th>Category</th><th>Notes</th><th>Amount</th><th /></tr></thead><tbody>{expenses.map((expense) => <tr key={expense.id}><td>{expense.expense_date}</td><td>{expense.title}</td><td>{expense.category}</td><td>{expense.notes || "—"}</td><td>₹{Number(expense.amount).toFixed(2)}</td><td><div className="admin-row-actions"><button className="admin-table-link" type="button" onClick={() => edit(expense)}>Edit</button><button className="admin-table-link admin-delete-link" type="button" onClick={() => remove(expense)}>Delete</button></div></td></tr>)}</tbody></table></div>
      )}
    </section>
  );
}

export default AdminExpenses;
