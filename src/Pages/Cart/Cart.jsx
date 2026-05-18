import { useCallback, useEffect, useMemo, useState } from "react"
import { NavLink, useNavigate } from "react-router-dom"
import { LuArrowLeft, LuMinus, LuPlus, LuShoppingBag, LuTrash2 } from "react-icons/lu"
import {
  fetchCart,
  formatCartPrice,
  getCurrentUserId,
  removeCartItem,
  updateCartItemQuantity,
} from "../../utils/cart"
import "./cart.css"

const SHIPPING_OPTIONS = {
  standard: {
    label: "Standard Delivery",
    subtitle: "3-6 days",
    price: 8000,
  },
  priority: {
    label: "Priority Delivery",
    subtitle: "2-3 days",
    price: 20000,
  },
}

const INSURANCE_AMOUNT = 10000
const PRIORITY_CRAFTING_MULTIPLIER = 0.5

function Cart() {
  const navigate = useNavigate()
  const [userId, setUserId] = useState(null)
  const [order, setOrder] = useState(null)
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [busyItemId, setBusyItemId] = useState("")
  const [errorMessage, setErrorMessage] = useState("")
  const [shippingMethod, setShippingMethod] = useState("standard")
  const [hasInsurance, setHasInsurance] = useState(false)
  const [craftingSpeed, setCraftingSpeed] = useState("standard")

  const loadCart = useCallback(async () => {
    setLoading(true)
    setErrorMessage("")

    try {
      const currentUserId = await getCurrentUserId()
      setUserId(currentUserId)

      if (!currentUserId) {
        setOrder(null)
        setItems([])
        return
      }

      const cart = await fetchCart(currentUserId)
      setOrder(cart.order)
      setItems(cart.items)
    } catch (error) {
      console.error("Cart load error:", error)
      setErrorMessage("We could not load your cart right now.")
      setOrder(null)
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadCart()
  }, [loadCart])

  const subtotal = useMemo(
    () => items.reduce((sum, item) => sum + (item.quantity || 0) * (item.price || 0), 0),
    [items],
  )
  const shipping = subtotal > 0 ? SHIPPING_OPTIONS[shippingMethod].price : 0
  const insurance = hasInsurance && subtotal > 0 ? INSURANCE_AMOUNT : 0
  const craftingSpeedFee =
    craftingSpeed === "priority" ? Math.round(subtotal * PRIORITY_CRAFTING_MULTIPLIER) : 0
  const total = subtotal + shipping + insurance + craftingSpeedFee

  const handleQuantityChange = async (item, nextQuantity) => {
    if (!order?.id || busyItemId) return

    setBusyItemId(item.id)
    setErrorMessage("")

    try {
      await updateCartItemQuantity({
        itemId: item.id,
        orderId: order.id,
        quantity: nextQuantity,
      })
      await loadCart()
    } catch (error) {
      console.error("Cart quantity error:", error)
      setErrorMessage("We could not update that item.")
    } finally {
      setBusyItemId("")
    }
  }

  const handleRemoveItem = async (item) => {
    if (!order?.id || busyItemId) return

    setBusyItemId(item.id)
    setErrorMessage("")

    try {
      await removeCartItem({
        itemId: item.id,
        orderId: order.id,
      })
      await loadCart()
    } catch (error) {
      console.error("Cart remove error:", error)
      setErrorMessage("We could not remove that item.")
    } finally {
      setBusyItemId("")
    }
  }

  return (
    <main className="cart-page">
      <section className="cart-section">
        <NavLink to="/shop" className="cart-back-link">
          <LuArrowLeft /> Continue Shopping
        </NavLink>

        <h1>Your Cart</h1>

        {loading && <p className="cart-status">Loading your cart...</p>}

        {!loading && !userId && (
          <div className="cart-empty">
            <LuShoppingBag />
            <h2>Log in to view your cart</h2>
            <p>Your saved items live with your Puchi Puchi account.</p>
            <button className="primary" type="button" onClick={() => navigate("/profile")}>
              Log In
            </button>
          </div>
        )}

        {!loading && userId && items.length === 0 && (
          <div className="cart-empty">
            <LuShoppingBag />
            <h2>Your cart is empty</h2>
            <p>Find a tiny handmade friend and bring them here.</p>
            <NavLink to="/shop" className="cart-shop-link">
              Shop Figurines
            </NavLink>
          </div>
        )}

        {!loading && userId && items.length > 0 && (
          <div className="cart-grid">
            <div className="cart-items" aria-label="Cart items">
              {items.map((item) => {
                const product = item.products || {}
                const variant = item.product_variants || {}
                const image = variant.image_url || "https://via.placeholder.com/160"
                const quantity = item.quantity || 1
                const isBusy = busyItemId === item.id

                return (
                  <article className="cart-item" key={item.id}>
                    <img src={image} alt={product.name || "Cart item"} />

                    <div className="cart-item-details">
                      <h3>{product.name || "Puchi Puchi figurine"}</h3>
                      {variant.name && <small>{variant.name}</small>}
                      <p>{formatCartPrice(item.price)}</p>

                      <div className="cart-quantity-stepper" aria-label="Quantity selector">
                        <button
                          type="button"
                          aria-label="Decrease quantity"
                          onClick={() => handleQuantityChange(item, quantity - 1)}
                          disabled={isBusy}
                        >
                          <LuMinus />
                        </button>
                        <strong>{quantity}</strong>
                        <button
                          type="button"
                          aria-label="Increase quantity"
                          onClick={() => handleQuantityChange(item, quantity + 1)}
                          disabled={isBusy}
                        >
                          <LuPlus />
                        </button>
                      </div>
                    </div>

                    <button
                      className="cart-remove-button"
                      type="button"
                      aria-label="Remove item"
                      onClick={() => handleRemoveItem(item)}
                      disabled={isBusy}
                    >
                      <LuTrash2 />
                    </button>
                  </article>
                )
              })}
            </div>

            <aside className="cart-summary" aria-label="Order summary">
              <h2>Order Summary</h2>

              <div className="cart-option-group">
                <p className="cart-option-heading">Shipping Method</p>
                <div className="cart-choice-grid">
                  {Object.entries(SHIPPING_OPTIONS).map(([key, option]) => (
                    <button
                      key={key}
                      className={`cart-choice ${shippingMethod === key ? "selected" : ""}`}
                      type="button"
                      onClick={() => setShippingMethod(key)}
                    >
                      <span>
                        <strong>{option.label}</strong>
                        <small>{option.subtitle}</small>
                      </span>
                      <em>{formatCartPrice(option.price)}</em>
                    </button>
                  ))}
                </div>
              </div>

              <label className={`cart-addon ${hasInsurance ? "selected" : ""}`}>
                <input
                  type="checkbox"
                  checked={hasInsurance}
                  onChange={(event) => setHasInsurance(event.target.checked)}
                />
                <span>
                  <strong>The Puchi Armor Guarantee</strong>
                  <small>
                    Upgrades your box to premium expanding foam packaging. Includes a
                    no-questions-asked free replacement if anything breaks on the way to
                    its new home.
                  </small>
                </span>
                <em>+{formatCartPrice(INSURANCE_AMOUNT)}</em>
              </label>

              <div className="cart-option-group">
                <p className="cart-option-heading">Crafting Speed</p>
                <p className="cart-option-subtitle">Production</p>
                <div className="cart-choice-grid">
                  <button
                    className={`cart-choice ${craftingSpeed === "standard" ? "selected" : ""}`}
                    type="button"
                    onClick={() => setCraftingSpeed("standard")}
                  >
                    <span>
                      <strong>Standard Crafting</strong>
                      <small>Dispatches in 5 working days</small>
                    </span>
                    <em>Free</em>
                  </button>
                  <button
                    className={`cart-choice ${craftingSpeed === "priority" ? "selected" : ""}`}
                    type="button"
                    onClick={() => setCraftingSpeed("priority")}
                  >
                    <span>
                      <strong>Puchi Priority Queue</strong>
                      <small>
                        Dispatches in 48 hours. Skip the line! Your custom figure gets
                        printed and painted first. Excludes Sundays.
                      </small>
                    </span>
                    <em>
                      {craftingSpeed === "priority"
                        ? `+${formatCartPrice(craftingSpeedFee)}`
                        : "+50%"}
                    </em>
                  </button>
                </div>
              </div>

              <div className="cart-summary-row">
                <span>Subtotal</span>
                <strong>{formatCartPrice(subtotal)}</strong>
              </div>
              <div className="cart-summary-row">
                <span>Shipping</span>
                <strong>{formatCartPrice(shipping)}</strong>
              </div>
              <div className="cart-summary-row">
                <span>Armor Guarantee</span>
                <strong>{insurance > 0 ? formatCartPrice(insurance) : "Not added"}</strong>
              </div>
              <div className="cart-summary-row">
                <span>Crafting Speed</span>
                <strong>{craftingSpeedFee > 0 ? formatCartPrice(craftingSpeedFee) : "Free"}</strong>
              </div>
              <div className="cart-summary-total">
                <span>Total</span>
                <strong>{formatCartPrice(total)}</strong>
              </div>

              <button className="primary cart-checkout-button" type="button">
                Proceed to Checkout
              </button>
              <p>Secure checkout | India-wide shipping</p>
            </aside>
          </div>
        )}

        {errorMessage && <p className="cart-error">{errorMessage}</p>}
      </section>
    </main>
  )
}

export default Cart
