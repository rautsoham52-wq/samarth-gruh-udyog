import { QRCodeSVG } from "qrcode.react";
import "./admin.css";

function AdminQrCode() {
  const publicUrl = import.meta.env.VITE_PUBLIC_SITE_URL?.trim();
  let orderUrl = "";

  if (publicUrl) {
    try {
      const base = new URL(publicUrl);
      if (base.protocol === "https:" || base.hostname === "localhost") {
        orderUrl = new URL("/#menu", base).toString();
      }
    } catch {
      orderUrl = "";
    }
  }

  const downloadQr = () => {
    const svg = document.getElementById("navratri-order-qr");
    if (!(svg instanceof SVGSVGElement)) return;
    const content = new XMLSerializer().serializeToString(svg);
    const url = URL.createObjectURL(new Blob([content], { type: "image/svg+xml" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "navratri-bhoj-order-qr.svg";
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <section className="admin-panel">
      <div className="admin-page-heading"><div><p className="admin-eyebrow">CUSTOMER ORDERING</p><h1>Order QR Code</h1></div></div>
      <section className="admin-section admin-qr-card">
        {!orderUrl ? (
          <p className="admin-alert" role="alert">
            Set VITE_PUBLIC_SITE_URL to the confirmed production website URL and rebuild the frontend before generating the public QR code.
          </p>
        ) : <>
          <p>Scan this code to open the Samarth Gruh Udyog menu.</p>
          <div className="admin-qr-image"><QRCodeSVG id="navratri-order-qr" value={orderUrl} size={280} level="H" includeMargin /></div>
          <p className="admin-qr-url">{orderUrl}</p>
          <button className="admin-button" type="button" onClick={downloadQr}>Download QR (SVG)</button>
        </>}
      </section>
    </section>
  );
}

export default AdminQrCode;
