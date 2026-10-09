import { useCustomerLanguage, customerStatusLabel } from "../i18n/customerLanguageContext";

function OrderConfirmation({ order, onBackToMenu, onViewCart }) {
  const { t } = useCustomerLanguage();
  return (
    <section className="checkout-section">
      <div className="confirmation-container">
        <p className="small-title">{t("orderConfirmation")}</p>
        <h2>🎉 {t("orderPlaced")}</h2>

        <div className="confirmation-order-id">
          <span>{t("orderId")}</span>
          <strong>{order.id}</strong>
        </div>

        <div className="confirmation-details">
          <p>
            <strong>{t("status")}:</strong> {customerStatusLabel(order.status, t)}
          </p>
          <p>
            <strong>{t("customer")}:</strong> {order.fullName}
          </p>
          <p>
            <strong>{t("pickup")}:</strong> {order.pickupDate} · {order.pickupTime}
          </p>
          <p>
            <strong>{t("paymentMethod")}:</strong> {t("paymentAtShop")}
          </p>
        </div>

        <h3>{t("orderedProducts")}</h3>
        <div className="confirmation-items">
          {order.items.map((item) => (
            <div
              className="checkout-summary-item"
              key={`${item.productId}-${item.variant}`}
            >
              <span>
                {item.name} · {item.variant} × {item.quantity}
              </span>
              <strong>₹{item.unitPrice * item.quantity}</strong>
            </div>
          ))}
        </div>

        <div className="checkout-total grand-total">
          <span>{t("totalAmount")}</span>
          <strong>₹{order.total}</strong>
        </div>

        <p className="confirmation-message">
          {t("collectWithOrderId")}
        </p>
        <p><a href="/track-order">{t("trackThisOrder")}</a></p>

        <div className="confirmation-actions">
          <button className="order-button" onClick={onBackToMenu}>
            {t("backToMenu")}
          </button>
          <button className="checkout-button" onClick={onViewCart}>
            {t("viewCart")}
          </button>
        </div>
      </div>
    </section>
  );
}

export default OrderConfirmation;
