import { useCallback, useEffect, useMemo, useState } from "react"
import { NavLink, useNavigate } from "react-router-dom"
import {
  LuArrowLeft,
  LuMapPin,
  LuMinus,
  LuPlus,
  LuShoppingBag,
  LuTrash2,
} from "react-icons/lu"
import {
  fetchCart,
  formatCartPrice,
  getCurrentUserId,
  parseCartListField,
  removeCartItem,
  updateCartItemQuantity,
} from "../../utils/cart"
import { getFunctionErrorMessage, openCashfreeCheckout } from "../../utils/cashfree"
import { isTimeoutError, withRequestTimeout } from "../../utils/request"
import { supabase } from "../../utils/supabase"
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
const PRODUCT_PLACEHOLDER_IMAGE = "/product-placeholder.svg"
const PRIORITY_CRAFTING_MULTIPLIER = 0.5
const FREE_STANDARD_SHIPPING_THRESHOLD = 100000

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
  const [isCheckingOut, setIsCheckingOut] = useState(false)
  const [addresses, setAddresses] = useState([])
  const [selectedAddressId, setSelectedAddressId] = useState("")
  const [addressesLoading, setAddressesLoading] = useState(false)
  const [addressesError, setAddressesError] = useState("")

  const loadCart = useCallback(async () => {
    setLoading(true)
    setErrorMessage("")

    try {
      const currentUserId = await withRequestTimeout(getCurrentUserId())
      setUserId(currentUserId)

      if (!currentUserId) {
        setOrder(null)
        setItems([])
        return
      }

      const cart = await withRequestTimeout(fetchCart(currentUserId))
      setOrder(cart.order)
      setItems(cart.items)
    } catch (error) {
      console.error("Cart load error:", error)
      setErrorMessage(
        isTimeoutError(error)
          ? "Your cart is taking too long to load. Please refresh in a moment."
          : "We could not load your cart right now."
      )
      setOrder(null)
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [])

  const loadAddresses = useCallback(async (currentUserId) => {
    if (!currentUserId) {
      setAddresses([])
      setSelectedAddressId("")
      return
    }

    setAddressesLoading(true)
    setAddressesError("")

    try {
      const { data, error } = await withRequestTimeout(supabase
        .from("user_addresses")
        .select("*")
        .eq("user_id", currentUserId)
        .order("is_default", { ascending: false })
        .order("created_at", { ascending: false }))

      if (error) throw error

      const savedAddresses = data || []
      setAddresses(savedAddresses)
      setSelectedAddressId((current) => {
        if (savedAddresses.some((address) => address.id === current)) return current

        return savedAddresses.find((address) => address.is_default)?.id || savedAddresses[0]?.id || ""
      })
    } catch (error) {
      console.error("Address load error:", error)
      setAddresses([])
      setSelectedAddressId("")
      setAddressesError(
        isTimeoutError(error)
          ? "Your saved addresses are taking too long to load."
          : "We could not load your saved addresses."
      )
    } finally {
      setAddressesLoading(false)
    }
  }, [])

  useEffect(() => {
    loadCart()
  }, [loadCart])

  useEffect(() => {
    loadAddresses(userId)
  }, [loadAddresses, userId])

  const subtotal = useMemo(
    () => items.reduce((sum, item) => sum + (item.quantity || 0) * (item.price || 0), 0),
    [items],
  )
  const hasFreeStandardShipping = subtotal >= FREE_STANDARD_SHIPPING_THRESHOLD
  const shipping = subtotal > 0
    ? shippingMethod === "standard" && hasFreeStandardShipping
      ? 0
      : SHIPPING_OPTIONS[shippingMethod].price
    : 0
  const insurance = hasInsurance && subtotal > 0 ? INSURANCE_AMOUNT : 0
  const craftingSpeedFee =
    craftingSpeed === "priority" ? Math.round(subtotal * PRIORITY_CRAFTING_MULTIPLIER) : 0
  const total = subtotal + shipping + insurance + craftingSpeedFee
  const selectedAddress = addresses.find((address) => address.id === selectedAddressId)

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

  const handleCheckout = async () => {
    if (!order?.id || isCheckingOut) return

    if (!selectedAddressId) {
      setErrorMessage("Please select a delivery address before checkout.")
      return
    }

    setIsCheckingOut(true)
    setErrorMessage("")

    try {
      const { data, error } = await withRequestTimeout(supabase.functions.invoke("create-cashfree-order", {
        body: {
          orderId: order.id,
          addressId: selectedAddressId,
          shippingMethod,
          hasInsurance,
          craftingSpeed,
        },
      }))

      if (error) {
        throw error
      }

      if (!data?.payment_session_id) {
        throw new Error("Cashfree did not return a payment session.")
      }

      await openCashfreeCheckout(data.payment_session_id)
    } catch (error) {
      console.error("Checkout error:", error)
      const functionMessage = await getFunctionErrorMessage(error)

      setErrorMessage(
        functionMessage ||
        "We could not start checkout. Please try again.",
      )
      setIsCheckingOut(false)
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
            <div className="cart-main-flow">
              <section className="cart-panel">
                <div className="cart-panel-heading">
                  <h2>Cart Items</h2>
                  <span>{items.length} item{items.length === 1 ? "" : "s"}</span>
                </div>

                <div className="cart-items" aria-label="Cart items">
                  {items.map((item) => {
                    const product = item.products || {}
                    const variant = item.product_variants || {}
                    const customUpload = item.custom_uploads?.[0]
                    const image = parseCartListField(variant.image_urls || variant.image_url)[0] || PRODUCT_PLACEHOLDER_IMAGE
                    const quantity = item.quantity || 1
                    const isBusy = busyItemId === item.id

                    return (
                      <article className="cart-item" key={item.id}>
                        <img src={image} alt={product.name || "Cart item"} />

                        <div className="cart-item-details">
                          <h3>{product.name || "Puchi Puchi figurine"}</h3>
                          {variant.name && <small>{variant.name}</small>}
                          {customUpload?.image_url && (
                            <a
                              className="cart-custom-reference"
                              href={customUpload.image_url}
                              target="_blank"
                              rel="noreferrer"
                            >
                              View uploaded reference
                            </a>
                          )}
                          {customUpload?.base_text && (
                            <span className="cart-custom-base">
                              {customUpload.custom_text_type === "name_plate" ? "Name plate" : "Name"}: {customUpload.base_text}
                              {customUpload.base_fee ? ` (+${formatCartPrice(customUpload.base_fee)})` : ""}
                            </span>
                          )}
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
              </section>

              <section className="cart-panel cart-address-panel">
                <div className="cart-panel-heading">
                  <h2>Delivery Address</h2>
                  <button type="button" onClick={() => navigate("/profile")}>
                    Manage Addresses
                  </button>
                </div>

                {addressesLoading && <p className="cart-inline-status">Loading saved addresses...</p>}
                {!addressesLoading && addressesError && <p className="cart-inline-status error">{addressesError}</p>}
                {!addressesLoading && !addressesError && addresses.length === 0 && (
                  <div className="cart-no-address">
                    <LuMapPin />
                    <div>
                      <h3>No saved addresses</h3>
                      <p>Add an address in your profile before checkout.</p>
                    </div>
                    <button type="button" onClick={() => navigate("/profile")}>
                      Add Address
                    </button>
                  </div>
                )}

                {!addressesLoading && !addressesError && addresses.length > 0 && (
                  <div className="cart-address-list" aria-label="Select delivery address">
                    {addresses.map((address) => {
                      const isSelected = selectedAddressId === address.id

                      return (
                        <label className={`cart-address-card ${isSelected ? "selected" : ""}`} key={address.id}>
                          <input
                            type="radio"
                            name="deliveryAddress"
                            checked={isSelected}
                            onChange={() => setSelectedAddressId(address.id)}
                          />
                          <span>
                            <strong>
                              {address.label || "Saved Address"}
                              {address.is_default && <em>Default</em>}
                            </strong>
                            <small>{address.full_name} - {address.phone}</small>
                            <small>
                              {address.address_line1}
                              {address.address_line2 ? `, ${address.address_line2}` : ""}
                            </small>
                            <small>{address.city}, {address.state} - {address.pincode}</small>
                          </span>
                        </label>
                      )
                    })}
                  </div>
                )}
              </section>

              <section className="cart-panel cart-preferences-panel">
                <div className="cart-panel-heading">
                  <h2>Delivery Options</h2>
                </div>

                <div className="cart-preference-grid">
                  <div className="cart-option-group">
                    <p className="cart-option-heading">Shipping Method</p>
                    <div className="cart-choice-grid">
                      {Object.entries(SHIPPING_OPTIONS).map(([key, option]) => {
                        const isFreeStandard = key === "standard" && hasFreeStandardShipping

                        return (
                          <button
                            key={key}
                            className={`cart-choice ${shippingMethod === key ? "selected" : ""}`}
                            type="button"
                            onClick={() => setShippingMethod(key)}
                          >
                            <span>
                              <strong>{option.label}</strong>
                              <small>{option.subtitle}</small>
                              {key === "standard" && (
                                <small className="cart-free-note">
                                  Free on cart items above {formatCartPrice(FREE_STANDARD_SHIPPING_THRESHOLD)}
                                </small>
                              )}
                            </span>
                            <em>
                              {isFreeStandard ? (
                                <>
                                  <s>{formatCartPrice(option.price)}</s>
                                  Free
                                </>
                              ) : (
                                formatCartPrice(option.price)
                              )}
                            </em>
                          </button>
                        )
                      })}
                    </div>
                  </div>

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
                          <small>Dispatches in 48 hours. Excludes Sundays.</small>
                        </span>
                        <em>
                          {craftingSpeed === "priority"
                            ? `+${formatCartPrice(craftingSpeedFee)}`
                            : "+50%"}
                        </em>
                      </button>
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
                      <small>Premium packaging plus a free replacement if anything breaks on the way.</small>
                    </span>
                    <em>+{formatCartPrice(INSURANCE_AMOUNT)}</em>
                  </label>
                </div>
              </section>
            </div>

            <aside className="cart-summary" aria-label="Order summary">
              <h2>Order Summary</h2>

              {selectedAddress && (
                <div className="cart-summary-address">
                  <span>Delivering to</span>
                  <strong>{selectedAddress.label || selectedAddress.full_name}</strong>
                  <small>{selectedAddress.city}, {selectedAddress.pincode}</small>
                </div>
              )}

              <div className="cart-summary-items">
                {items.map((item) => (
                  <div className="cart-summary-item" key={item.id}>
                    <span>{item.products?.name || "Puchi Puchi figurine"} x {item.quantity || 1}</span>
                    <strong>{formatCartPrice((item.quantity || 0) * (item.price || 0))}</strong>
                  </div>
                ))}
              </div>

              <div className="cart-summary-row">
                <span>Subtotal</span>
                <strong>{formatCartPrice(subtotal)}</strong>
              </div>
              <div className="cart-summary-row">
                <span>Shipping</span>
                <strong>{shipping === 0 && subtotal > 0 ? "Free" : formatCartPrice(shipping)}</strong>
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

              <button
                className="primary cart-checkout-button"
                type="button"
                onClick={handleCheckout}
                disabled={isCheckingOut || !selectedAddressId}
              >
                {isCheckingOut ? "Opening Checkout..." : "Proceed to Checkout"}
              </button>
              {!addressesLoading && !addressesError && addresses.length === 0 && (
                <p className="cart-checkout-address-message">
                  Add a delivery address before you proceed to checkout.
                </p>
              )}
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
