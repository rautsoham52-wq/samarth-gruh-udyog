import { useCustomerLanguage } from "../i18n/customerLanguageContext";

function Hero({ snackImage, onViewMenu }) {
const { t } = useCustomerLanguage();
return ( <main className="hero" id="home"> <div className="hero-content"> <p className="small-title">
✨ {t("festiveSpecial")} ✨ </p>

    <h1>
      {t("heroTitle")}
      <br />
      {t("madeWithLove")}
    </h1>

    <p className="description">
      {t("heroDescription")}
    </p>

    <button
      className="menu-button"
      onClick={onViewMenu}
    >
      {t("viewMenu")}
    </button>

    <p className="pickup-text">
      {t("pickupMessage")}
    </p>
  </div>

  <div className="hero-image">
    <img
      src={snackImage}
      alt="Navratri Snacks"
    />
  </div>
</main>

);
}

export default Hero;
