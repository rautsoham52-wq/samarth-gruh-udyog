import { useCustomerLanguage } from "../i18n/customerLanguageContext";

function Footer() {
  const { t } = useCustomerLanguage();
  return (
    <footer className="footer">
      <div className="footer-business">
        <strong>Samarth Gruh Udyog</strong>
        <span>{t("brandTagline")}</span>
        <div>
          <span>{t("dealer")}: Yogita Raut</span>
          <a href="tel:9923190367">9923190367</a>
          <a href="tel:9975002009">9975002009</a>
        </div>
        <div>
          <span>Golu Tambuskar · {t("businessContact")}</span>
          <a href="tel:8149148682">8149148682</a>
        </div>
        <address className="footer-address">
          8, Amar Nagar Road, Shivshakti Nagar No. 1, Saraswati Nagar,
          <br />
          House Name: Yeshvantarao Ujjainkar,
          <br />
          Hudkeshwar, Manewada, Nagpur, Maharashtra – 440034.
        </address>
        <a
          className="footer-directions"
          href="https://www.google.com/maps/dir/?api=1&destination=8%2C+Amar+Nagar+Road%2C+Shivshakti+Nagar+No.+1%2C+Saraswati+Nagar%2C+Yeshvantarao+Ujjainkar%2C+Hudkeshwar%2C+Manewada%2C+Nagpur%2C+Maharashtra+440034%2C+India"
          target="_blank"
          rel="noopener noreferrer"
        >
          📍 Get Directions
        </a>
      </div>
      <p>© 2026 Samarth Gruh Udyog. {t("allRights")}</p>
    </footer>
  );
}

export default Footer;
