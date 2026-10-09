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
      </div>
      <p>© 2026 Samarth Gruh Udyog. {t("allRights")}</p>
    </footer>
  );
}

export default Footer;
