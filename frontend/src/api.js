const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL ||
  `http://${window.location.hostname || "127.0.0.1"}:8000`
).replace(/\/+$/, "");

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export async function fetchProducts() {
  const response = await fetch(`${API_BASE_URL}/products`);

  if (!response.ok) {
    throw new Error(`Products request failed with status ${response.status}.`);
  }

  const products = await response.json();
  if (!Array.isArray(products)) {
    throw new Error("The products response was not a list.");
  }

  return products;
}

async function readResponse(response, action) {
  const result = await response.json().catch(() => null);
  if (!response.ok) {
    throw new ApiError(
      result?.detail || `${action} failed with status ${response.status}.`,
      response.status
    );
  }
  return result;
}

export async function createOrder(order) {
  const response = await fetch(`${API_BASE_URL}/orders`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(order),
  });
  return readResponse(response, "Placing order");
}

export async function fetchOrder(orderNumber, customerPhone) {
  const response = await fetch(
    `${API_BASE_URL}/orders/${encodeURIComponent(orderNumber)}`,
    { headers: { "X-Customer-Phone": customerPhone } }
  );
  return readResponse(response, "Fetching order");
}

export async function trackOrder(orderNumber, customerPhone) {
  const response = await fetch(`${API_BASE_URL}/orders/track`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      order_number: orderNumber,
      customer_phone: customerPhone,
    }),
  });
  return readResponse(response, "Tracking order");
}

export async function adminLogin(email, password) {
  const response = await fetch(`${API_BASE_URL}/admin/login`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  return readResponse(response, "Admin login");
}

export async function fetchCurrentAdmin() {
  const response = await fetch(`${API_BASE_URL}/admin/me`, {
    credentials: "include",
  });
  return readResponse(response, "Admin session verification");
}

export async function fetchAdminDashboard() {
  const response = await fetch(`${API_BASE_URL}/admin/dashboard`, {
    credentials: "include",
  });
  return readResponse(response, "Loading dashboard");
}

export async function fetchAdminOrders({ status = "", search = "" } = {}) {
  const query = new URLSearchParams();
  if (status) {
    query.set("status", status);
  }
  if (search.trim()) {
    query.set("search", search.trim());
  }
  const queryString = query.toString();
  const response = await fetch(
    `${API_BASE_URL}/admin/orders${queryString ? `?${queryString}` : ""}`,
    { credentials: "include" }
  );
  return readResponse(response, "Loading orders");
}

export async function fetchAdminOrder(orderNumber) {
  const response = await fetch(
    `${API_BASE_URL}/admin/orders/${encodeURIComponent(orderNumber)}`,
    { credentials: "include" }
  );
  return readResponse(response, "Loading order");
}

export async function updateAdminOrderStatus(orderNumber, status) {
  const response = await fetch(
    `${API_BASE_URL}/admin/orders/${encodeURIComponent(orderNumber)}/status`,
    {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    }
  );
  return readResponse(response, "Updating order status");
}

export async function adminLogout() {
  const response = await fetch(`${API_BASE_URL}/admin/logout`, {
    method: "POST",
    credentials: "include",
  });
  return readResponse(response, "Admin logout");
}

async function adminRequest(path, action, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    credentials: "include",
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...options.headers,
    },
  });
  return readResponse(response, action);
}

export const fetchAdminInventory = () =>
  adminRequest("/admin/inventory", "Loading inventory");

export const updateAdminVariant = (variantId, updates) =>
  adminRequest(`/admin/inventory/variants/${variantId}`, "Updating variant", {
    method: "PATCH",
    body: JSON.stringify(updates),
  });

export const createAdminVariant = (productId, variant) =>
  adminRequest(`/admin/products/${productId}/variants`, "Adding variant", {
    method: "POST",
    body: JSON.stringify(variant),
  });

export const fetchAdminSales = (period, startDate, endDate) => {
  const query = new URLSearchParams({ period });
  if (startDate && endDate) {
    query.set("start_date", startDate);
    query.set("end_date", endDate);
  }
  return adminRequest(`/admin/sales?${query}`, "Loading sales");
};

export const fetchAdminSalesPeriods = (groupBy) =>
  adminRequest(`/admin/reports/sales?group_by=${groupBy}`, "Loading reports");

export const fetchAdminExpenses = ({ startDate, endDate, category } = {}) => {
  const query = new URLSearchParams();
  if (startDate) query.set("start_date", startDate);
  if (endDate) query.set("end_date", endDate);
  if (category) query.set("category", category);
  return adminRequest(`/admin/expenses${query.size ? `?${query}` : ""}`, "Loading expenses");
};

export const createAdminExpense = (expense) =>
  adminRequest("/admin/expenses", "Saving expense", {
    method: "POST",
    body: JSON.stringify(expense),
  });

export const updateAdminExpense = (expenseId, updates) =>
  adminRequest(`/admin/expenses/${expenseId}`, "Updating expense", {
    method: "PATCH",
    body: JSON.stringify(updates),
  });

export const deleteAdminExpense = (expenseId) =>
  adminRequest(`/admin/expenses/${expenseId}`, "Deleting expense", {
    method: "DELETE",
  });
