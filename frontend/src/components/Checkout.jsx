import { useState } from "react";
import { useCustomerLanguage } from "../i18n/customerLanguageContext";

function Checkout({
  cart,
  onBackToCart,
  onPlaceOrder,
  isSubmitting,
  submissionError,
}) {
  const { t } = useCustomerLanguage();
  const [customerDetails, setCustomerDetails] = useState({
    fullName: "",
    mobileNumber: "",
    pickupDate: "",
    pickupTime: "",
    instructions: "",
  });
  const [validationError, setValidationError] = useState("");

  const subtotal = cart.reduce(
    (total, item) => total + item.unitPrice * item.quantity,
    0
  );
  const today = new Date();
  const minimumPickupDate = [
    today.getFullYear(),
    String(today.getMonth() + 1).padStart(2, "0"),
    String(today.getDate()).padStart(2, "0"),
  ].join("-");

  const handleChange = (event) => {
    const { name, value } = event.target;
    setCustomerDetails((currentDetails) => ({
      ...currentDetails,
      [name]: value,
    }));
    setValidationError("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (isSubmitting) {
      return;
    }

    if (
      !customerDetails.fullName.trim() ||
      !/^[6-9]\d{9}$/.test(customerDetails.mobileNumber) ||
      !customerDetails.pickupDate ||
      customerDetails.pickupDate < minimumPickupDate ||
      !customerDetails.pickupTime
    ) {
      setValidationError(
        t("checkoutValidation")
      );
      return;
    }

    await onPlaceOrder({
      ...customerDetails,
      fullName: customerDetails.fullName.trim(),
    });
  };

  return (
    <section className="checkout-section">
      <div className="checkout-container">
        <button
          className="back-button"
          onClick={onBackToCart}
          disabled={isSubmitting}
        >
          ← {t("backToCart")}
        </button>

        <p className="small-title">{t("yourOrder")}</p>
        <h2>{t("checkout")}</h2>

        <div className="checkout-layout">
          <form className="checkout-form" onSubmit={handleSubmit} noValidate>
            <fieldset className="checkout-fieldset">
              <legend>{t("customerDetails")}</legend>

              <label>
                {t("fullName")}
                <input
                  name="fullName"
                  type="text"
                  autoComplete="name"
                  value={customerDetails.fullName}
                  onChange={handleChange}
                  required
                />
              </label>

              <label>
                {t("mobileNumber")}
                <input
                  name="mobileNumber"
                  type="tel"
                  inputMode="numeric"
                  autoComplete="tel"
                  maxLength={10}
                  value={customerDetails.mobileNumber}
                  onChange={handleChange}
                  required
                />
              </label>
            </fieldset>

            <fieldset className="checkout-fieldset">
              <legend>{t("pickupDetails")}</legend>

              <label>
                {t("pickupDate")}
                <input
                  name="pickupDate"
                  type="date"
                  min={minimumPickupDate}
                  value={customerDetails.pickupDate}
                  onChange={handleChange}
                  required
                />
              </label>

              <label>
                {t("pickupTime")}
                <input
                  name="pickupTime"
                  type="time"
                  value={customerDetails.pickupTime}
                  onChange={handleChange}
                  required
                />
              </label>
            </fieldset>

            <label className="checkout-instructions">
              {t("specialInstructions")}
              <textarea
                name="instructions"
                rows="4"
                value={customerDetails.instructions}
                onChange={handleChange}
              />
            </label>

            <div className="checkout-payment">
              <strong>{t("paymentAtShop")}</strong>
              <p>{t("paymentOnCollection")}</p>
            </div>

            {(validationError || submissionError) && (
              <p className="checkout-error" role="alert">
                {validationError || submissionError}
              </p>
            )}

            <button
              className="checkout-button"
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? t("placingOrder") : t("placeOrder")}
            </button>
          </form>

          <aside className="checkout-summary">
            <h3>{t("orderSummary")}</h3>

            {cart.map((item) => (
              <div
                className="checkout-summary-item"
                key={`${item.productId}-${item.variant}`}
              >
                <div>
                  <strong>{item.name}</strong>
                  <p>
                    {item.variant} × {item.quantity} · ₹{item.unitPrice} {t("each")}
                  </p>
                </div>
                <strong>₹{item.unitPrice * item.quantity}</strong>
              </div>
            ))}

            <div className="checkout-total">
              <span>{t("subtotal")}</span>
              <strong>₹{subtotal}</strong>
            </div>
            <div className="checkout-total grand-total">
              <span>{t("grandTotal")}</span>
              <strong>₹{subtotal}</strong>
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}

export default Checkout;
