import { useCustomerLanguage } from "../i18n/customerLanguageContext";

function ProductDetails({
  product,
  selectedVariant,
  cartQuantity,
  onBack,
  onVariantChange,
  onIncrease,
  onDecrease,
  onAddToCart,
}) {
  const { t } = useCustomerLanguage();
  return (
    <section className="product-details">

      <button
        className="back-button"
        onClick={onBack}
      >
        ← {t("backToMenu")}
      </button>

      <div className="product-details-container">

        {/* Product Image */}

        <div className="product-details-image">

          <div className="large-placeholder" aria-label={`${product.name} image`}>
            {product.image || "🍘"}
          </div>

        </div>

        {/* Product Information */}

        <div className="product-details-content">

          <h2>
            {product.name}
          </h2>

          {/* Variants */}

          <h3 className="variant-title">
            {t("selectQuantity")}
          </h3>

          <div className="variant-buttons">

            {product.variants.map((variant) => (

              <button
                key={variant.quantity}
                className={
                  selectedVariant?.id === variant.id
                    ? "variant-button active"
                    : "variant-button"
                }
                onClick={() => onVariantChange(variant)}
                disabled={!variant.available}
              >
                <span>
                  {variant.quantity}
                </span>

                <strong>
                  ₹{variant.price}
                </strong>
                <small>
                  {variant.available
                    ? t("inStock", { count: variant.available_quantity })
                    : t("outOfStock")}
                </small>

              </button>

            ))}

          </div>

          {selectedVariant && !selectedVariant.available && (
            <p className="unavailable" role="status">
              {t("variantUnavailable")}
            </p>
          )}

          {/* Selected Price */}

          {selectedVariant && (

            <div className="selected-price">

              <span>
                {t("price")}
              </span>

              <strong>
                ₹{selectedVariant.price}
              </strong>

            </div>

          )}

          {/* Quantity */}

          <div className="cart-quantity">

            <span>
              {t("quantity")}
            </span>

            <div className="quantity-control">

              <button
                onClick={onDecrease}
              >
                −
              </button>

              <span>
                {cartQuantity}
              </span>

              <button
                onClick={onIncrease}
              >
                +
              </button>

            </div>

          </div>

          {/* Total */}

          {selectedVariant && (

            <div className="total-price">

              <span>
                {t("total")}
              </span>

              <strong>
                ₹{selectedVariant.price * cartQuantity}
              </strong>

            </div>

          )}

          {/* Add To Cart */}

          <button
            className="add-cart-button"
            disabled={
              !product.available ||
              !selectedVariant ||
              !selectedVariant.available
            }
            onClick={onAddToCart}
          >
            🛒 {t("addToCart")}
          </button>
        </div>
      </div>
    </section>
  );
}

export default ProductDetails;
