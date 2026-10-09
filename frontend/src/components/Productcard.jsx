import { useCustomerLanguage } from "../i18n/customerLanguageContext";

function ProductCard({ product, onViewProduct }) {
const { t } = useCustomerLanguage();
const firstVariant =
  product.variants?.find((variant) => variant.available) ??
  product.variants?.[0];

return ( <div className="product-card"> <div className="product-placeholder" aria-label={`${product.name} image`}>
{product.image || "🍘"} </div>

  <h3>
    {product.name}
  </h3>

  <p className="product-price">
    <strong>
      {firstVariant ? `₹${firstVariant.price}` : t("priceUnavailable")}
    </strong>

    {firstVariant && ` / ${firstVariant.quantity}`}
  </p>

  {product.available && firstVariant && (
    <p className="availability-status">{t("available")}</p>
  )}

  {product.available && firstVariant ? (
    <button
      className="order-button"
      onClick={() => onViewProduct(product)}
    >
      {t("viewProduct")}
    </button>
  ) : (
    <p className="unavailable">
      {product.available ? t("priceUnavailable") : t("currentlyUnavailable")}
    </p>
  )}
</div>

);
}

export default ProductCard;
