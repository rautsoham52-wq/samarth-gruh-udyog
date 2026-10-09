import { useCallback, useEffect, useState } from "react";
import { trackOrder } from "../api";
import {
  customerStatusLabel,
  useCustomerLanguage,
} from "../i18n/customerLanguageContext";
import { LanguageSwitcher } from "../i18n/CustomerLanguage";

const STATUS_FLOW = ["NEW", "ACCEPTED", "PREPARING", "READY_FOR_PICKUP", "COMPLETED"];

function TrackOrder() {
  const { t } = useCustomerLanguage();
  const [orderNumber, setOrderNumber] = useState("");
  const [phone, setPhone] = useState("");
  const [order, setOrder] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const load = useCallback(async (showLoading = true) => {
    if (!orderNumber.trim() || !phone.trim()) return;
    if (showLoading) setLoading(true);
    try {
      setOrder(await trackOrder(orderNumber.trim(), phone.trim()));
      setError("");
    } catch (requestError) {
      if (showLoading) setOrder(null);
      setError(
        `${t("trackingError")} ${
          requestError instanceof Error ? requestError.message : String(requestError)
        }`
      );
    } finally {
      if (showLoading) setLoading(false);
    }
  }, [orderNumber, phone, t]);

  useEffect(() => {
    if (!order) return undefined;
    const timer = window.setInterval(() => load(false), 15000);
    return () => window.clearInterval(timer);
  }, [load, order]);

  const submit = (event) => {
    event.preventDefault();
    load();
  };

  const activeIndex = order ? STATUS_FLOW.indexOf(order.status) : -1;

  return (
    <main className="track-page">
      <div className="track-topbar">
        <a className="track-home-link" href="/">← Samarth Gruh Udyog</a>
        <LanguageSwitcher />
      </div>
      <section className="track-card">
        <p className="small-title">{t("orderUpdates")}</p>
        <h1>{t("trackHeading")}</h1>
        <p>{t("trackInstructions")}</p>
        <form onSubmit={submit} className="track-form">
          <label>{t("orderNumber")}<input value={orderNumber} onChange={(event) => setOrderNumber(event.target.value)} required maxLength="32" autoComplete="off" /></label>
          <label>{t("phoneNumber")}<input type="tel" inputMode="numeric" value={phone} onChange={(event) => setPhone(event.target.value)} required maxLength="16" autoComplete="tel" /></label>
          <button className="checkout-button" type="submit" disabled={loading}>{loading ? t("lookingUp") : t("trackButton")}</button>
        </form>
        {error && <p className="track-error" role="alert">{error}</p>}
        {order && <>
          <div className="track-order-heading"><h2>{order.order_number}</h2><strong>{customerStatusLabel(order.status, t)}</strong></div>
          <p>{t("pickup")}: {order.pickup_date} · {order.pickup_time.slice(0, 5)}</p>
          {order.status === "CANCELLED" ? <p className="track-cancelled">{t("cancelledOrder")}</p> : (
            <ol className="track-timeline">
              {STATUS_FLOW.map((status, index) => <li className={index <= activeIndex ? "track-step track-step-done" : "track-step"} key={status}><span>{index < activeIndex ? "✓" : index + 1}</span><div><strong>{customerStatusLabel(status, t)}</strong>{status === "NEW" && <small>{t("orderReceived")}</small>}</div></li>)}
            </ol>
          )}
          <h3>{t("items")}</h3>
          <ul className="track-items">{order.items.map((item, index) => <li key={`${item.product_id}-${item.variant}-${index}`}>{item.product_name} · {item.variant} × {item.quantity}</li>)}</ul>
        </>}
        <p className="track-payment">{t("paymentLabel")}</p>
      </section>
    </main>
  );
}

export default TrackOrder;
