import { serve } from "https://deno.land/std@0.224.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.99.3"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
}

const SHIPPING_OPTIONS = {
  standard: 8000,
  priority: 20000,
}

const INSURANCE_AMOUNT = 10000
const PRIORITY_CRAFTING_MULTIPLIER = 0.5
const FREE_STANDARD_SHIPPING_THRESHOLD = 100000

const jsonResponse = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  })

const getCashfreeErrorMessage = (data: Record<string, unknown>) => {
  if (typeof data.message === "string") return data.message
  if (typeof data.error === "string") return data.error
  if (typeof data.type === "string") return data.type

  return "Cashfree order creation failed."
}

const normalizePhone = (phone?: string | null) => {
  const digits = phone?.replace(/\D/g, "") || ""

  if (digits.length === 12 && digits.startsWith("91")) {
    return digits.slice(2)
  }

  return digits
}

serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  if (request.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405)
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")
  const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
  const cashfreeAppId = Deno.env.get("CASHFREE_APP_ID")
  const cashfreeSecretKey = Deno.env.get("CASHFREE_SECRET_KEY")
  const cashfreeApiVersion = Deno.env.get("CASHFREE_API_VERSION") || "2025-01-01"
  const cashfreeBaseUrl = Deno.env.get("CASHFREE_BASE_URL") || "https://api.cashfree.com/pg"
  const siteUrl = Deno.env.get("SITE_URL") || request.headers.get("origin")

  if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
    return jsonResponse({ error: "Supabase function secrets are missing." }, 500)
  }

  if (!cashfreeAppId || !cashfreeSecretKey) {
    return jsonResponse({ error: "Cashfree credentials are missing." }, 500)
  }

  if (!siteUrl) {
    return jsonResponse({ error: "SITE_URL is missing." }, 500)
  }

  const authorization = request.headers.get("Authorization")

  if (!authorization) {
    return jsonResponse({ error: "Please log in before checkout." }, 401)
  }

  const userClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: { Authorization: authorization },
    },
  })
  const serviceClient = createClient(supabaseUrl, supabaseServiceRoleKey)
  const { data: userData, error: userError } = await userClient.auth.getUser()

  if (userError || !userData.user) {
    return jsonResponse({ error: "Please log in before checkout." }, 401)
  }

  const user = userData.user
  const body = await request.json().catch(() => ({}))
  const orderId = typeof body.orderId === "string" ? body.orderId : ""
  const addressId = typeof body.addressId === "string" ? body.addressId : ""
  const shippingMethod = body.shippingMethod === "priority" ? "priority" : "standard"
  const hasInsurance = body.hasInsurance === true
  const craftingSpeed = body.craftingSpeed === "priority" ? "priority" : "standard"

  if (!orderId) {
    return jsonResponse({ error: "Cart order is missing." }, 400)
  }

  if (!addressId) {
    return jsonResponse({ error: "Please select a delivery address before checkout." }, 400)
  }

  const { data: order, error: orderError } = await serviceClient
    .from("orders")
    .select("id, user_id, status")
    .eq("id", orderId)
    .eq("user_id", user.id)
    .eq("status", "pending")
    .single()

  if (orderError || !order) {
    return jsonResponse({ error: "We could not find your pending cart." }, 404)
  }

  const { data: items, error: itemsError } = await serviceClient
    .from("order_items")
    .select(`
      quantity,
      price,
      variant_id,
      products (
        name
      ),
      product_variants (
        name,
        stock,
        is_active
      )
    `)
    .eq("order_id", order.id)

  if (itemsError) {
    return jsonResponse({ error: "We could not read your cart items." }, 500)
  }

  const variantQuantities = new Map<string, {
    quantity: number
    stock: number
    isActive: boolean
    name: string
  }>()

  for (const item of items || []) {
    if (!item.variant_id) continue

    const variant = Array.isArray(item.product_variants)
      ? item.product_variants[0]
      : item.product_variants
    const product = Array.isArray(item.products)
      ? item.products[0]
      : item.products
    const current = variantQuantities.get(item.variant_id)

    variantQuantities.set(item.variant_id, {
      quantity: (current?.quantity || 0) + (Number(item.quantity) || 0),
      stock: Math.max(0, Number(variant?.stock) || 0),
      isActive: variant?.is_active !== false,
      name: [product?.name, variant?.name].filter(Boolean).join(" - ") || "This item",
    })
  }

  for (const item of variantQuantities.values()) {
    if (!item.isActive || item.stock <= 0) {
      return jsonResponse({ error: `${item.name} is out of stock.` }, 400)
    }

    if (item.quantity > item.stock) {
      return jsonResponse({
        error: `${item.name} only has ${item.stock} ${item.stock === 1 ? "item" : "items"} left.`,
      }, 400)
    }
  }

  const subtotal = (items || []).reduce(
    (sum, item) => sum + (item.quantity || 0) * (item.price || 0),
    0,
  )

  if (subtotal <= 0) {
    return jsonResponse({ error: "Your cart is empty." }, 400)
  }

  const { data: address, error: addressError } = await serviceClient
    .from("user_addresses")
    .select("id, label, full_name, phone, address_line1, address_line2, city, state, pincode, country, delivery_notes")
    .eq("id", addressId)
    .eq("user_id", user.id)
    .single()

  if (addressError || !address) {
    return jsonResponse({ error: "Please select a valid delivery address." }, 400)
  }

  const shipping =
    shippingMethod === "standard" && subtotal >= FREE_STANDARD_SHIPPING_THRESHOLD
      ? 0
      : SHIPPING_OPTIONS[shippingMethod]
  const insurance = hasInsurance ? INSURANCE_AMOUNT : 0
  const craftingSpeedFee =
    craftingSpeed === "priority" ? Math.round(subtotal * PRIORITY_CRAFTING_MULTIPLIER) : 0
  const total = subtotal + shipping + insurance + craftingSpeedFee

  const { data: profile, error: profileError } = await serviceClient
    .from("profiles")
    .select("email, first_name, last_name, phone")
    .eq("id", user.id)
    .single()

  if (profileError || !profile) {
    return jsonResponse({ error: "Please complete your profile before checkout." }, 400)
  }

  const customerPhone = normalizePhone(
    address.phone ||
      profile.phone ||
      (typeof user.user_metadata?.phone === "string" ? user.user_metadata.phone : null) ||
      user.phone,
  )

  if (customerPhone.length < 10) {
    return jsonResponse({ error: "Please add a valid phone number in your profile." }, 400)
  }

  const profileName = [profile.first_name, profile.last_name].filter(Boolean).join(" ")
  const customerName = address.full_name || profileName
  const customerEmail = profile.email || user.email || null
  const cashfreeOrderId = `puchi_${order.id.replaceAll("-", "")}_${Date.now()}`
  const cashfreePayload = {
    order_id: cashfreeOrderId,
    order_amount: Number((total / 100).toFixed(2)),
    order_currency: "INR",
    customer_details: {
      customer_id: user.id,
      customer_name: customerName,
      customer_email: customerEmail,
      customer_phone: customerPhone,
    },
    order_meta: {
      return_url: `${siteUrl.replace(/\/$/, "")}/payment-status?order_id={order_id}`,
    },
    order_note: "Puchi Puchi cart checkout",
    order_tags: {
      supabase_order_id: order.id,
      shipping_method: shippingMethod,
      insurance: hasInsurance ? "yes" : "no",
      crafting_speed: craftingSpeed,
      address_id: address.id,
      delivery_pincode: address.pincode,
    },
  }

  const cashfreeResponse = await fetch(`${cashfreeBaseUrl}/orders`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-version": cashfreeApiVersion,
      "x-client-id": cashfreeAppId,
      "x-client-secret": cashfreeSecretKey,
      "x-idempotency-key": cashfreeOrderId,
    },
    body: JSON.stringify(cashfreePayload),
  })

  const cashfreeData = await cashfreeResponse.json().catch(() => ({}))

  if (!cashfreeResponse.ok) {
    return jsonResponse(
      {
        error: getCashfreeErrorMessage(cashfreeData),
        cashfree: cashfreeData,
      },
      cashfreeResponse.status,
    )
  }

  await serviceClient
    .from("orders")
    .update({
      customer_name: customerName || null,
      customer_email: customerEmail,
      customer_phone: customerPhone || null,
      total_amount: total,
      selected_address_id: address.id,
      delivery_address: {
        label: address.label,
        full_name: address.full_name,
        phone: address.phone,
        address_line1: address.address_line1,
        address_line2: address.address_line2,
        city: address.city,
        state: address.state,
        pincode: address.pincode,
        country: address.country,
        delivery_notes: address.delivery_notes,
      },
      shipping_method: shippingMethod,
      shipping_amount: shipping,
      has_insurance: hasInsurance,
      insurance_amount: insurance,
      crafting_speed: craftingSpeed,
      crafting_speed_fee: craftingSpeedFee,
    })
    .eq("id", order.id)

  return jsonResponse({
    order_id: cashfreeData.order_id,
    payment_session_id: cashfreeData.payment_session_id,
  })
})
