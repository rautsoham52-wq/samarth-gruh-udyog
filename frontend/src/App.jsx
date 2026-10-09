import { useEffect, useState } from "react";
import "./App.css";

import snackImage from "./assets/navratri-snacks.jpg";

import { createOrder, fetchProducts } from "./api";

import Navbar from "./components/Navbar";
import Hero from "./components/hero";
import ProductCard from "./components/Productcard";
import ProductDetails from "./components/Productdetails";
import Footer from "./components/Footer";
import Cart from "./components/Cart";
import Checkout from "./components/Checkout";
import OrderConfirmation from "./components/OrderConfirmation";
import AdminLogin from "./pages/AdminLogin";
import AdminLayout from "./pages/AdminLayout";
import AdminPage from "./pages/AdminPage";
import AdminOrders from "./pages/AdminOrders";
import AdminOrderDetail from "./pages/AdminOrderDetail";
import AdminInventory from "./pages/AdminInventory";
import AdminExpenses from "./pages/AdminExpenses";
import AdminSales from "./pages/AdminSales";
import TrackOrder from "./pages/TrackOrder";
import AdminQrCode from "./pages/AdminQrCode";
import { useCustomerLanguage } from "./i18n/customerLanguageContext";

function App() {
  const { t } = useCustomerLanguage();
  const [products, setProducts] = useState([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [productsError, setProductsError] = useState("");
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [cartQuantity, setCartQuantity] = useState(1);

  const [cart, setCart] = useState([]);

  const [showCart, setShowCart] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [showOrderConfirmation, setShowOrderConfirmation] = useState(false);
  const [placedOrder, setPlacedOrder] = useState(null);
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);
  const [orderSubmissionError, setOrderSubmissionError] = useState("");

  useEffect(() => {
    let isMounted = true;

    fetchProducts()
      .then((apiProducts) => {
        if (!isMounted) {
          return;
        }

        setProducts(
          apiProducts.map((product) => {
            return {
              ...product,
              variants: product.variants
                .filter((variant) => variant.is_available)
                .map((variant) => ({
                  ...variant,
                  quantity: variant.name,
                  price: Number(variant.selling_price),
                  available:
                    product.is_available &&
                    variant.available_quantity > 0,
                })),
              available:
                product.is_available &&
                product.variants.some(
                  (variant) => variant.is_available && variant.available_quantity > 0
                ),
            };
          })
        );
        setProductsError("");
      })
      .catch(() => {
        if (isMounted) {
          setProductsError(true);
        }
      })
      .finally(() => {
        if (isMounted) {
          setProductsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const handleViewProduct = (product) => {
    setShowCart(false);

    setSelectedProduct(product);
    setSelectedVariant(
      product.variants.find((variant) => variant.available) ?? product.variants[0]
    );
    setCartQuantity(1);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  const handleBackToMenu = () => {
    setShowCart(false);
    setShowCheckout(false);
    setShowOrderConfirmation(false);
    setSelectedProduct(null);
    setSelectedVariant(null);
    setCartQuantity(1);

    setTimeout(() => {
      document.getElementById("menu")?.scrollIntoView({
        behavior: "smooth",
      });
    }, 50);
  };

  const handleMenuClick = () => {
    setShowCart(false);
    setShowCheckout(false);
    setShowOrderConfirmation(false);
    setSelectedProduct(null);
    setSelectedVariant(null);

    setTimeout(() => {
      document.getElementById("menu")?.scrollIntoView({
        behavior: "smooth",
      });
    }, 50);
  };

  const handleViewMenu = () => {
    setShowCart(false);
    setShowCheckout(false);
    setShowOrderConfirmation(false);
    setSelectedProduct(null);

    setTimeout(() => {
      document.getElementById("menu")?.scrollIntoView({
        behavior: "smooth",
      });
    }, 50);
  };

  const increaseQuantity = () => {
    setCartQuantity((currentQuantity) => currentQuantity + 1);
  };

  const decreaseQuantity = () => {
    setCartQuantity((currentQuantity) => {
      if (currentQuantity > 1) {
        return currentQuantity - 1;
      }

      return currentQuantity;
    });
  };

  const handleAddToCart = () => {
    if (!selectedProduct || !selectedVariant) {
      return;
    }

    const productId = selectedProduct.id;

    setCart((currentCart) => {
      const existingItemIndex = currentCart.findIndex(
        (item) =>
          item.productId === productId &&
          item.variantId === selectedVariant.id
      );

      if (existingItemIndex !== -1) {
        return currentCart.map((item, index) => {
          if (index === existingItemIndex) {
            return {
              ...item,
              quantity: item.quantity + cartQuantity,
            };
          }

          return item;
        });
      }

      return [
        ...currentCart,
        {
          productId: selectedProduct.id,
          variantId: selectedVariant.id,
          name: selectedProduct.name,
          image: selectedProduct.image,
          variant: selectedVariant.quantity,
          unitPrice: selectedVariant.price,
          quantity: cartQuantity,
        },
      ];
    });

    setSelectedProduct(null);
    setSelectedVariant(null);
    setCartQuantity(1);
    setShowCheckout(false);
    setShowOrderConfirmation(false);
    setShowCart(true);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  const handleCartIncrease = (productId, variant) => {
    setCart((currentCart) =>
      currentCart.map((item) => {
        if (
          item.productId === productId &&
          item.variant === variant
        ) {
          return {
            ...item,
            quantity: item.quantity + 1,
          };
        }

        return item;
      })
    );
  };

  const handleCartDecrease = (productId, variant) => {
    setCart((currentCart) =>
      currentCart.map((item) => {
        if (
          item.productId === productId &&
          item.variant === variant
        ) {
          return {
            ...item,
            quantity: Math.max(1, item.quantity - 1),
          };
        }

        return item;
      })
    );
  };

  const handleCartRemove = (productId, variant) => {
    setCart((currentCart) =>
      currentCart.filter(
        (item) =>
          !(
            item.productId === productId &&
            item.variant === variant
          )
      )
    );
  };

  const handleOpenCart = () => {
    setSelectedProduct(null);
    setSelectedVariant(null);
    setShowCheckout(false);
    setShowOrderConfirmation(false);
    setShowCart(true);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  const handleProceedToCheckout = () => {
    if (cart.length === 0) {
      return;
    }

    setShowCart(false);
    setShowOrderConfirmation(false);
    setShowCheckout(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleBackToCart = () => {
    setShowCheckout(false);
    setShowCart(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handlePlaceOrder = async (customerDetails) => {
    if (cart.length === 0) {
      return;
    }

    setIsSubmittingOrder(true);
    setOrderSubmissionError("");

    try {
      const order = await createOrder({
        customer_name: customerDetails.fullName,
        customer_phone: customerDetails.mobileNumber,
        pickup_date: customerDetails.pickupDate,
        pickup_time: customerDetails.pickupTime,
        special_instructions: customerDetails.instructions || null,
        items: cart.map((item) => ({
          product_id: item.productId,
          variant_id: item.variantId,
          quantity: item.quantity,
        })),
      });

      setPlacedOrder({
        id: order.order_number,
        fullName: order.customer_name,
        customerPhone: customerDetails.mobileNumber,
        status: order.status,
        pickupDate: order.pickup_date,
        pickupTime: order.pickup_time.slice(0, 5),
        paymentMethod: "Pay at Shop",
        items: order.items.map((item) => ({
          productId: item.product_id,
          name: item.product_name,
          image: item.product_image,
          variant: item.variant,
          quantity: item.quantity,
          unitPrice: Number(item.unit_price),
        })),
        total: Number(order.total_amount),
      });
      setShowCheckout(false);
      setShowCart(false);
      setShowOrderConfirmation(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (error) {
      setOrderSubmissionError(
        error instanceof Error ? error.message : String(error)
      );
    } finally {
      setIsSubmittingOrder(false);
    }
  };

  const handleViewCartFromConfirmation = () => {
    setShowOrderConfirmation(false);
    setShowCheckout(false);
    setShowCart(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const totalCartItems = cart.reduce(
    (total, item) => total + item.quantity,
    0
  );

  const pathname = window.location.pathname;

  if (pathname === "/admin/login") {
    return <AdminLogin />;
  }

  if (pathname === "/admin" || pathname === "/admin/") {
    return <AdminLayout><AdminPage /></AdminLayout>;
  }

  if (pathname === "/admin/orders") {
    return <AdminLayout><AdminOrders /></AdminLayout>;
  }

  if (pathname === "/admin/inventory") {
    return <AdminLayout><AdminInventory /></AdminLayout>;
  }

  if (pathname === "/admin/expenses") {
    return <AdminLayout><AdminExpenses /></AdminLayout>;
  }

  if (pathname === "/admin/sales") {
    return <AdminLayout><AdminSales /></AdminLayout>;
  }

  if (pathname === "/admin/qr") {
    return <AdminLayout><AdminQrCode /></AdminLayout>;
  }

  const orderDetailMatch = pathname.match(/^\/admin\/orders\/([^/]+)$/);
  if (orderDetailMatch) {
    return (
      <AdminLayout>
        <AdminOrderDetail orderNumber={decodeURIComponent(orderDetailMatch[1])} />
      </AdminLayout>
    );
  }

  if (pathname.startsWith("/admin")) {
    window.location.replace("/admin");
    return null;
  }

  if (pathname === "/track-order") {
    return <TrackOrder />;
  }

  return (
    <div className="home">

      <Navbar
        onMenuClick={handleMenuClick}
        onCartClick={handleOpenCart}
        cartItemCount={totalCartItems}
      />

      {!selectedProduct && !showCart && !showCheckout && !showOrderConfirmation && (
        <>
          <Hero
            snackImage={snackImage}
            onViewMenu={handleViewMenu}
          />

          <section
            className="menu-section"
            id="menu"
          >
            <p className="small-title">
              {t("ourSpecials")}
            </p>

            <h2>
              {t("festiveSnacks")}
            </h2>

            <p className="menu-description">
              {t("menuDescription")}
            </p>

            {productsLoading ? (
              <p className="menu-description" role="status">
                {t("loadingProducts")}
              </p>
            ) : productsError ? (
              <p className="menu-description" role="alert">
                {t("menuLoadError")}
              </p>
            ) : products.length === 0 ? (
              <p className="menu-description">
                {t("emptyCatalog")}
              </p>
            ) : (
              <div className="product-grid">
                {products.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    onViewProduct={handleViewProduct}
                  />
                ))}
              </div>
            )}
          </section>
        </>
      )}

      {selectedProduct && (
        <ProductDetails
          product={selectedProduct}
          selectedVariant={selectedVariant}
          cartQuantity={cartQuantity}
          onBack={handleBackToMenu}
          onVariantChange={setSelectedVariant}
          onIncrease={increaseQuantity}
          onDecrease={decreaseQuantity}
          onAddToCart={handleAddToCart}
        />
      )}

      {showCart && (
        <Cart
          cart={cart}
          onBackToMenu={handleBackToMenu}
          onIncrease={handleCartIncrease}
          onDecrease={handleCartDecrease}
          onRemove={handleCartRemove}
          onProceedToCheckout={handleProceedToCheckout}
        />
      )}

      {showCheckout && (
        <Checkout
          cart={cart}
          onBackToCart={handleBackToCart}
          onPlaceOrder={handlePlaceOrder}
          isSubmitting={isSubmittingOrder}
          submissionError={
            orderSubmissionError
              ? `${t("orderError")} ${orderSubmissionError}`
              : ""
          }
        />
      )}

      {showOrderConfirmation && placedOrder && (
        <OrderConfirmation
          order={placedOrder}
          onBackToMenu={handleBackToMenu}
          onViewCart={handleViewCartFromConfirmation}
        />
      )}

      {!showCart && !showCheckout && !showOrderConfirmation && (
        <>
          <section
            className="about-section"
            id="about"
          >
            <p className="small-title">
              {t("aboutUs")}
            </p>

            <h2>
              {t("aboutHeading")}
            </h2>

            <p>
              {t("aboutCopy")}
            </p>
          </section>

          <section
            className="contact-section"
            id="contact"
          >
            <p className="small-title">
              {t("contactUs")}
            </p>

            <h2>
              {t("contactHeading")}
            </h2>

            <p>
              {t("pickupMessage")}
            </p>
          </section>
        </>
      )}

      <Footer />
    </div>
  );
}

export default App;
