import { useCallback, useEffect, useMemo, useState } from "react";
import {
  LuBox,
  LuCircleCheck,
  LuHeart,
  LuLogOut,
  LuMapPin,
  LuPackageCheck,
  LuPalette,
  LuPrinter,
  LuSettings,
  LuSparkles,
  LuTruck,
  LuUser,
  LuWandSparkles,
} from "react-icons/lu";
import { NavLink, useNavigate } from "react-router-dom";
import { formatCartPrice, parseCartListField } from "../../utils/cart";
import { isTimeoutError, withRequestTimeout } from "../../utils/request";
import { supabase } from "../../utils/supabase";
import "./profile.css";

const ORDER_STEPS = [
  { key: "paid", label: "Order Locked In", icon: LuCircleCheck },
  { key: "modeling", label: "Magic Modelling", icon: LuWandSparkles },
  { key: "printing", label: "Printing", icon: LuPrinter },
  { key: "curing", label: "Curing", icon: LuSparkles },
  { key: "painting", label: "Paint Studio", icon: LuPalette },
  { key: "finishing", label: "Final Touches", icon: LuPackageCheck },
  { key: "ready", label: "Ready to Ship", icon: LuTruck },
];

const STAGE_BY_STATUS = {
  paid: 0,
  confirmed: 0,
  "order locked in": 0,
  modeling: 1,
  "magic modelling": 1,
  printing: 2,
  curing: 3,
  painting: 4,
  "paint studio": 4,
  finishing: 5,
  "final touches": 5,
  ready: 6,
  "ready to ship": 6,
  shipped: 6,
  delivered: 6,
};

const PROFILE_TABS = [
  { key: "orders", label: "My Orders", icon: LuBox },
  { key: "wishlist", label: "Wishlist", icon: LuHeart },
  { key: "addresses", label: "Addresses", icon: LuMapPin },
  { key: "settings", label: "Settings", icon: LuSettings },
];

const formatOrderDate = (value) => {
  if (!value) return "Recently";

  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
};

const getItemStageIndex = (item, order) => {
  const status = String(
    item.production_stage || item.stage || item.status || order.status || "paid",
  ).toLowerCase();

  return STAGE_BY_STATUS[status] ?? 0;
};

function ItemProgress({ item, order }) {
  const stageIndex = getItemStageIndex(item, order);
  const status = String(item.status || order.status || "paid").toLowerCase();
  const isDelivered = status === "delivered";

  return (
    <div className="profile-item-progress" aria-label="Item production progress">
      <div className="profile-progress-line" />
      {ORDER_STEPS.map((step, index) => {
        const Icon = step.icon;
        const isDone = index <= stageIndex;

        return (
          <div className="profile-progress-step" key={step.key}>
            <span className={isDone ? "complete" : ""}>
              <Icon />
            </span>
            <small>{step.label}</small>
          </div>
        );
      })}
      <p className={isDelivered ? "profile-delivered" : "profile-current-stage"}>
        {isDelivered ? "Delivered successfully" : ORDER_STEPS[stageIndex].label}
      </p>
    </div>
  );
}

function OrdersTab({ orders, loading, error }) {
  if (loading) {
    return <p className="profile-state-card">Loading your orders...</p>;
  }

  if (error) {
    return <p className="profile-state-card text-error">{error}</p>;
  }

  if (orders.length === 0) {
    return (
      <div className="profile-empty-state">
        <LuBox />
        <h3>No orders yet</h3>
        <p>Your handmade chibi orders will appear here once checkout is complete.</p>
        <NavLink to="/shop">Shop Figurines</NavLink>
      </div>
    );
  }

  return (
    <div className="profile-orders-list">
      {orders.map((order) => (
        <article className="profile-order-card" key={order.id}>
          <header className="profile-order-header">
            <div>
              <strong>#{order.id.slice(0, 8).toUpperCase()}</strong>
              <span>{formatOrderDate(order.created_at)}</span>
            </div>
            <em>{order.status || "confirmed"}</em>
          </header>

          <div className="profile-order-items">
            {(order.order_items || []).map((item) => {
              const product = item.products || {};
              const variant = item.product_variants || {};
              const customUpload = item.custom_uploads?.[0];
              const image = parseCartListField(variant.image_urls || variant.image_url)[0] || "https://via.placeholder.com/160";
              const itemTotal = (item.quantity || 0) * (item.price || 0);

              return (
                <section className="profile-order-item" key={item.id}>
                  <ItemProgress item={item} order={order} />

                  <div className="profile-order-item-row">
                    <img src={image} alt={product.name || "Puchi Puchi order item"} />
                    <div>
                      <h3>{product.name || "Puchi Puchi figurine"}</h3>
                      <p>
                        Qty: {item.quantity || 1}
                        {variant.name ? ` - ${variant.name}` : ""}
                      </p>
                      {customUpload?.image_url && (
                        <a href={customUpload.image_url} target="_blank" rel="noreferrer">
                          View uploaded reference
                        </a>
                      )}
                    </div>
                    <strong>{formatCartPrice(itemTotal)}</strong>
                  </div>
                </section>
              );
            })}
          </div>

          <footer className="profile-order-footer">
            <span>Total</span>
            <strong>{formatCartPrice(order.total_amount)}</strong>
          </footer>
        </article>
      ))}
    </div>
  );
}

function Profile({ user, profile, onProfileUpdated }) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("orders");
  const [firstName, setFirstName] = useState(profile?.first_name ?? "");
  const [lastName, setLastName] = useState(profile?.last_name ?? "");
  const [phone, setPhone] = useState(profile?.phone ?? "");
  const [saveError, setSaveError] = useState("");
  const [saveSuccess, setSaveSuccess] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [ordersError, setOrdersError] = useState("");

  useEffect(() => {
    setFirstName(profile?.first_name ?? "");
    setLastName(profile?.last_name ?? "");
    setPhone(profile?.phone ?? "");
  }, [profile?.first_name, profile?.last_name, profile?.phone]);

  const displayName = useMemo(() => (
    `${profile?.first_name ?? firstName} ${profile?.last_name ?? lastName}`.trim() ||
    user.user_metadata?.full_name ||
    "Your profile"
  ), [firstName, lastName, profile?.first_name, profile?.last_name, user.user_metadata?.full_name]);

  const loadOrders = useCallback(async () => {
    setOrdersLoading(true);
    setOrdersError("");

    try {
      const { data, error } = await withRequestTimeout(supabase
        .from("orders")
        .select(`
          id,
          total_amount,
          status,
          created_at,
          order_items (
            *,
            products (
              id,
              name,
              category
            ),
            product_variants (
              *
            ),
            custom_uploads (
              id,
              image_url,
              status,
              notes
            )
          )
        `)
        .eq("user_id", user.id)
        .neq("status", "pending")
        .order("created_at", { ascending: false }));

      if (error) throw error;

      setOrders(data || []);
    } catch (error) {
      console.error("Profile orders error:", error);
      setOrders([]);
      setOrdersError(
        isTimeoutError(error)
          ? "Your orders are taking too long to load. Please refresh in a moment."
          : "We could not load your orders right now.",
      );
    } finally {
      setOrdersLoading(false);
    }
  }, [user.id]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaveError("");
    setSaveSuccess("");
    setIsSaving(true);

    const updates = {
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      phone: phone.trim(),
    };

    const { data, error } = await supabase
      .from("profiles")
      .update(updates)
      .eq("id", user.id)
      .select()
      .single();

    if (error) {
      setSaveError(error.message);
      setIsSaving(false);
      return;
    }

    onProfileUpdated?.(data);
    setSaveSuccess("Profile saved.");
    setIsSaving(false);
  };

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();

    if (!error) {
      navigate("/");
    }
  };

  return (
    <main className="profile-page">
      <section className="profile-shell">
        <header className="profile-hero">
          <h1>My Account <span aria-hidden="true">✨</span></h1>
          <p>Welcome back, {displayName.split(" ")[0] || "friend"}!</p>
        </header>

        <div className="profile-layout">
          <aside className="profile-sidebar">
            <div className="profile-summary">
              <span className="profile-avatar">
                <LuUser />
              </span>
              <strong>{displayName}</strong>
              <p>{user.email}</p>
            </div>

            <nav className="profile-nav" aria-label="Profile sections">
              {PROFILE_TABS.map((item) => {
                const Icon = item.icon;

                return (
                  <button
                    className={activeTab === item.key ? "active" : ""}
                    type="button"
                    key={item.key}
                    onClick={() => setActiveTab(item.key)}
                  >
                    <Icon />
                    <span>{item.label}</span>
                  </button>
                );
              })}
              <button type="button" className="profile-logout" onClick={handleLogout}>
                <LuLogOut />
                <span>Log Out</span>
              </button>
            </nav>
          </aside>

          <div className="profile-panel">
            {activeTab === "orders" && (
              <>
                <div className="profile-panel-heading">
                  <h2>My Orders</h2>
                  <span>{orders.length} order{orders.length === 1 ? "" : "s"}</span>
                </div>
                <OrdersTab orders={orders} loading={ordersLoading} error={ordersError} />
              </>
            )}

            {activeTab === "wishlist" && (
              <div className="profile-empty-state">
                <LuHeart />
                <h2>Wishlist</h2>
                <p>Save favorites from the shop and they will wait here for later.</p>
                <NavLink to="/shop">Browse Shop</NavLink>
              </div>
            )}

            {activeTab === "addresses" && (
              <>
                <div className="profile-panel-heading">
                  <h2>Addresses</h2>
                  <span>Shipping details</span>
                </div>
                <div className="profile-address-card">
                  <LuMapPin />
                  <div>
                    <h3>Delivery address</h3>
                    <p>Add address fields when checkout captures shipping details.</p>
                  </div>
                </div>
              </>
            )}

            {activeTab === "settings" && (
              <>
                <div className="profile-panel-heading">
                  <h2>Settings</h2>
                  <span>Profile details</span>
                </div>
                <form className="profile-form" onSubmit={handleSubmit}>
                  <fieldset>
                    <label htmlFor="profileFirstName">First Name</label>
                    <input
                      id="profileFirstName"
                      type="text"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      required
                    />
                  </fieldset>

                  <fieldset>
                    <label htmlFor="profileLastName">Last Name</label>
                    <input
                      id="profileLastName"
                      type="text"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      required
                    />
                  </fieldset>

                  <fieldset>
                    <label htmlFor="profilePhone">Phone</label>
                    <input
                      id="profilePhone"
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      required
                    />
                  </fieldset>

                  {saveError && <p className="profile-error text-error">{saveError}</p>}
                  {saveSuccess && <p className="profile-error text-success">{saveSuccess}</p>}

                  <button className="primary" type="submit" disabled={isSaving}>
                    {isSaving ? "Saving..." : "Save Profile"}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}

export default Profile;
