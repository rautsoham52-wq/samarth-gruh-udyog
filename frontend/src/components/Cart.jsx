import { useCustomerLanguage } from "../i18n/customerLanguageContext";

function Cart({
  cart,
  onBackToMenu,
  onIncrease,
  onDecrease,
  onRemove,
  onProceedToCheckout,
}) {
  const { t } = useCustomerLanguage();
  const subtotal = cart.reduce(
    (total, item) => total + item.unitPrice * item.quantity,
    0
  );

  return (
    <section className="cart-section">

      <div className="cart-container">

        <button
          className="back-button"
          onClick={onBackToMenu}
        >
          ← {t("backToMenu")}
        </button>

        <p className="small-title">
          {t("yourOrder")}
        </p>

        <h2>
          {t("shoppingCart")}
        </h2>

        {cart.length === 0 ? (

          <div className="empty-cart">
            <div className="empty-cart-icon">
              🛒
            </div>

            <h3>
              {t("emptyCartTitle")}
            </h3>

            <p>
              {t("emptyCartText")}
            </p>

            <button
              className="order-button"
              onClick={onBackToMenu}
            >
              {t("browseMenu")}
            </button>
          </div>

        ) : (

          <>

            <div className="cart-items">

              {cart.map((item) => (

                <div
                  className="cart-item"
                  key={`${item.productId}-${item.variant}`}
                >

                  <div className="cart-item-image">
                    {item.image}
                  </div>

                  <div className="cart-item-info">

                    <h3>
                      {item.name}
                    </h3>

                    <p>
                      {item.variant}
                    </p>

                    <strong>
                      ₹{item.unitPrice}
                    </strong>

                  </div>

                  <div className="cart-item-controls">

                    <div className="quantity-control">

                      <button
                        onClick={() =>
                          onDecrease(
                            item.productId,
                            item.variant
                          )
                        }
                      >
                        −
                      </button>

                      <span>
                        {item.quantity}
                      </span>

                      <button
                        onClick={() =>
                          onIncrease(
                            item.productId,
                            item.variant
                          )
                        }
                      >
                        +
                      </button>

                    </div>

                    <button
                      className="remove-button"
                      onClick={() =>
                        onRemove(
                          item.productId,
                          item.variant
                        )
                      }
                    >
                      {t("remove")}
                    </button>

                  </div>

                  <div className="cart-item-total">
                    ₹{item.unitPrice * item.quantity}
                  </div>

                </div>

              ))}

            </div>

            <div className="cart-summary">

              <div>
                <span>
                  {t("subtotal")}
                </span>

                <strong>
                  ₹{subtotal}
                </strong>
              </div>

              <p>
                {t("payAtShopMessage")}
              </p>

              <button
                className="checkout-button"
                onClick={onProceedToCheckout}
              >
                {t("proceedCheckout")}
              </button>

            </div>

          </>

        )}

      </div>

    </section>
  );
}

export default Cart;
