import { LanguageSwitcher } from "../i18n/CustomerLanguage";
import { useCustomerLanguage } from "../i18n/customerLanguageContext";

function Navbar({
  onMenuClick,
  onCartClick,
  cartItemCount,
}) {
  const { t } = useCustomerLanguage();
  return (
    <nav className="navbar">

      <div className="brand-lockup">
        <div className="logo">Samarth Gruh Udyog</div>
        <span className="brand-tagline">{t("brandTagline")}</span>
      </div>

      <div className="nav-links">

        <a href="#home">
          {t("home")}
        </a>

        <a
          href="#menu"
          onClick={onMenuClick}
        >
          {t("menu")}
        </a>

        <a href="#about">
          {t("about")}
        </a>

        <a href="#contact">
          {t("contact")}
        </a>

        <a href="/track-order">
          {t("trackOrder")}
        </a>

      </div>
      <button
        className="navbar-cart-button"
        onClick={onCartClick}
      >
        🛒 {t("cartCount", { count: cartItemCount })}
      </button>
      <LanguageSwitcher />

    </nav>
  );
}

export default Navbar;
