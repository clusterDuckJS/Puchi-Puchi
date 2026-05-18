import { useCallback, useEffect, useMemo, useState } from "react";
import {
  LuBoxes,
  LuChartNoAxesCombined,
  LuIndianRupee,
  LuLayoutDashboard,
  LuLogOut,
  LuPackage,
  LuPenLine,
  LuPlus,
  LuSearch,
  LuShoppingBag,
  LuTrash2,
  LuUserRound,
  LuUsers,
  LuX,
} from "react-icons/lu";
import { NavLink, Route, Routes, useNavigate } from "react-router-dom";
import { supabase } from "../../utils/supabase";
import "./admin.css";

const currency = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

const metrics = [
  { label: "Total Revenue", value: currency.format(28000), icon: LuIndianRupee },
  { label: "Active Orders", value: "3", icon: LuBoxes },
  { label: "Orders Today", value: "0", icon: LuChartNoAxesCombined },
  { label: "Total Users", value: "6", icon: LuUsers },
  { label: "Products", value: "6", icon: LuShoppingBag },
];

const topProducts = [
  { name: "Magical Girl Sakura", sold: "2 sold" },
  { name: "Usagi-chan", sold: "2 sold" },
  { name: "Little Witch Momo", sold: "1 sold" },
  { name: "Neko-chan", sold: "1 sold" },
  { name: "Hana the Fairy", sold: "1 sold" },
];

const orders = [
  { id: "PP-1042", customer: "Aiko Tanaka", email: "aiko@example.com", items: "3 item(s)", total: currency.format(9400), date: "5/16/2026", status: "Curing Chamber", stage: "4. Curing Chamber", accent: true },
  { id: "PP-1041", customer: "Rohan Mehta", email: "rohan.m@example.com", items: "1 item(s)", total: currency.format(4200), date: "5/14/2026", status: "Final Touches", stage: "6. Final Touches", accent: true },
  { id: "PP-1040", customer: "Sara Kim", email: "sara.k@example.com", items: "1 item(s)", total: currency.format(3500), date: "5/12/2026", status: "Delivered", stage: "7. Ready to Ship" },
  { id: "PP-1039", customer: "Liam Park", email: "liam@example.com", items: "2 item(s)", total: currency.format(7100), date: "5/17/2026", status: "Magic Modelling", stage: "2. Magic Modelling", accent: true },
  { id: "PP-1038", customer: "Mei Wong", email: "mei.w@example.com", items: "1 item(s)", total: currency.format(3800), date: "5/8/2026", status: "Delivered", stage: "7. Ready to Ship" },
];

const users = [
  { id: "U-001", name: "Aiko Tanaka", email: "aiko@example.com", joined: "4/3/2026", orders: "3", spent: currency.format(11200) },
  { id: "U-002", name: "Rohan Mehta", email: "rohan.m@example.com", joined: "4/18/2026", orders: "1", spent: currency.format(4200) },
  { id: "U-003", name: "Sara Kim", email: "sara.k@example.com", joined: "3/19/2026", orders: "2", spent: currency.format(6800) },
  { id: "U-004", name: "Liam Park", email: "liam@example.com", joined: "5/6/2026", orders: "1", spent: currency.format(7100) },
  { id: "U-005", name: "Mei Wong", email: "mei.w@example.com", joined: "2/17/2026", orders: "4", spent: currency.format(14600) },
  { id: "U-006", name: "Noah Singh", email: "noah.s@example.com", joined: "5/13/2026", orders: "0", spent: currency.format(0) },
];

const adminNav = [
  { to: "/admin", label: "Overview", icon: LuLayoutDashboard, end: true },
  { to: "/admin/orders", label: "Orders", icon: LuPackage },
  { to: "/admin/users", label: "Users", icon: LuUserRound },
  { to: "/admin/products", label: "Products", icon: LuShoppingBag },
];

const createBlankVariant = () => ({
  name: "",
  price: "",
  discount_price: "",
  stock: "0",
  image_url: "",
  is_active: true,
});

const createBlankProductForm = () => ({
  name: "",
  category: "",
  description: "",
  is_custom: false,
  is_active: true,
  is_featured: false,
  is_best_seller: false,
  is_new_arrival: false,
  variants: [createBlankVariant()],
});

const centsToRupees = (value) => {
  if (value === null || value === undefined) return "";
  return String(value / 100);
};

const rupeesToCents = (value) => Math.round(Number(value || 0) * 100);

function PageHeader({ title, description, action }) {
  return (
    <header className="admin-page-header">
      <div>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {action}
    </header>
  );
}

function SearchField({ placeholder, value, onChange }) {
  return (
    <label className="admin-search">
      <LuSearch />
      <input
        type="search"
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange?.(event.target.value)}
      />
    </label>
  );
}

function OverviewPage() {
  return (
    <>
      <PageHeader
        title="Overview"
        description="Welcome back! Here's what's happening at Puchi Puchi today."
      />

      <div className="admin-metrics">
        {metrics.map((metric) => {
          const Icon = metric.icon;

          return (
            <article className="admin-metric" key={metric.label}>
              <span className="admin-metric-icon">
                <Icon />
              </span>
              <strong>{metric.value}</strong>
              <span>{metric.label}</span>
            </article>
          );
        })}
      </div>

      <div className="admin-dashboard-grid">
        <section className="admin-panel">
          <h2>Top Products</h2>
          <div className="admin-product-list">
            {topProducts.map((product, index) => (
              <div className="admin-product-row" key={product.name}>
                <span className="admin-rank">{index + 1}</span>
                <span className="admin-product-name">{product.name}</span>
                <span className="admin-sold-count">{product.sold}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="admin-panel">
          <h2>Recent Orders</h2>
          <div className="admin-order-list">
            {orders.map((order) => (
              <div className="admin-order-row" key={order.id}>
                <div>
                  <p>{order.id}</p>
                  <span>{order.customer}</span>
                </div>
                <strong>{order.total}</strong>
              </div>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}

function OrdersPage() {
  return (
    <>
      <PageHeader
        title="Orders"
        description="Manage all customer orders and production status."
        action={<SearchField placeholder="Search orders..." />}
      />

      <div className="admin-table-card">
        <table>
          <thead>
            <tr>
              <th>Order ID</th>
              <th>Customer</th>
              <th>Items</th>
              <th>Total</th>
              <th>Date</th>
              <th>Status</th>
              <th>Update Stage</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr key={order.id}>
                <td>{order.id}</td>
                <td>
                  <p>{order.customer}</p>
                  <span>{order.email}</span>
                </td>
                <td>{order.items}</td>
                <td>{order.total}</td>
                <td>{order.date}</td>
                <td>
                  <span className={`admin-status ${order.accent ? "accent" : ""}`}>
                    {order.status}
                  </span>
                </td>
                <td>
                  <select value={order.stage} onChange={() => {}} aria-label={`${order.id} stage`}>
                    <option>{order.stage}</option>
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function UsersPage() {
  return (
    <>
      <PageHeader
        title="Users"
        description="All registered customers."
        action={<SearchField placeholder="Search users..." />}
      />

      <div className="admin-table-card">
        <table>
          <thead>
            <tr>
              <th>User ID</th>
              <th>Name</th>
              <th>Email</th>
              <th>Joined</th>
              <th>Orders</th>
              <th>Total Spent</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id}>
                <td>{user.id}</td>
                <td>{user.name}</td>
                <td>{user.email}</td>
                <td>{user.joined}</td>
                <td>{user.orders}</td>
                <td>{user.spent}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function ProductFormModal({
  form,
  mode,
  onClose,
  onProductChange,
  onVariantChange,
  onAddVariant,
  onRemoveVariant,
  onSubmit,
  saving,
  error,
}) {
  return (
    <div className="admin-modal-overlay" role="presentation">
      <form className="admin-product-modal" onSubmit={onSubmit}>
        <div className="admin-modal-header">
          <div>
            <h2>{mode === "edit" ? "Edit Product" : "Add Product"}</h2>
            <p>Manage product details and size variants.</p>
          </div>
          <button type="button" aria-label="Close product form" onClick={onClose}>
            <LuX />
          </button>
        </div>

        <div className="admin-form-grid">
          <fieldset>
            <label htmlFor="productName">Product name</label>
            <input
              id="productName"
              type="text"
              value={form.name}
              onChange={(event) => onProductChange("name", event.target.value)}
              required
            />
          </fieldset>

          <fieldset>
            <label htmlFor="productCategory">Category</label>
            <input
              id="productCategory"
              type="text"
              value={form.category}
              onChange={(event) => onProductChange("category", event.target.value)}
            />
          </fieldset>

          <fieldset className="admin-form-wide">
            <label htmlFor="productDescription">Description</label>
            <textarea
              id="productDescription"
              value={form.description}
              onChange={(event) => onProductChange("description", event.target.value)}
              rows={3}
            />
          </fieldset>
        </div>

        <div className="admin-checkbox-grid">
          {[
            ["is_active", "Active"],
            ["is_custom", "Custom product"],
            ["is_featured", "Featured"],
            ["is_best_seller", "Best seller"],
            ["is_new_arrival", "New arrival"],
          ].map(([key, label]) => (
            <label className="admin-check" key={key}>
              <input
                type="checkbox"
                checked={form[key]}
                onChange={(event) => onProductChange(key, event.target.checked)}
              />
              <span>{label}</span>
            </label>
          ))}
        </div>

        <div className="admin-variant-header">
          <h3>Variants</h3>
          <button type="button" onClick={onAddVariant}>
            <LuPlus />
            <span>Add Variant</span>
          </button>
        </div>

        <div className="admin-variant-list">
          {form.variants.map((variant, index) => (
            <div className="admin-variant-card" key={index}>
              <div className="admin-variant-card-header">
                <strong>Variant {index + 1}</strong>
                {form.variants.length > 1 && (
                  <button type="button" aria-label={`Remove variant ${index + 1}`} onClick={() => onRemoveVariant(index)}>
                    <LuTrash2 />
                  </button>
                )}
              </div>

              <div className="admin-form-grid">
                <fieldset>
                  <label htmlFor={`variantName-${index}`}>Variant name</label>
                  <input
                    id={`variantName-${index}`}
                    type="text"
                    placeholder="Small / Medium / Large"
                    value={variant.name}
                    onChange={(event) => onVariantChange(index, "name", event.target.value)}
                  />
                </fieldset>

                <fieldset>
                  <label htmlFor={`variantPrice-${index}`}>Price</label>
                  <input
                    id={`variantPrice-${index}`}
                    type="number"
                    min="0"
                    step="0.01"
                    value={variant.price}
                    onChange={(event) => onVariantChange(index, "price", event.target.value)}
                    required
                  />
                </fieldset>

                <fieldset>
                  <label htmlFor={`variantDiscount-${index}`}>Discount price</label>
                  <input
                    id={`variantDiscount-${index}`}
                    type="number"
                    min="0"
                    step="0.01"
                    value={variant.discount_price}
                    onChange={(event) => onVariantChange(index, "discount_price", event.target.value)}
                  />
                </fieldset>

                <fieldset>
                  <label htmlFor={`variantStock-${index}`}>Stock</label>
                  <input
                    id={`variantStock-${index}`}
                    type="number"
                    min="0"
                    step="1"
                    value={variant.stock}
                    onChange={(event) => onVariantChange(index, "stock", event.target.value)}
                  />
                </fieldset>

                <fieldset className="admin-form-wide">
                  <label htmlFor={`variantImage-${index}`}>Image URL</label>
                  <input
                    id={`variantImage-${index}`}
                    type="url"
                    value={variant.image_url}
                    onChange={(event) => onVariantChange(index, "image_url", event.target.value)}
                  />
                </fieldset>

                <label className="admin-check admin-variant-active">
                  <input
                    type="checkbox"
                    checked={variant.is_active}
                    onChange={(event) => onVariantChange(index, "is_active", event.target.checked)}
                  />
                  <span>Active variant</span>
                </label>
              </div>
            </div>
          ))}
        </div>

        {error && <p className="admin-form-error text-error">{error}</p>}

        <div className="admin-modal-actions">
          <button type="button" className="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button type="submit" className="primary" disabled={saving}>
            {saving ? "Saving..." : mode === "edit" ? "Save Changes" : "Create Product"}
          </button>
        </div>
      </form>
    </div>
  );
}

function ProductsPage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [modalMode, setModalMode] = useState(null);
  const [editingProduct, setEditingProduct] = useState(null);
  const [form, setForm] = useState(createBlankProductForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setError("");

    const { data, error: fetchError } = await supabase
      .from("products")
      .select(`
        id,
        name,
        description,
        category,
        is_custom,
        is_active,
        is_featured,
        is_best_seller,
        is_new_arrival,
        created_at,
        product_variants (
          id,
          name,
          price,
          discount_price,
          stock,
          image_url,
          is_active,
          created_at
        )
      `)
      .order("created_at", { ascending: false });

    if (fetchError) {
      console.error("Admin products fetch error:", fetchError);
      setError(fetchError.message);
      setProducts([]);
    } else {
      setProducts(data || []);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(fetchProducts, 0);

    return () => window.clearTimeout(timer);
  }, [fetchProducts]);

  const filteredProducts = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) return products;

    return products.filter((product) => {
      return [product.name, product.category, product.description]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(normalizedQuery));
    });
  }, [products, query]);

  const openAddModal = () => {
    setForm(createBlankProductForm());
    setEditingProduct(null);
    setFormError("");
    setModalMode("add");
  };

  const openEditModal = (product) => {
    const variants = product.product_variants?.length
      ? product.product_variants.map((variant) => ({
        id: variant.id,
        name: variant.name || "",
        price: centsToRupees(variant.price),
        discount_price: centsToRupees(variant.discount_price),
        stock: String(variant.stock ?? 0),
        image_url: variant.image_url || "",
        is_active: variant.is_active ?? true,
      }))
      : [createBlankVariant()];

    setForm({
      name: product.name || "",
      category: product.category || "",
      description: product.description || "",
      is_custom: product.is_custom ?? false,
      is_active: product.is_active ?? true,
      is_featured: product.is_featured ?? false,
      is_best_seller: product.is_best_seller ?? false,
      is_new_arrival: product.is_new_arrival ?? false,
      variants,
    });
    setEditingProduct(product);
    setFormError("");
    setModalMode("edit");
  };

  const closeModal = () => {
    if (saving) return;

    setModalMode(null);
    setEditingProduct(null);
    setFormError("");
  };

  const handleProductChange = (field, value) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const handleVariantChange = (index, field, value) => {
    setForm((current) => ({
      ...current,
      variants: current.variants.map((variant, variantIndex) => (
        variantIndex === index ? { ...variant, [field]: value } : variant
      )),
    }));
  };

  const addVariant = () => {
    setForm((current) => ({
      ...current,
      variants: [...current.variants, createBlankVariant()],
    }));
  };

  const removeVariant = (index) => {
    setForm((current) => ({
      ...current,
      variants: current.variants.filter((_, variantIndex) => variantIndex !== index),
    }));
  };

  const saveProduct = async (event) => {
    event.preventDefault();
    setFormError("");

    const variants = form.variants.map((variant) => ({
      name: variant.name.trim() || null,
      price: rupeesToCents(variant.price),
      discount_price: variant.discount_price === "" ? null : rupeesToCents(variant.discount_price),
      stock: Number(variant.stock || 0),
      image_url: variant.image_url.trim() || null,
      is_active: variant.is_active,
    }));

    if (!form.name.trim()) {
      setFormError("Product name is required.");
      return;
    }

    if (!variants.length || variants.some((variant) => !variant.price || variant.price < 0)) {
      setFormError("Every variant needs a valid price.");
      return;
    }

    setSaving(true);

    const productPayload = {
      name: form.name.trim(),
      category: form.category.trim() || null,
      description: form.description.trim() || null,
      is_custom: form.is_custom,
      is_active: form.is_active,
      is_featured: form.is_featured,
      is_best_seller: form.is_best_seller,
      is_new_arrival: form.is_new_arrival,
    };

    const productRequest = editingProduct
      ? supabase
        .from("products")
        .update(productPayload)
        .eq("id", editingProduct.id)
        .select("id")
        .single()
      : supabase
        .from("products")
        .insert(productPayload)
        .select("id")
        .single();

    const { data: savedProduct, error: productError } = await productRequest;

    if (productError) {
      setFormError(productError.message);
      setSaving(false);
      return;
    }

    if (editingProduct) {
      const { error: deleteError } = await supabase
        .from("product_variants")
        .delete()
        .eq("product_id", savedProduct.id);

      if (deleteError) {
        setFormError(deleteError.message);
        setSaving(false);
        return;
      }
    }

    const { error: variantError } = await supabase
      .from("product_variants")
      .insert(variants.map((variant) => ({
        ...variant,
        product_id: savedProduct.id,
      })));

    if (variantError) {
      setFormError(variantError.message);
      setSaving(false);
      return;
    }

    await fetchProducts();
    setSaving(false);
    setModalMode(null);
    setEditingProduct(null);
  };

  return (
    <>
      <PageHeader
        title="Products"
        description="Manage your chibi catalog."
        action={
          <div className="admin-product-toolbar">
            <SearchField placeholder="Search products..." value={query} onChange={setQuery} />
            <button className="admin-add-product" type="button" onClick={openAddModal}>
              <LuPlus />
              <span>Add Product</span>
            </button>
          </div>
        }
      />

      {loading && <p className="admin-status-message">Loading products...</p>}
      {!loading && error && <p className="admin-status-message text-error">{error}</p>}
      {!loading && !error && filteredProducts.length === 0 && (
        <p className="admin-status-message">No products found.</p>
      )}

      {!loading && !error && filteredProducts.length > 0 && (
        <div className="admin-products-grid">
          {filteredProducts.map((product) => {
            const variants = product.product_variants || [];
            const activeVariant = variants.find((variant) => variant.is_active) || variants[0];
            const price = activeVariant?.discount_price || activeVariant?.price || 0;
            const image = activeVariant?.image_url || "https://via.placeholder.com/600";

            return (
              <article className="admin-product-card" key={product.id}>
                <img src={image} alt={product.name} />
                <p>{product.category || "Uncategorized"}</p>
                <h3>{product.name}</h3>
                <strong>{currency.format(price / 100)}</strong>
                <small>{variants.length} variant{variants.length === 1 ? "" : "s"}</small>
                <div className="admin-product-actions">
                  <button type="button" onClick={() => openEditModal(product)}>
                    <LuPenLine />
                    <span>Edit</span>
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {modalMode && (
        <ProductFormModal
          form={form}
          mode={modalMode}
          onClose={closeModal}
          onProductChange={handleProductChange}
          onVariantChange={handleVariantChange}
          onAddVariant={addVariant}
          onRemoveVariant={removeVariant}
          onSubmit={saveProduct}
          saving={saving}
          error={formError}
        />
      )}
    </>
  );
}

function Admin() {
  const navigate = useNavigate();

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();

    if (!error) {
      navigate("/admin/login", { replace: true });
    }
  };

  return (
    <main className="admin-shell">
      <aside className="admin-sidebar">
        <div className="admin-sidebar-heading">
          <h1>Puchi Admin</h1>
          <p>Internal dashboard</p>
        </div>

        <nav className="admin-nav" aria-label="Admin navigation">
          {adminNav.map((item) => {
            const Icon = item.icon;

            return (
              <NavLink
                className={({ isActive }) => `admin-nav-item ${isActive ? "active" : ""}`}
                end={item.end}
                key={item.to}
                to={item.to}
              >
                <Icon />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        <button className="admin-logout" type="button" onClick={handleLogout}>
          <LuLogOut />
          <span>Log out</span>
        </button>
      </aside>

      <section className="admin-content">
        <Routes>
          <Route index element={<OverviewPage />} />
          <Route path="orders" element={<OrdersPage />} />
          <Route path="users" element={<UsersPage />} />
          <Route path="products" element={<ProductsPage />} />
        </Routes>
      </section>
    </main>
  );
}

export default Admin;
