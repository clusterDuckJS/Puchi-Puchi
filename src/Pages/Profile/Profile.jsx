import { useCallback, useEffect, useMemo, useState } from "react";
import {
  LuBox,
  LuCircleCheck,
  LuHeart,
  LuLogOut,
  LuMapPin,
  LuPackageCheck,
  LuPalette,
  LuPenLine,
  LuPlus,
  LuPrinter,
  LuSettings,
  LuSparkles,
  LuTrash2,
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

const createBlankAddressForm = () => ({
  id: "",
  label: "",
  full_name: "",
  phone: "",
  address_line1: "",
  address_line2: "",
  city: "",
  state: "",
  pincode: "",
  country: "India",
  delivery_notes: "",
  is_default: false,
});

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

function AddressesTab({
  addresses,
  loading,
  error,
  form,
  isSaving,
  saveError,
  saveSuccess,
  onChange,
  onSubmit,
  onEdit,
  onCancel,
  onDelete,
  onSetDefault,
}) {
  return (
    <div className="profile-addresses">
      <form className="profile-address-form" onSubmit={onSubmit}>
        <div className="profile-address-form-heading">
          <div>
            <h3>{form.id ? "Edit Address" : "Add Address"}</h3>
            <p>Save shipping details for faster checkout.</p>
          </div>
          {form.id && (
            <button type="button" className="secondary" onClick={onCancel}>
              Cancel Edit
            </button>
          )}
        </div>

        <fieldset>
          <label htmlFor="addressLabel">Label</label>
          <input
            id="addressLabel"
            type="text"
            value={form.label}
            onChange={(event) => onChange("label", event.target.value)}
            placeholder="Home / Office"
          />
        </fieldset>

        <fieldset>
          <label htmlFor="addressFullName">Full Name</label>
          <input
            id="addressFullName"
            type="text"
            value={form.full_name}
            onChange={(event) => onChange("full_name", event.target.value)}
            required
          />
        </fieldset>

        <fieldset>
          <label htmlFor="addressPhone">Phone Number</label>
          <input
            id="addressPhone"
            type="tel"
            value={form.phone}
            onChange={(event) => onChange("phone", event.target.value)}
            required
          />
        </fieldset>

        <fieldset>
          <label htmlFor="addressPincode">Pincode</label>
          <input
            id="addressPincode"
            type="text"
            inputMode="numeric"
            value={form.pincode}
            onChange={(event) => onChange("pincode", event.target.value)}
            required
          />
        </fieldset>

        <fieldset className="profile-form-wide">
          <label htmlFor="addressLine1">Address Line 1</label>
          <input
            id="addressLine1"
            type="text"
            value={form.address_line1}
            onChange={(event) => onChange("address_line1", event.target.value)}
            placeholder="House / flat, building, street"
            required
          />
        </fieldset>

        <fieldset className="profile-form-wide">
          <label htmlFor="addressLine2">Address Line 2</label>
          <input
            id="addressLine2"
            type="text"
            value={form.address_line2}
            onChange={(event) => onChange("address_line2", event.target.value)}
            placeholder="Area, landmark, optional"
          />
        </fieldset>

        <fieldset>
          <label htmlFor="addressCity">City</label>
          <input
            id="addressCity"
            type="text"
            value={form.city}
            onChange={(event) => onChange("city", event.target.value)}
            required
          />
        </fieldset>

        <fieldset>
          <label htmlFor="addressState">State</label>
          <input
            id="addressState"
            type="text"
            value={form.state}
            onChange={(event) => onChange("state", event.target.value)}
            required
          />
        </fieldset>

        <fieldset>
          <label htmlFor="addressCountry">Country</label>
          <input
            id="addressCountry"
            type="text"
            value={form.country}
            onChange={(event) => onChange("country", event.target.value)}
            required
          />
        </fieldset>

        <label className="profile-address-default">
          <input
            type="checkbox"
            checked={form.is_default}
            onChange={(event) => onChange("is_default", event.target.checked)}
          />
          <span>Set as default address</span>
        </label>

        <fieldset className="profile-form-wide">
          <label htmlFor="addressNotes">Delivery Notes</label>
          <textarea
            id="addressNotes"
            value={form.delivery_notes}
            onChange={(event) => onChange("delivery_notes", event.target.value)}
            rows={3}
            placeholder="Gate code, landmark, preferred delivery time"
          />
        </fieldset>

        {saveError && <p className="profile-error text-error">{saveError}</p>}
        {saveSuccess && <p className="profile-error text-success">{saveSuccess}</p>}

        <button className="primary" type="submit" disabled={isSaving}>
          {isSaving ? "Saving..." : form.id ? "Save Address" : "Add Address"}
        </button>
      </form>

      <div className="profile-address-list">
        {loading && <p className="profile-state-card">Loading addresses...</p>}
        {!loading && error && <p className="profile-state-card text-error">{error}</p>}
        {!loading && !error && addresses.length === 0 && (
          <div className="profile-empty-state">
            <LuMapPin />
            <h3>No addresses saved</h3>
            <p>Add your delivery address and mark one as default.</p>
          </div>
        )}

        {!loading && !error && addresses.map((address) => (
          <article className="profile-address-saved-card" key={address.id}>
            <header>
              <div>
                <h3>{address.label || "Saved Address"}</h3>
                {address.is_default && <span>Default</span>}
              </div>
              <strong>{address.full_name}</strong>
            </header>

            <p>{address.address_line1}</p>
            {address.address_line2 && <p>{address.address_line2}</p>}
            <p>{address.city}, {address.state} - {address.pincode}</p>
            <p>{address.country}</p>
            <p>Phone: {address.phone}</p>
            {address.delivery_notes && <small>{address.delivery_notes}</small>}

            <div className="profile-address-actions">
              {!address.is_default && (
                <button type="button" onClick={() => onSetDefault(address.id)}>
                  Set Default
                </button>
              )}
              <button type="button" onClick={() => onEdit(address)}>
                <LuPenLine />
                <span>Edit</span>
              </button>
              <button type="button" className="danger" onClick={() => onDelete(address.id)}>
                <LuTrash2 />
                <span>Delete</span>
              </button>
            </div>
          </article>
        ))}
      </div>
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
  const [addresses, setAddresses] = useState([]);
  const [addressesLoading, setAddressesLoading] = useState(true);
  const [addressesError, setAddressesError] = useState("");
  const [addressForm, setAddressForm] = useState(createBlankAddressForm);
  const [addressSaveError, setAddressSaveError] = useState("");
  const [addressSaveSuccess, setAddressSaveSuccess] = useState("");
  const [isSavingAddress, setIsSavingAddress] = useState(false);

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

  const loadAddresses = useCallback(async () => {
    setAddressesLoading(true);
    setAddressesError("");

    try {
      const { data, error } = await withRequestTimeout(supabase
        .from("user_addresses")
        .select("*")
        .eq("user_id", user.id)
        .order("is_default", { ascending: false })
        .order("created_at", { ascending: false }));

      if (error) throw error;

      setAddresses(data || []);
    } catch (error) {
      console.error("Profile addresses error:", error);
      setAddresses([]);
      setAddressesError(
        isTimeoutError(error)
          ? "Your addresses are taking too long to load. Please refresh in a moment."
          : "We could not load your addresses right now.",
      );
    } finally {
      setAddressesLoading(false);
    }
  }, [user.id]);

  useEffect(() => {
    loadAddresses();
  }, [loadAddresses]);

  const resetAddressForm = (clearMessages = true) => {
    setAddressForm(createBlankAddressForm());
    if (clearMessages) {
      setAddressSaveError("");
      setAddressSaveSuccess("");
    }
  };

  const handleAddressChange = (field, value) => {
    setAddressForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const createAddressPayload = () => ({
    user_id: user.id,
    label: addressForm.label.trim() || null,
    full_name: addressForm.full_name.trim(),
    phone: addressForm.phone.trim(),
    address_line1: addressForm.address_line1.trim(),
    address_line2: addressForm.address_line2.trim() || null,
    city: addressForm.city.trim(),
    state: addressForm.state.trim(),
    pincode: addressForm.pincode.trim(),
    country: addressForm.country.trim() || "India",
    delivery_notes: addressForm.delivery_notes.trim() || null,
    is_default: Boolean(addressForm.is_default || addresses.length === 0),
    updated_at: new Date().toISOString(),
  });

  const saveAddress = async (event) => {
    event.preventDefault();
    setAddressSaveError("");
    setAddressSaveSuccess("");
    setIsSavingAddress(true);

    try {
      const payload = createAddressPayload();

      if (payload.is_default) {
        const { error } = await supabase
          .from("user_addresses")
          .update({ is_default: false })
          .eq("user_id", user.id);

        if (error) throw error;
      }

      const request = addressForm.id
        ? supabase
          .from("user_addresses")
          .update(payload)
          .eq("id", addressForm.id)
          .eq("user_id", user.id)
        : supabase
          .from("user_addresses")
          .insert(payload);

      const { error } = await request;

      if (error) throw error;

      setAddressSaveSuccess(addressForm.id ? "Address saved." : "Address added.");
      resetAddressForm(false);
      await loadAddresses();
    } catch (error) {
      console.error("Address save error:", error);
      setAddressSaveError(error.message || "We could not save that address.");
    } finally {
      setIsSavingAddress(false);
    }
  };

  const editAddress = (address) => {
    setAddressForm({
      id: address.id,
      label: address.label || "",
      full_name: address.full_name || "",
      phone: address.phone || "",
      address_line1: address.address_line1 || "",
      address_line2: address.address_line2 || "",
      city: address.city || "",
      state: address.state || "",
      pincode: address.pincode || "",
      country: address.country || "India",
      delivery_notes: address.delivery_notes || "",
      is_default: Boolean(address.is_default),
    });
    setAddressSaveError("");
    setAddressSaveSuccess("");
  };

  const deleteAddress = async (addressId) => {
    const shouldDelete = window.confirm("Delete this address?");

    if (!shouldDelete) return;

    setAddressSaveError("");
    setAddressSaveSuccess("");

    const { error } = await supabase
      .from("user_addresses")
      .delete()
      .eq("id", addressId)
      .eq("user_id", user.id);

    if (error) {
      setAddressSaveError(error.message);
      return;
    }

    if (addressForm.id === addressId) {
      resetAddressForm();
    }

    setAddressSaveSuccess("Address deleted.");
    await loadAddresses();
  };

  const setDefaultAddress = async (addressId) => {
    setAddressSaveError("");
    setAddressSaveSuccess("");

    const { error: clearError } = await supabase
      .from("user_addresses")
      .update({ is_default: false })
      .eq("user_id", user.id);

    if (clearError) {
      setAddressSaveError(clearError.message);
      return;
    }

    const { error } = await supabase
      .from("user_addresses")
      .update({ is_default: true, updated_at: new Date().toISOString() })
      .eq("id", addressId)
      .eq("user_id", user.id);

    if (error) {
      setAddressSaveError(error.message);
      return;
    }

    setAddressSaveSuccess("Default address updated.");
    await loadAddresses();
  };

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
                  <span>{addresses.length} saved</span>
                </div>
                <AddressesTab
                  addresses={addresses}
                  loading={addressesLoading}
                  error={addressesError}
                  form={addressForm}
                  isSaving={isSavingAddress}
                  saveError={addressSaveError}
                  saveSuccess={addressSaveSuccess}
                  onChange={handleAddressChange}
                  onSubmit={saveAddress}
                  onEdit={editAddress}
                  onCancel={resetAddressForm}
                  onDelete={deleteAddress}
                  onSetDefault={setDefaultAddress}
                />
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
