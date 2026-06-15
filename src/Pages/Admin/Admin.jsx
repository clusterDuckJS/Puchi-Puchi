import { createElement, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  LuBold,
  LuBoxes,
  LuChartNoAxesCombined,
  LuChevronDown,
  LuImagePlus,
  LuIndianRupee,
  LuItalic,
  LuLayoutDashboard,
  LuList,
  LuListOrdered,
  LuLogOut,
  LuPackage,
  LuPenLine,
  LuPlus,
  LuSearch,
  LuShoppingBag,
  LuStar,
  LuTrash2,
  LuUnderline,
  LuUserRound,
  LuUsers,
  LuX,
} from "react-icons/lu";
import { NavLink, Route, Routes, useNavigate } from "react-router-dom";
import {
  formatOrderNumber,
  formatOrderStatus,
  formatShortDate,
  getCountdownLabel,
  getOrderDueDate,
  isMissingOrderNumberError,
  normalizeOrderStatus,
  ORDER_STAGE_OPTIONS,
} from "../../utils/orders";
import { supabase } from "../../utils/supabase";
import { isTimeoutError, withRequestTimeout } from "../../utils/request";
import { sanitizeRichText, stripRichText } from "../../utils/richText";
import "./admin.css";

const currency = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

const USER_DISPLAY_ID_START = 1;
const PRODUCT_PLACEHOLDER_IMAGE = "/product-placeholder.svg";
const ADMIN_REVIEW_REPLY_NAME = "Puchi Puchi";
const ADMIN_REVIEW_REPLY_SCHEMA_ERROR = "Review replies need the latest Supabase migration. Refresh the admin page, then try again.";

const isMissingReviewReplyColumnError = (error, columnName) => (
  error?.message?.includes(columnName) &&
  error?.message?.includes("schema cache")
);

const adminNav = [
  { to: "/admin", label: "Overview", icon: LuLayoutDashboard, end: true },
  { to: "/admin/orders", label: "Orders", icon: LuPackage },
  { to: "/admin/users", label: "Users", icon: LuUserRound },
  { to: "/admin/reviews", label: "Reviews", icon: LuStar },
  { to: "/admin/products", label: "Products", icon: LuShoppingBag },
];

const PRODUCT_CATEGORY_OPTIONS = [
  "Controversial",
  "Gods",
  "Funko",
  "Gaming",
  "TV Show",
  "Movie",
  "Pets",
  "Made Just for You",
  "Keychains"
];

const normalizeListValue = (value) => value.trim().replace(/\s+/g, " ");

const parseListField = (value) => {
  if (Array.isArray(value)) {
    return value.map(String).map(normalizeListValue).filter(Boolean);
  }

  if (!value) return [];

  return String(value)
    .split(",")
    .map(normalizeListValue)
    .filter(Boolean);
};

const createBlankVariant = () => ({
  name: "",
  price: "",
  discount_price: "",
  stock: "0",
  image_urls: [""],
  is_active: true,
});

const createBlankProductForm = () => ({
  name: "",
  categories: [],
  customCategory: "",
  description: "",
  is_custom: false,
  is_active: true,
  is_featured: false,
  is_best_seller: false,
  is_new_arrival: false,
  allow_custom_name: false,
  allow_name_plate: false,
  variants: [createBlankVariant()],
});

const createBlankAdminReviewForm = () => ({
  reviewer_first_name: "",
  place: "",
  product_name: "",
  rating: "5",
  review_text: "",
  review_date: new Date().toISOString().slice(0, 10),
  is_approved: true,
});

const centsToRupees = (value) => {
  if (value === null || value === undefined) return "";
  return String(value / 100);
};

const rupeesToCents = (value) => Math.round(Number(value || 0) * 100);

const getProfileName = (profile) => (
  [profile?.first_name, profile?.last_name].filter(Boolean).join(" ") ||
  profile?.email ||
  "Customer"
);

const formatDisplayId = (value) => String(value).padStart(4, "0");

const withSequentialDisplayIds = (items, startAt) => {
  const displayIdsById = [...items]
    .sort((a, b) => new Date(a.created_at || 0) - new Date(b.created_at || 0))
    .reduce((map, item, index) => ({
      ...map,
      [item.id]: formatDisplayId(startAt + index),
    }), {});

  return items.map((item) => ({
    ...item,
    display_id: displayIdsById[item.id],
  }));
};

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
        value={value ?? ""}
        onChange={(event) => onChange?.(event.target.value)}
      />
    </label>
  );
}

const editorActions = [
  { command: "bold", label: "Bold", icon: LuBold, tagName: "strong" },
  { command: "italic", label: "Italic", icon: LuItalic, tagName: "em" },
  { command: "underline", label: "Underline", icon: LuUnderline, tagName: "u" },
  { command: "bulletList", label: "Bulleted list", icon: LuList, listTagName: "ul" },
  { command: "numberedList", label: "Numbered list", icon: LuListOrdered, listTagName: "ol" },
];

function RichTextEditor({ id, value, onChange }) {
  const editorRef = useRef(null);
  const selectionRef = useRef(null);

  const rememberSelection = useCallback(() => {
    const selection = window.getSelection();

    if (
      selection?.rangeCount &&
      editorRef.current?.contains(selection.anchorNode) &&
      editorRef.current?.contains(selection.focusNode)
    ) {
      selectionRef.current = selection.getRangeAt(0);
    }
  }, []);

  useEffect(() => {
    const editor = editorRef.current;
    const nextHtml = sanitizeRichText(value);

    if (editor && document.activeElement !== editor && editor.innerHTML !== nextHtml) {
      editor.innerHTML = nextHtml;
    }
  }, [value]);

  useEffect(() => {
    document.addEventListener("selectionchange", rememberSelection);

    return () => {
      document.removeEventListener("selectionchange", rememberSelection);
    };
  }, [rememberSelection]);

  const syncValue = () => {
    onChange(editorRef.current?.innerHTML || "");
  };

  const restoreSelection = () => {
    const selection = window.getSelection();

    if (!selectionRef.current || !selection || !editorRef.current) return;

    selection.removeAllRanges();
    selection.addRange(selectionRef.current);
  };

  const getFormattingRange = () => {
    const selection = window.getSelection();
    const activeRange = selection?.rangeCount ? selection.getRangeAt(0) : null;
    const savedRange = selectionRef.current;
    const editor = editorRef.current;

    const range = activeRange && editor?.contains(activeRange.commonAncestorContainer)
      ? activeRange
      : savedRange;

    if (range && !range.collapsed && editor?.contains(range.commonAncestorContainer)) {
      return range;
    }

    if (!editor || !editor.textContent?.trim()) return null;

    const fallbackRange = document.createRange();
    fallbackRange.selectNodeContents(editor);
    return fallbackRange;
  };

  const syncSanitizedValue = () => {
    const nextHtml = sanitizeRichText(editorRef.current?.innerHTML || "");

    if (editorRef.current && editorRef.current.innerHTML !== nextHtml) {
      editorRef.current.innerHTML = nextHtml;
    }

    onChange(nextHtml);
  };

  const selectNode = (node) => {
    const selection = window.getSelection();
    const range = document.createRange();

    range.selectNodeContents(node);
    selection?.removeAllRanges();
    selection?.addRange(range);
    selectionRef.current = range;
  };

  const placeCaretAtEnd = (node) => {
    const selection = window.getSelection();
    const range = document.createRange();

    range.selectNodeContents(node);
    range.collapse(false);
    selection?.removeAllRanges();
    selection?.addRange(range);
    selectionRef.current = range;
  };

  const ensureSelectionInEditor = () => {
    const editor = editorRef.current;
    const selection = window.getSelection();

    if (!editor || !selection) return false;

    if (
      selection.rangeCount &&
      editor.contains(selection.anchorNode) &&
      editor.contains(selection.focusNode)
    ) {
      return true;
    }

    if (!editor.childNodes.length) {
      const paragraph = document.createElement("p");
      paragraph.appendChild(document.createElement("br"));
      editor.appendChild(paragraph);
      placeCaretAtEnd(paragraph);
      return true;
    }

    placeCaretAtEnd(editor.lastChild);
    return true;
  };

  const applyInlineFormat = (tagName) => {
    const range = getFormattingRange();

    if (!range) return;

    const wrapper = document.createElement(tagName);
    wrapper.appendChild(range.extractContents());
    range.insertNode(wrapper);
    selectNode(wrapper);
    syncValue();
  };

  const applyListFormat = (listTagName) => {
    const editor = editorRef.current;

    if (!editor || !ensureSelectionInEditor()) return;

    document.execCommand(
      listTagName === "ol" ? "insertOrderedList" : "insertUnorderedList",
      false,
      null
    );
    syncValue();
  };

  const runCommand = (action) => {
    editorRef.current?.focus();
    restoreSelection();

    if (action.tagName) {
      applyInlineFormat(action.tagName);
    } else if (action.listTagName) {
      applyListFormat(action.listTagName);
    }

    rememberSelection();
  };

  const handlePaste = (event) => {
    event.preventDefault();
    const text = event.clipboardData.getData("text/plain");
    document.execCommand("insertText", false, text);
    syncValue();
  };

  return (
    <div className="admin-rich-text">
      <div className="admin-rich-text-toolbar" aria-label="Description formatting">
        {editorActions.map((action) => (
          <button
            type="button"
            key={action.command}
            onMouseDown={(event) => {
              event.preventDefault();
              rememberSelection();
            }}
            onClick={() => runCommand(action)}
            aria-label={action.label}
            title={action.label}
          >
            {createElement(action.icon)}
          </button>
        ))}
      </div>
      <div
        id={id}
        ref={editorRef}
        className="admin-rich-text-input"
        contentEditable
        role="textbox"
        aria-multiline="true"
        onInput={syncValue}
        onKeyUp={rememberSelection}
        onMouseUp={rememberSelection}
        onBlur={syncSanitizedValue}
        onPaste={handlePaste}
        suppressContentEditableWarning
      />
    </div>
  );
}

const getAdminOrderStatusValue = (status) => (
  status === "ready_to_ship" || status === "shipped" ? "dispatched" : status || "paid"
);

const getAdminOrderRowClassName = (status) => {
  const normalizedStatus = normalizeOrderStatus(status);

  if (normalizedStatus === "cancelled" || normalizedStatus === "canceled") {
    return "admin-order-row-cancelled";
  }

  if (
    normalizedStatus === "dispatched" ||
    normalizedStatus === "shipped" ||
    normalizedStatus === "ready_to_ship"
  ) {
    return "admin-order-row-dispatched";
  }

  return "";
};

const formatChoiceLabel = (value) => (
  String(value || "standard")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
);

const formatAddressLine = (address) => (
  [
    address?.address_line1,
    address?.address_line2,
    address?.city,
    address?.state,
    address?.pincode,
  ].filter(Boolean).join(", ")
);

function OverviewPage() {
  const [metrics, setMetrics] = useState([]);
  const [topProducts, setTopProducts] = useState([]);
  const [recentOrders, setRecentOrders] = useState([]);
  const [profilesById, setProfilesById] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchOverview = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const createOrdersRequest = (includeOrderNumber) => withRequestTimeout(supabase
        .from("orders")
        .select(`
          id,
          user_id,
          ${includeOrderNumber ? "order_number," : ""}
          total_amount,
          status,
          paid_at,
          tracking_id,
          dispatched_at,
          selected_address_id,
          delivery_address,
          shipping_method,
          shipping_amount,
          has_insurance,
          insurance_amount,
          crafting_speed,
          crafting_speed_fee,
          inventory_deducted_at,
          customer_name,
          customer_email,
          customer_phone,
          created_at,
          order_items (
            quantity,
            products (
              id,
              name
            )
          )
        `)
        .neq("status", "pending")
        .order("created_at", { ascending: false }));

      const [
        ordersResult,
        productsResult,
        profilesResult,
      ] = await Promise.all([
        createOrdersRequest(true),
        withRequestTimeout(supabase
          .from("products")
          .select("id", { count: "exact", head: true })
          .eq("is_active", true)),
        withRequestTimeout(supabase
          .from("profiles")
          .select("id, first_name, last_name, email", { count: "exact" })),
      ]);

      const safeOrdersResult = ordersResult.error && isMissingOrderNumberError(ordersResult.error)
        ? await createOrdersRequest(false)
        : ordersResult;

      if (safeOrdersResult.error) throw safeOrdersResult.error;
      if (productsResult.error) throw productsResult.error;
      if (profilesResult.error) throw profilesResult.error;

      const orders = safeOrdersResult.data || [];
      const profiles = profilesResult.data || [];
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const profileMap = profiles.reduce((map, profile) => ({
        ...map,
        [profile.id]: profile,
      }), {});
      const productSales = new Map();

      orders.forEach((order) => {
        (order.order_items || []).forEach((item) => {
          const product = item.products || {};
          const productId = product.id || product.name;

          if (!productId) return;

          const current = productSales.get(productId) || {
            name: product.name || "Puchi Puchi item",
            quantity: 0,
          };

          productSales.set(productId, {
            ...current,
            quantity: current.quantity + (item.quantity || 0),
          });
        });
      });

      const totalRevenue = orders.reduce((sum, order) => sum + (order.total_amount || 0), 0);
      const activeOrders = orders.filter((order) => order.status !== "delivered").length;
      const ordersToday = orders.filter((order) => (
        order.created_at && new Date(order.created_at) >= todayStart
      )).length;

      setMetrics([
        { label: "Total Revenue", value: currency.format(totalRevenue / 100), icon: LuIndianRupee },
        { label: "Active Orders", value: String(activeOrders), icon: LuBoxes },
        { label: "Orders Today", value: String(ordersToday), icon: LuChartNoAxesCombined },
        { label: "Total Users", value: String(profilesResult.count || profiles.length), icon: LuUsers },
        { label: "Products", value: String(productsResult.count || 0), icon: LuShoppingBag },
      ]);
      setTopProducts(
        Array.from(productSales.values())
          .sort((a, b) => b.quantity - a.quantity)
          .slice(0, 5)
          .map((product) => ({
            name: product.name,
            sold: `${product.quantity} sold`,
          }))
      );
      setRecentOrders(orders.slice(0, 5));
      setProfilesById(profileMap);
    } catch (error) {
      console.error("Admin overview error:", error);
      setError(
        isTimeoutError(error)
          ? "Overview data is taking too long to load. Please refresh in a moment."
          : "We could not load overview data right now."
      );
      setMetrics([]);
      setTopProducts([]);
      setRecentOrders([]);
      setProfilesById({});
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOverview();
  }, [fetchOverview]);

  return (
    <>
      <PageHeader
        title="Overview"
        description="Welcome back! Here's what's happening at Puchi Puchi today."
      />

      {loading && <p className="admin-status-message">Loading overview...</p>}
      {!loading && error && <p className="admin-status-message text-error">{error}</p>}

      {!loading && !error && (
      <>
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
          {topProducts.length > 0 ? (
            <div className="admin-product-list">
              {topProducts.map((product, index) => (
              <div className="admin-product-row" key={product.name}>
                <span className="admin-rank">{index + 1}</span>
                <span className="admin-product-name">{product.name}</span>
                <span className="admin-sold-count">{product.sold}</span>
              </div>
              ))}
            </div>
          ) : (
            <p className="admin-empty-panel">No completed order items yet.</p>
          )}
        </section>

        <section className="admin-panel">
          <h2>Recent Orders</h2>
          {recentOrders.length > 0 ? (
            <div className="admin-order-list">
              {recentOrders.map((order) => {
                const customer = order.customer_name || getProfileName(profilesById[order.user_id]);

                return (
              <div className="admin-order-row" key={order.id}>
                <div>
                  <p>#{formatOrderNumber(order)}</p>
                  <span>{customer}</span>
                </div>
                <strong>{currency.format((order.total_amount || 0) / 100)}</strong>
              </div>
                );
              })}
            </div>
          ) : (
            <p className="admin-empty-panel">No orders yet.</p>
          )}
        </section>
      </div>
      </>
      )}
    </>
  );
}

function OrdersPage() {
  const [orderRows, setOrderRows] = useState([]);
  const [profilesById, setProfilesById] = useState({});
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [savingStatusId, setSavingStatusId] = useState("");
  const [savingTrackingId, setSavingTrackingId] = useState("");
  const [timelineSort, setTimelineSort] = useState("desc");

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const createOrdersRequest = (includeOrderNumber) => supabase
        .from("orders")
        .select(`
          id,
          user_id,
          ${includeOrderNumber ? "order_number," : ""}
          total_amount,
          status,
          paid_at,
          tracking_id,
          dispatched_at,
          selected_address_id,
          delivery_address,
          shipping_method,
          shipping_amount,
          has_insurance,
          insurance_amount,
          crafting_speed,
          crafting_speed_fee,
          customer_name,
          customer_email,
          customer_phone,
          created_at,
          order_items (
            id,
            quantity,
            price,
            products (
              id,
              name,
              category,
              categories
            ),
            product_variants (
              name,
              image_url,
              image_urls
            ),
            custom_uploads (
              id,
              image_url,
              base_text,
              base_fee,
              custom_text_type,
              status,
              notes
            )
          )
        `)
        .neq("status", "pending")
        .order("created_at", { ascending: false });

      let ordersResult = await withRequestTimeout(createOrdersRequest(true));

      if (ordersResult.error && isMissingOrderNumberError(ordersResult.error)) {
        ordersResult = await withRequestTimeout(createOrdersRequest(false));
      }

      const { data, error: ordersError } = ordersResult;

      if (ordersError) throw ordersError;

      const fetchedOrders = data || [];
      setOrderRows(fetchedOrders);

      const userIds = [...new Set(fetchedOrders.map((order) => order.user_id).filter(Boolean))];

      if (userIds.length === 0) {
        setProfilesById({});
        return;
      }

      const { data: profiles, error: profilesError } = await withRequestTimeout(supabase
        .from("profiles")
        .select("id, first_name, last_name, email, phone")
        .in("id", userIds));

      if (profilesError) throw profilesError;

      setProfilesById(
        (profiles || []).reduce((map, profile) => ({
          ...map,
          [profile.id]: profile,
        }), {})
      );
    } catch (error) {
      console.error("Admin orders error:", error);
      setError(
        isTimeoutError(error)
          ? "Orders are taking too long to load. Please refresh in a moment."
          : "We could not load orders right now."
      );
      setOrderRows([]);
      setProfilesById({});
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const updateOrderStatus = async (orderId, status) => {
    setSavingStatusId(orderId);
    setError("");

    try {
      const currentOrder = orderRows.find((order) => order.id === orderId);
      const payload = { status };

      if (status === "dispatched" && !currentOrder?.dispatched_at) {
        payload.dispatched_at = new Date().toISOString();
      }

      const { error: updateError } = await supabase
        .from("orders")
        .update(payload)
        .eq("id", orderId);

      if (updateError) throw updateError;

      if (status === "cancelled") {
        const { error: stockError } = await supabase.rpc("restore_order_stock", {
          target_order_id: orderId,
        });

        if (stockError) throw stockError;
      } else if (currentOrder?.status === "cancelled") {
        const { error: stockError } = await supabase.rpc("deduct_order_stock", {
          target_order_id: orderId,
        });

        if (stockError) throw stockError;
      }

      setOrderRows((current) => current.map((order) => (
        order.id === orderId
          ? {
            ...order,
            ...payload,
            inventory_deducted_at: status === "cancelled"
              ? null
              : currentOrder?.status === "cancelled"
                ? new Date().toISOString()
                : order.inventory_deducted_at,
          }
          : order
      )));
    } catch (error) {
      console.error("Order status update error:", error);
      setError("We could not update that order stage.");
    } finally {
      setSavingStatusId("");
    }
  };

  const updateOrderTracking = async (orderId, trackingId) => {
    setSavingTrackingId(orderId);
    setError("");

    try {
      const payload = {
        tracking_id: trackingId.trim() || null,
      };

      const { error: updateError } = await supabase
        .from("orders")
        .update(payload)
        .eq("id", orderId);

      if (updateError) throw updateError;

      setOrderRows((current) => current.map((order) => (
        order.id === orderId ? { ...order, ...payload } : order
      )));
    } catch (error) {
      console.error("Order tracking update error:", error);
      setError("We could not update that tracking ID.");
    } finally {
      setSavingTrackingId("");
    }
  };

  const getCustomer = useCallback((order) => {
    const profile = profilesById[order.user_id] || {};
    const name = [profile.first_name, profile.last_name].filter(Boolean).join(" ");

    return {
      name: order.customer_name || name || "Customer name missing",
      email: order.customer_email || profile.email || "Email missing",
      phone: order.customer_phone || profile.phone || "Phone missing",
    };
  }, [profilesById]);

  const filteredOrders = useMemo(() => {
    const searchTerm = query.trim().toLowerCase();

    if (!searchTerm) return orderRows;

    return orderRows.filter((order) => {
      const customer = getCustomer(order);
      const itemsText = (order.order_items || []).map((item) => {
        const customUpload = item.custom_uploads?.[0] || {};

        return [
          item.products?.name,
          item.product_variants?.name,
          customUpload.base_text,
        ].filter(Boolean).join(" ");
      }).join(" ");

      return [
        order.id,
        formatOrderNumber(order),
        customer.name,
        customer.email,
        customer.phone,
        order.status,
        order.tracking_id,
        order.delivery_address?.full_name,
        order.delivery_address?.phone,
        formatAddressLine(order.delivery_address),
        order.has_insurance ? "armor guarantee" : "no armor",
        order.shipping_method,
        order.crafting_speed,
        itemsText,
      ].filter(Boolean).join(" ").toLowerCase().includes(searchTerm);
    });
  }, [getCustomer, orderRows, query]);

  const sortedOrders = useMemo(() => {
    const direction = timelineSort === "asc" ? 1 : -1;

    return [...filteredOrders].sort((firstOrder, secondOrder) => {
      const firstTime = getOrderDueDate(firstOrder)?.getTime() || 0;
      const secondTime = getOrderDueDate(secondOrder)?.getTime() || 0;

      if (firstTime === secondTime) {
        return String(firstOrder.id).localeCompare(String(secondOrder.id)) * direction;
      }

      return (firstTime - secondTime) * direction;
    });
  }, [filteredOrders, timelineSort]);

  return (
    <>
      <PageHeader
        title="Orders"
        description="Manage all customer orders and production status."
        action={<SearchField placeholder="Search orders..." value={query} onChange={setQuery} />}
      />

      {loading && <p className="admin-status-message">Loading orders...</p>}
      {!loading && error && <p className="admin-status-message text-error">{error}</p>}
      {!loading && !error && filteredOrders.length === 0 && (
        <p className="admin-status-message">No orders found.</p>
      )}

      {!loading && !error && filteredOrders.length > 0 && (
      <>
      <div className="admin-order-controls">
        <label className="admin-sort-control">
          <span>Sort timeline</span>
          <select
            value={timelineSort}
            onChange={(event) => setTimelineSort(event.target.value)}
            aria-label="Sort orders by production timeline"
          >
            <option value="desc">Descending</option>
            <option value="asc">Ascending</option>
          </select>
        </label>
      </div>

      <div className="admin-table-card">
        <table>
          <thead>
            <tr>
              <th>Order ID</th>
              <th>Customer</th>
              <th>Delivery</th>
              <th>Items</th>
              <th>Total</th>
              <th>Date</th>
              <th>Timeline</th>
              <th>Status / Stage</th>
              <th>Tracking</th>
            </tr>
          </thead>
          <tbody>
            {sortedOrders.map((order) => {
              const customer = getCustomer(order);
              const address = order.delivery_address || {};
              const itemCount = (order.order_items || []).reduce(
                (count, item) => count + (item.quantity || 0),
                0
              );

              return (
                <tr key={order.id} className={getAdminOrderRowClassName(order.status)}>
                  <td>#{formatOrderNumber(order)}</td>
                  <td className="admin-customer-cell">
                    <p>{customer.name}</p>
                    <span>{customer.email}</span>
                    <span>{customer.phone}</span>
                  </td>
                  <td>
                    <div className="admin-order-items">
                      <strong>{address.full_name || "Address not saved"}</strong>
                      {address.phone && <span>{address.phone}</span>}
                      {formatAddressLine(address) && <span>{formatAddressLine(address)}</span>}
                      <em>
                        Shipping: {formatChoiceLabel(order.shipping_method)}
                        {order.shipping_amount ? ` (${currency.format(order.shipping_amount / 100)})` : ""}
                      </em>
                      <em>
                        Armor: {order.has_insurance ? `Added (${currency.format((order.insurance_amount || 0) / 100)})` : "Not added"}
                      </em>
                      <em>
                        Crafting: {formatChoiceLabel(order.crafting_speed)}
                        {order.crafting_speed_fee ? ` (${currency.format(order.crafting_speed_fee / 100)})` : ""}
                      </em>
                      {address.delivery_notes && <span>Note: {address.delivery_notes}</span>}
                    </div>
                  </td>
                  <td>
                    <div className="admin-order-items">
                      <strong>{itemCount} item{itemCount === 1 ? "" : "s"}</strong>
                      {(order.order_items || []).map((item) => {
                        const product = item.products || {};
                        const variant = item.product_variants || {};
                        const customUpload = item.custom_uploads?.[0];

                        return (
                          <div className="admin-order-item-detail" key={item.id}>
                            <span>
                              {item.quantity || 1} x {product.name || "Puchi Puchi item"}
                              {variant.name ? ` - ${variant.name}` : ""}
                            </span>
                            {customUpload?.base_text && (
                              <em>
                                {customUpload.custom_text_type === "name_plate" ? "Name plate" : "Name"}: {customUpload.base_text}
                                {customUpload.base_fee ? ` (+${currency.format(customUpload.base_fee / 100)})` : ""}
                              </em>
                            )}
                            {customUpload?.image_url && (
                              <a href={customUpload.image_url} target="_blank" rel="noreferrer">
                                View custom pic
                              </a>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </td>
                  <td>{currency.format((order.total_amount || 0) / 100)}</td>
                  <td>{formatShortDate(order.paid_at || order.created_at)}</td>
                  <td>
                    <span className="admin-order-countdown">
                      {getCountdownLabel(order)}
                    </span>
                  </td>
                  <td className="admin-order-stage-cell">
                    <span className={`admin-status ${order.status !== "delivered" ? "accent" : ""}`}>
                      {formatOrderStatus(order.status)}
                    </span>
                    <select
                      value={getAdminOrderStatusValue(order.status)}
                      onChange={(event) => updateOrderStatus(order.id, event.target.value)}
                      aria-label={`${order.id} stage`}
                      disabled={savingStatusId === order.id}
                    >
                      {ORDER_STAGE_OPTIONS.map((stage) => (
                        <option value={stage.value} key={stage.value}>{stage.label}</option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <form
                      className="admin-tracking-form"
                      onSubmit={(event) => {
                        event.preventDefault();
                        updateOrderTracking(order.id, event.currentTarget.elements.trackingId.value);
                      }}
                    >
                      <input
                        name="trackingId"
                        type="text"
                        defaultValue={order.tracking_id || ""}
                        placeholder="Tracking ID"
                        aria-label={`${order.id} tracking ID`}
                      />
                      <button type="submit" disabled={savingTrackingId === order.id}>
                        Save
                      </button>
                    </form>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      </>
      )}
    </>
  );
}

function UsersPage() {
  const [userRows, setUserRows] = useState([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [profilesResult, ordersResult] = await Promise.all([
        withRequestTimeout(supabase
          .from("profiles")
          .select("id, first_name, last_name, email, created_at")
          .order("created_at", { ascending: false })),
        withRequestTimeout(supabase
          .from("orders")
          .select("id, user_id, total_amount, status")
          .neq("status", "pending")),
      ]);

      if (profilesResult.error) throw profilesResult.error;
      if (ordersResult.error) throw ordersResult.error;

      const orderStatsByUserId = (ordersResult.data || []).reduce((map, order) => {
        const current = map[order.user_id] || {
          count: 0,
          spent: 0,
        };

        return {
          ...map,
          [order.user_id]: {
            count: current.count + 1,
            spent: current.spent + (order.total_amount || 0),
          },
        };
      }, {});

      setUserRows(withSequentialDisplayIds(profilesResult.data || [], USER_DISPLAY_ID_START).map((profile) => {
        const stats = orderStatsByUserId[profile.id] || {
          count: 0,
          spent: 0,
        };

        return {
          ...profile,
          name: getProfileName(profile),
          orderCount: stats.count,
          totalSpent: stats.spent,
        };
      }));
    } catch (error) {
      console.error("Admin users error:", error);
      setError(
        isTimeoutError(error)
          ? "Users are taking too long to load. Please refresh in a moment."
          : "We could not load users right now."
      );
      setUserRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const filteredUsers = useMemo(() => {
    const searchTerm = query.trim().toLowerCase();

    if (!searchTerm) return userRows;

    return userRows.filter((user) => (
      [
        user.id,
        user.display_id,
        user.name,
        user.email,
      ].filter(Boolean).join(" ").toLowerCase().includes(searchTerm)
    ));
  }, [query, userRows]);

  return (
    <>
      <PageHeader
        title="Users"
        description="All registered customers."
        action={<SearchField placeholder="Search users..." value={query} onChange={setQuery} />}
      />

      {loading && <p className="admin-status-message">Loading users...</p>}
      {!loading && error && <p className="admin-status-message text-error">{error}</p>}
      {!loading && !error && filteredUsers.length === 0 && (
        <p className="admin-status-message">No users found.</p>
      )}

      {!loading && !error && filteredUsers.length > 0 && (
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
            {filteredUsers.map((user) => (
              <tr key={user.id}>
                <td>{user.display_id}</td>
                <td>{user.name}</td>
                <td>{user.email || "No email saved"}</td>
                <td>{formatShortDate(user.created_at) || "Unknown"}</td>
                <td>{user.orderCount}</td>
                <td>{currency.format(user.totalSpent / 100)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      )}
    </>
  );
}

function AdminReviewsPage() {
  const [reviews, setReviews] = useState([]);
  const [form, setForm] = useState(createBlankAdminReviewForm);
  const [replyDrafts, setReplyDrafts] = useState({});
  const [reviewProducts, setReviewProducts] = useState([]);
  const [isProductMenuOpen, setIsProductMenuOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingReplyId, setSavingReplyId] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const fetchReviews = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const { data, error } = await withRequestTimeout(supabase
        .from("reviews")
        .select("*")
        .order("review_date", { ascending: false })
        .order("created_at", { ascending: false }));

      if (error) throw error;

      setReviews(data || []);
      setReplyDrafts(Object.fromEntries((data || []).map((review) => [
        review.id,
        review.admin_reply_text || "",
      ])));
    } catch (error) {
      console.error("Admin reviews error:", error);
      setError(
        isTimeoutError(error)
          ? "Reviews are taking too long to load. Please refresh in a moment."
          : "We could not load reviews right now."
      );
      setReviews([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchReviewProducts = useCallback(async () => {
    try {
      const { data, error } = await withRequestTimeout(supabase
        .from("products")
        .select("id, name, categories, category, is_active")
        .order("name", { ascending: true }));

      if (error) throw error;

      setReviewProducts(data || []);
    } catch (error) {
      console.error("Admin review products error:", error);
      setReviewProducts([]);
      setError(
        isTimeoutError(error)
          ? "Products are taking too long to load. Please refresh in a moment."
          : "We could not load products for review selection."
      );
    }
  }, []);

  useEffect(() => {
    fetchReviews();
    fetchReviewProducts();
  }, [fetchReviews, fetchReviewProducts]);

  const filteredReviews = useMemo(() => {
    const searchTerm = query.trim().toLowerCase();

    if (!searchTerm) return reviews;

    return reviews.filter((review) => (
      [
        review.reviewer_first_name,
        review.place,
        review.product_name,
        review.review_text,
        review.admin_reply_text,
      ].filter(Boolean).join(" ").toLowerCase().includes(searchTerm)
    ));
  }, [query, reviews]);

  const filteredReviewProducts = useMemo(() => {
    const searchTerm = form.product_name.trim().toLowerCase();
    const products = reviewProducts.filter((product) => product.name);

    if (!searchTerm) return products.slice(0, 8);

    return products
      .filter((product) => {
        const categories = parseListField(product.categories || product.category).join(" ");

        return [product.name, categories]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(searchTerm);
      })
      .slice(0, 8);
  }, [form.product_name, reviewProducts]);

  const selectedReviewProduct = useMemo(() => {
    const productName = form.product_name.trim().toLowerCase();

    if (!productName) return null;

    return reviewProducts.find((product) => (
      product.name?.trim().toLowerCase() === productName
    )) || null;
  }, [form.product_name, reviewProducts]);

  const handleFormChange = (field, value) => {
    setError("");
    setMessage("");
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const handleProductInputChange = (value) => {
    handleFormChange("product_name", value.slice(0, 120));
    setIsProductMenuOpen(true);
  };

  const selectReviewProduct = (product) => {
    handleFormChange("product_name", product.name || "");
    setIsProductMenuOpen(false);
  };

  const saveReview = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");

    const payload = {
      reviewer_first_name: form.reviewer_first_name.trim(),
      place: form.place.trim(),
      product_name: form.product_name.trim(),
      rating: Number(form.rating),
      review_text: form.review_text.trim(),
      review_date: form.review_date,
      is_approved: form.is_approved,
      source: "legacy",
    };

    if (!payload.reviewer_first_name || !payload.place || !payload.product_name || !payload.review_text) {
      setError("Please fill every review field.");
      setSaving(false);
      return;
    }

    if (!selectedReviewProduct) {
      setError("Please choose a product from the list.");
      setSaving(false);
      setIsProductMenuOpen(true);
      return;
    }

    const { error } = await supabase
      .from("reviews")
      .insert(payload);

    if (error) {
      setError(error.message);
      setSaving(false);
      return;
    }

    setForm(createBlankAdminReviewForm());
    setMessage("Review saved.");
    setSaving(false);
    await fetchReviews();
  };

  const updateReviewApproval = async (review, isApproved) => {
    setError("");
    setMessage("");

    const { error } = await supabase
      .from("reviews")
      .update({ is_approved: isApproved })
      .eq("id", review.id);

    if (error) {
      setError(error.message);
      return;
    }

    setReviews((current) => current.map((item) => (
      item.id === review.id ? { ...item, is_approved: isApproved } : item
    )));
  };

  const handleReplyChange = (reviewId, value) => {
    setError("");
    setMessage("");
    setReplyDrafts((current) => ({
      ...current,
      [reviewId]: value.slice(0, 1000),
    }));
  };

  const saveReviewReply = async (review) => {
    const replyText = (replyDrafts[review.id] ?? review.admin_reply_text ?? "").trim();
    const replyDate = replyText ? new Date().toISOString() : null;

    setSavingReplyId(review.id);
    setError("");
    setMessage("");

    let savedReplyDate = replyDate;
    let { error } = await supabase
      .from("reviews")
      .update({
        admin_reply_text: replyText || null,
        admin_reply_date: replyDate,
      })
      .eq("id", review.id);

    if (isMissingReviewReplyColumnError(error, "admin_reply_date")) {
      savedReplyDate = review.admin_reply_date || null;
      ({ error } = await supabase
        .from("reviews")
        .update({
          admin_reply_text: replyText || null,
        })
        .eq("id", review.id));
    }

    if (error) {
      setError(
        isMissingReviewReplyColumnError(error, "admin_reply_text")
          ? ADMIN_REVIEW_REPLY_SCHEMA_ERROR
          : error.message
      );
      setSavingReplyId("");
      return;
    }

    setReviews((current) => current.map((item) => (
      item.id === review.id
        ? {
          ...item,
          admin_reply_text: replyText || null,
          admin_reply_date: savedReplyDate,
        }
        : item
    )));
    setReplyDrafts((current) => ({
      ...current,
      [review.id]: replyText,
    }));
    const replySaveMessage = replyText && !review.is_approved
      ? "Reply saved. It will show on the reviews page after this review is approved."
      : `Reply saved as ${ADMIN_REVIEW_REPLY_NAME}.`;

    setMessage(replyText ? replySaveMessage : "Reply removed.");
    setSavingReplyId("");
  };

  const getReviewReplyDraft = (review) => (
    replyDrafts[review.id] ?? review.admin_reply_text ?? ""
  );

  const getReviewReplyButtonLabel = (review) => {
    const replyText = getReviewReplyDraft(review).trim();

    if (savingReplyId === review.id) return "Saving...";
    if (!replyText && review.admin_reply_text) return "Remove Reply";
    return "Save Reply";
  };

  const isReviewReplySaveDisabled = (review) => (
    savingReplyId === review.id ||
    (!review.admin_reply_text && !getReviewReplyDraft(review).trim())
  );

  const deleteReview = async (review) => {
    const shouldDelete = window.confirm(`Delete review from ${review.reviewer_first_name}?`);

    if (!shouldDelete) return;

    setError("");
    setMessage("");

    const { error } = await supabase
      .from("reviews")
      .delete()
      .eq("id", review.id);

    if (error) {
      setError(error.message);
      return;
    }

    setReviews((current) => current.filter((item) => item.id !== review.id));
  };

  return (
    <>
      <PageHeader
        title="Reviews"
        description="Approve customer submissions and add older reviews from before the website."
        action={<SearchField placeholder="Search reviews..." value={query} onChange={setQuery} />}
      />

      <div className="admin-reviews-layout">
        <form className="admin-review-form admin-panel" onSubmit={saveReview}>
          <h2>Add Past Review</h2>
          <div className="admin-form-grid">
            <label>
              First name
              <input
                type="text"
                value={form.reviewer_first_name}
                onChange={(event) => handleFormChange("reviewer_first_name", event.target.value.slice(0, 40))}
                maxLength={40}
                required
              />
            </label>
            <label>
              Place
              <input
                type="text"
                value={form.place}
                onChange={(event) => handleFormChange("place", event.target.value.slice(0, 80))}
                maxLength={80}
                required
              />
            </label>
            <label className="admin-form-wide">
              Product name
              <div className="admin-product-combobox">
                <input
                  type="text"
                  value={form.product_name}
                  onChange={(event) => handleProductInputChange(event.target.value)}
                  onFocus={() => setIsProductMenuOpen(true)}
                  onBlur={() => window.setTimeout(() => setIsProductMenuOpen(false), 120)}
                  maxLength={120}
                  role="combobox"
                  aria-expanded={isProductMenuOpen}
                  aria-controls="admin-review-product-options"
                  aria-autocomplete="list"
                  autoComplete="off"
                  placeholder="Start typing a product"
                  required
                />
                <LuChevronDown aria-hidden="true" />
                {isProductMenuOpen && (
                  <div className="admin-product-options" id="admin-review-product-options" role="listbox">
                    {filteredReviewProducts.length > 0 ? (
                      filteredReviewProducts.map((product) => {
                        const categories = parseListField(product.categories || product.category);

                        return (
                          <button
                            type="button"
                            role="option"
                            aria-selected={selectedReviewProduct?.id === product.id}
                            key={product.id}
                            onMouseDown={(event) => event.preventDefault()}
                            onClick={() => selectReviewProduct(product)}
                          >
                            <span>{product.name}</span>
                            <small>
                              {categories.length ? categories.join(", ") : "Uncategorized"}
                              {product.is_active === false ? " - hidden" : ""}
                            </small>
                          </button>
                        );
                      })
                    ) : (
                      <p>No matching products.</p>
                    )}
                  </div>
                )}
              </div>
              <small className="admin-field-help">Choose one of the products already in the catalog.</small>
            </label>
            <label>
              Rating
              <select
                value={form.rating}
                onChange={(event) => handleFormChange("rating", event.target.value)}
              >
                <option value="5">5 stars</option>
                <option value="4">4 stars</option>
                <option value="3">3 stars</option>
                <option value="2">2 stars</option>
                <option value="1">1 star</option>
              </select>
            </label>
            <label>
              Review date
              <input
                type="date"
                value={form.review_date}
                onChange={(event) => handleFormChange("review_date", event.target.value)}
                required
              />
            </label>
            <label className="admin-form-wide">
              Review
              <textarea
                value={form.review_text}
                onChange={(event) => handleFormChange("review_text", event.target.value.slice(0, 1000))}
                rows={5}
                maxLength={1000}
                required
              />
            </label>
            <label className="admin-check admin-form-wide">
              <input
                type="checkbox"
                checked={form.is_approved}
                onChange={(event) => handleFormChange("is_approved", event.target.checked)}
              />
              <span>Show on reviews page immediately</span>
            </label>
          </div>
          {message && <p className="admin-form-success">{message}</p>}
          {error && <p className="admin-form-error text-error">{error}</p>}
          <button className="admin-add-product" type="submit" disabled={saving}>
            {saving ? "Saving..." : "Save Review"}
          </button>
        </form>

        <section className="admin-panel admin-review-list-panel">
          <h2>All Reviews</h2>
          {loading && <p className="admin-status-message">Loading reviews...</p>}
          {!loading && filteredReviews.length === 0 && (
            <p className="admin-empty-panel">No reviews found.</p>
          )}
          {!loading && filteredReviews.length > 0 && (
            <div className="admin-review-list">
              {filteredReviews.map((review) => (
                <article className="admin-review-card" key={review.id}>
                  <header>
                    <div>
                      <strong>{review.reviewer_first_name}</strong>
                      <span>{review.place} - {review.product_name}</span>
                    </div>
                    <em>{review.rating}/5</em>
                  </header>
                  <p>{review.review_text}</p>
                  <section className="admin-review-reply" aria-label={`Reply to ${review.reviewer_first_name}'s review`}>
                    <div className="admin-review-reply-heading">
                      <strong>Reply as {ADMIN_REVIEW_REPLY_NAME}</strong>
                      {review.admin_reply_date && (
                        <span>{formatShortDate(review.admin_reply_date)}</span>
                      )}
                    </div>
                    <textarea
                      value={getReviewReplyDraft(review)}
                      onChange={(event) => handleReplyChange(review.id, event.target.value)}
                      placeholder="Add a public reply..."
                      rows={3}
                      maxLength={1000}
                    />
                    <div className="admin-review-reply-actions">
                      <small>{getReviewReplyDraft(review).length}/1000 characters</small>
                      <button
                        type="button"
                        onClick={() => saveReviewReply(review)}
                        disabled={isReviewReplySaveDisabled(review)}
                      >
                        {getReviewReplyButtonLabel(review)}
                      </button>
                    </div>
                  </section>
                  <footer>
                    <span>{formatShortDate(review.review_date)} - {review.is_approved ? "Approved" : "Pending"}</span>
                    <div>
                      <button
                        type="button"
                        onClick={() => updateReviewApproval(review, !review.is_approved)}
                      >
                        {review.is_approved ? "Hide" : "Approve"}
                      </button>
                      <button className="admin-review-delete" type="button" onClick={() => deleteReview(review)}>
                        Delete
                      </button>
                    </div>
                  </footer>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </>
  );
}

function ProductFormModal({
  form,
  mode,
  onClose,
  onProductChange,
  onCategoryToggle,
  onCustomCategoryChange,
  onAddCustomCategory,
  onRemoveCategory,
  onVariantChange,
  onVariantImageChange,
  onAddVariantImage,
  onRemoveVariantImage,
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
            <p>Manage product details, categories, and size variants.</p>
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
            <label htmlFor="productCategories">Categories</label>
            <details className="admin-category-select">
              <summary id="productCategories">
                <span>
                  {form.categories.length
                    ? `${form.categories.length} selected`
                    : "Choose categories"}
                </span>
                <LuChevronDown />
              </summary>

              <div className="admin-category-menu">
                {PRODUCT_CATEGORY_OPTIONS.map((category) => (
                  <label className="admin-category-option" key={category}>
                    <input
                      type="checkbox"
                      checked={form.categories.includes(category)}
                      onChange={() => onCategoryToggle(category)}
                    />
                    <span>{category}</span>
                  </label>
                ))}

                <div className="admin-custom-category">
                  <input
                    type="text"
                    value={form.customCategory}
                    onChange={(event) => onCustomCategoryChange(event.target.value)}
                    placeholder="Add custom category"
                  />
                  <button type="button" onClick={onAddCustomCategory}>
                    <LuPlus />
                    <span>Add</span>
                  </button>
                </div>
              </div>
            </details>

            {form.categories.length > 0 && (
              <div className="admin-category-tags" aria-label="Selected categories">
                {form.categories.map((category) => (
                  <button
                    type="button"
                    key={category}
                    onClick={() => onRemoveCategory(category)}
                  >
                    <span>{category}</span>
                    <LuX />
                  </button>
                ))}
              </div>
            )}
          </fieldset>

          <fieldset className="admin-form-wide">
            <label htmlFor="productDescription">Description</label>
            <RichTextEditor
              id="productDescription"
              value={form.description}
              onChange={(value) => onProductChange("description", value)}
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

        <div className="admin-option-panel">
          <div>
            <h3>Name options</h3>
            <p>Choose which personalization choices customers can add on the product page.</p>
          </div>
          <div className="admin-checkbox-grid">
            {[
              ["allow_name_plate", "Add name plate (+100)"],
              ["allow_custom_name", "Add name (no extra cost)"],
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
                  <div className="admin-variant-images-heading">
                    <label>Variant Images</label>
                    <button
                      type="button"
                      onClick={() => onAddVariantImage(index)}
                      disabled={variant.image_urls.length >= 5}
                    >
                      <LuImagePlus />
                      <span>Add Image</span>
                    </button>
                  </div>

                  <div className="admin-variant-images">
                    {variant.image_urls.map((imageUrl, imageIndex) => (
                      <div className="admin-variant-image-row" key={imageIndex}>
                        <input
                          id={`variantImage-${index}-${imageIndex}`}
                          type="url"
                          value={imageUrl}
                          placeholder={`Image URL ${imageIndex + 1}`}
                          onChange={(event) => onVariantImageChange(index, imageIndex, event.target.value)}
                        />
                        {variant.image_urls.length > 1 && (
                          <button
                            type="button"
                            aria-label={`Remove image ${imageIndex + 1}`}
                            onClick={() => onRemoveVariantImage(index, imageIndex)}
                          >
                            <LuTrash2 />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                  <small className="admin-field-help">Add up to 5 images. The first image is used as the main storefront image.</small>
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

    try {
      const { data, error: fetchError } = await withRequestTimeout(supabase
        .from("products")
        .select(`
          *,
          product_variants (
            *
          )
        `)
        .order("created_at", { ascending: false }));

      if (fetchError) {
        console.error("Admin products fetch error:", fetchError);
        setError(fetchError.message);
        setProducts([]);
      } else {
        setProducts(data || []);
      }
    } catch (error) {
      console.error("Admin products fetch error:", error);
      setError(
        isTimeoutError(error)
          ? "Products are taking too long to load. Please refresh in a moment."
          : error.message
      );
      setProducts([]);
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
      const categories = parseListField(product.categories || product.category).join(" ");
      const description = stripRichText(product.description);

      return [product.name, categories, description]
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
    const activeVariants = (product.product_variants || []).filter((variant) => variant.is_active !== false);
    const variants = activeVariants.length
      ? activeVariants.map((variant) => ({
        id: variant.id,
        name: variant.name || "",
        price: centsToRupees(variant.price),
        discount_price: centsToRupees(variant.discount_price),
        stock: String(variant.stock ?? 0),
        image_urls: parseListField(variant.image_urls || variant.image_url).length
          ? parseListField(variant.image_urls || variant.image_url).slice(0, 5)
          : [""],
        is_active: variant.is_active ?? true,
      }))
      : [createBlankVariant()];

    setForm({
      name: product.name || "",
      categories: parseListField(product.categories || product.category),
      customCategory: "",
      description: product.description || "",
      is_custom: product.is_custom ?? false,
      is_active: product.is_active ?? true,
      is_featured: product.is_featured ?? false,
      is_best_seller: product.is_best_seller ?? false,
      is_new_arrival: product.is_new_arrival ?? false,
      allow_custom_name: product.allow_custom_name ?? false,
      allow_name_plate: product.allow_name_plate ?? false,
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

  const toggleCategory = (category) => {
    setForm((current) => {
      const exists = current.categories.includes(category);

      return {
        ...current,
        categories: exists
          ? current.categories.filter((item) => item !== category)
          : [...current.categories, category],
      };
    });
  };

  const addCustomCategory = () => {
    const category = normalizeListValue(form.customCategory);

    if (!category) return;

    setForm((current) => ({
      ...current,
      categories: current.categories.includes(category)
        ? current.categories
        : [...current.categories, category],
      customCategory: "",
    }));
  };

  const removeCategory = (category) => {
    setForm((current) => ({
      ...current,
      categories: current.categories.filter((item) => item !== category),
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

  const handleVariantImageChange = (variantIndex, imageIndex, value) => {
    setForm((current) => ({
      ...current,
      variants: current.variants.map((variant, currentVariantIndex) => {
        if (currentVariantIndex !== variantIndex) return variant;

        return {
          ...variant,
          image_urls: variant.image_urls.map((imageUrl, currentImageIndex) => (
            currentImageIndex === imageIndex ? value : imageUrl
          )),
        };
      }),
    }));
  };

  const addVariantImage = (variantIndex) => {
    setForm((current) => ({
      ...current,
      variants: current.variants.map((variant, currentVariantIndex) => (
        currentVariantIndex === variantIndex && variant.image_urls.length < 5
          ? { ...variant, image_urls: [...variant.image_urls, ""] }
          : variant
      )),
    }));
  };

  const removeVariantImage = (variantIndex, imageIndex) => {
    setForm((current) => ({
      ...current,
      variants: current.variants.map((variant, currentVariantIndex) => {
        if (currentVariantIndex !== variantIndex) return variant;

        const nextImages = variant.image_urls.filter((_, currentImageIndex) => (
          currentImageIndex !== imageIndex
        ));

        return {
          ...variant,
          image_urls: nextImages.length ? nextImages : [""],
        };
      }),
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

    const categories = form.categories.map(normalizeListValue).filter(Boolean);
    const variants = form.variants.map((variant) => {
      const imageUrls = variant.image_urls
        .map(normalizeListValue)
        .filter(Boolean)
        .slice(0, 5);

      return {
        id: variant.id,
        name: variant.name.trim() || null,
        price: rupeesToCents(variant.price),
        discount_price: variant.discount_price === "" ? null : rupeesToCents(variant.discount_price),
        stock: Number(variant.stock || 0),
        image_url: imageUrls[0] || null,
        image_urls: imageUrls,
        is_active: variant.is_active,
      };
    });

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
      category: categories[0] || null,
      categories,
      description: sanitizeRichText(form.description) || null,
      is_custom: form.is_custom,
      is_active: form.is_active,
      is_featured: form.is_featured,
      is_best_seller: form.is_best_seller,
      is_new_arrival: form.is_new_arrival,
      allow_custom_name: form.allow_custom_name,
      allow_name_plate: form.allow_name_plate,
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
      const originalVariantIds = (editingProduct.product_variants || [])
        .map((variant) => variant.id)
        .filter(Boolean);
      const savedVariantIds = variants
        .map((variant) => variant.id)
        .filter(Boolean);
      const removedVariantIds = originalVariantIds.filter((id) => !savedVariantIds.includes(id));

      if (removedVariantIds.length > 0) {
        const { error: removeError } = await supabase
          .from("product_variants")
          .update({ is_active: false })
          .eq("product_id", savedProduct.id)
          .in("id", removedVariantIds);

        if (removeError) {
          setFormError(removeError.message);
          setSaving(false);
          return;
        }
      }
    }

    for (const variant of variants) {
      const { id, ...variantPayload } = variant;
      if (id) {
        const { data: updatedVariant, error: variantError } = await supabase
          .from("product_variants")
          .update(variantPayload)
          .eq("id", id)
          .eq("product_id", savedProduct.id)
          .select("id")
          .maybeSingle();

        if (variantError) {
          setFormError(variantError.message);
          setSaving(false);
          return;
        }

        if (!updatedVariant) {
          setFormError("One variant could not be updated. Please refresh and try again.");
          setSaving(false);
          return;
        }

        continue;
      }

      const { error: variantError } = await supabase
          .from("product_variants")
          .insert({
            ...variantPayload,
            product_id: savedProduct.id,
          });

      if (variantError) {
        setFormError(variantError.message);
        setSaving(false);
        return;
      }
    }

    await fetchProducts();
    setSaving(false);
    setModalMode(null);
    setEditingProduct(null);
  };

  const deleteProduct = async (product) => {
    const shouldDelete = window.confirm(
      `Delete ${product.name}? It will be hidden from the shop without removing order history.`
    );

    if (!shouldDelete) return;

    setError("");

    const { error: productError } = await supabase
      .from("products")
      .update({ is_active: false })
      .eq("id", product.id);

    if (productError) {
      setError(productError.message);
      return;
    }

    const { error: variantsError } = await supabase
      .from("product_variants")
      .update({ is_active: false })
      .eq("product_id", product.id);

    if (variantsError) {
      setError(variantsError.message);
      return;
    }

    await fetchProducts();
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
            const variants = (product.product_variants || []).filter((variant) => variant.is_active !== false);
            const activeVariant = variants[0];
            const price = activeVariant?.discount_price || activeVariant?.price || 0;
            const image = parseListField(activeVariant?.image_urls || activeVariant?.image_url)[0] || PRODUCT_PLACEHOLDER_IMAGE;
            const categories = parseListField(product.categories || product.category);

            return (
              <article className="admin-product-card" key={product.id}>
                <img src={image} alt={product.name} />
                <p>{categories.length ? categories.join(", ") : "Uncategorized"}</p>
                <h3>{product.name}</h3>
                <strong>{currency.format(price / 100)}</strong>
                <small>{variants.length} variant{variants.length === 1 ? "" : "s"}</small>
                <div className="admin-product-actions">
                  <button type="button" onClick={() => openEditModal(product)}>
                    <LuPenLine />
                    <span>Edit</span>
                  </button>
                  <button type="button" onClick={() => deleteProduct(product)}>
                    <LuTrash2 />
                    <span>Delete</span>
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
          onCategoryToggle={toggleCategory}
          onCustomCategoryChange={(value) => handleProductChange("customCategory", value)}
          onAddCustomCategory={addCustomCategory}
          onRemoveCategory={removeCategory}
          onVariantChange={handleVariantChange}
          onVariantImageChange={handleVariantImageChange}
          onAddVariantImage={addVariantImage}
          onRemoveVariantImage={removeVariantImage}
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
          <Route path="reviews" element={<AdminReviewsPage />} />
          <Route path="products" element={<ProductsPage />} />
        </Routes>
      </section>
    </main>
  );
}

export default Admin;
