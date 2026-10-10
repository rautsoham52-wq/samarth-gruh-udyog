```javascript
const API_BASE_URL = (
  import.meta.env.VITE_API_URL ||
  (import.meta.env.PROD
    ? "https://samarth-gruh-udyog.onrender.com"
    : "http://127.0.0.1:8000")
).replace(/\/+$/, "");

export class ApiError extends Error {
  constructor(status, message, data = null) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

async function apiRequest(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    credentials: "include",
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...options.headers,
    },
  });

  const contentType = response.headers.get("content-type") || "";
  const data = contentType.includes("application/json")
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    const message =
      typeof data === "object" && data !== null
        ? data.detail || data.message || "Request failed"
        : data || "Request failed";

    throw new ApiError(response.status, message, data);
  }

  return data;
}

export async function fetchProducts() {
  return apiRequest("/products");
}

export async function createOrder(orderData) {
  return apiRequest("/orders", {
    method: "POST",
    body: JSON.stringify(orderData),
  });
}

export async function fetchOrder(orderId) {
  return apiRequest(`/orders/${orderId}`);
}

export async function trackOrder(orderId) {
  return apiRequest(`/orders/${orderId}/track`);
}

export async function adminLogin(credentials) {
  return apiRequest("/admin/login", {
    method: "POST",
    body: JSON.stringify(credentials),
  });
}

export async function fetchCurrentAdmin() {
  return apiRequest("/admin/me");
}

export async function fetchAdminDashboard() {
  return apiRequest("/admin/dashboard");
}

export async function fetchAdminOrders() {
  return apiRequest("/admin/orders");
}

export async function fetchAdminOrder(orderId) {
  return apiRequest(`/admin/orders/${orderId}`);
}

export async function updateAdminOrderStatus(orderId, status) {
  return apiRequest(`/admin/orders/${orderId}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

export async function adminLogout() {
  return apiRequest("/admin/logout", {
    method: "POST",
  });
}

export async function adminRequest(path, options = {}) {
  return apiRequest(path, options);
}

export async function fetchAdminInventory() {
  return apiRequest("/admin/inventory");
}

export async function updateAdminVariant(variantId, variantData) {
  return apiRequest(`/admin/variants/${variantId}`, {
    method: "PATCH",
    body: JSON.stringify(variantData),
  });
}

export async function createAdminVariant(variantData) {
  return apiRequest("/admin/variants", {
    method: "POST",
    body: JSON.stringify(variantData),
  });
}

export async function fetchAdminSales() {
  return apiRequest("/admin/sales");
}

export async function fetchAdminSalesPeriods() {
  return apiRequest("/admin/sales/periods");
}

export async function fetchAdminExpenses() {
  return apiRequest("/admin/expenses");
}

export async function createAdminExpense(expenseData) {
  return apiRequest("/admin/expenses", {
    method: "POST",
    body: JSON.stringify(expenseData),
  });
}

export async function updateAdminExpense(expenseId, expenseData) {
  return apiRequest(`/admin/expenses/${expenseId}`, {
    method: "PATCH",
    body: JSON.stringify(expenseData),
  });
}

export async function deleteAdminExpense(expenseId) {
  return apiRequest(`/admin/expenses/${expenseId}`, {
    method: "DELETE",
  });
}
```
