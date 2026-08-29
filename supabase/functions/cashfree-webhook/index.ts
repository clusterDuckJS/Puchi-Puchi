import { serve } from "https://deno.land/std@0.224.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.99.3"

const jsonResponse = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  })

const createWebhookSignature = async (timestamp: string, rawPayload: string, secret: string) => {
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  )
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(`${timestamp}${rawPayload}`))

  return btoa(String.fromCharCode(...new Uint8Array(signature)))
}

const signaturesMatch = (expected: string, received: string) => {
  if (expected.length !== received.length) return false

  let difference = 0

  for (let index = 0; index < expected.length; index += 1) {
    difference |= expected.charCodeAt(index) ^ received.charCodeAt(index)
  }

  return difference === 0
}

const getPaymentTime = (value: unknown) => {
  if (typeof value !== "string") return new Date().toISOString()

  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString()
}

serve(async (request) => {
  if (request.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405)
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")
  const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
  const cashfreeSecretKey = Deno.env.get("CASHFREE_SECRET_KEY")

  if (!supabaseUrl || !supabaseServiceRoleKey || !cashfreeSecretKey) {
    return jsonResponse({ error: "Webhook secrets are missing." }, 500)
  }

  const timestamp = request.headers.get("x-webhook-timestamp") || ""
  const receivedSignature = request.headers.get("x-webhook-signature") || ""
  const rawPayload = await request.text()

  if (!timestamp || !receivedSignature || !rawPayload) {
    return jsonResponse({ error: "Webhook signature or payload is missing." }, 400)
  }

  const expectedSignature = await createWebhookSignature(timestamp, rawPayload, cashfreeSecretKey)

  if (!signaturesMatch(expectedSignature, receivedSignature)) {
    return jsonResponse({ error: "Webhook signature is invalid." }, 401)
  }

  const payload = await Promise.resolve(rawPayload)
    .then(JSON.parse)
    .catch(() => null)

  const cashfreeOrderId = typeof payload?.data?.order?.order_id === "string"
    ? payload.data.order.order_id
    : ""
  const taggedOrderId = typeof payload?.data?.order?.order_tags?.supabase_order_id === "string"
    ? payload.data.order.order_tags.supabase_order_id
    : ""
  const paymentStatus = String(payload?.data?.payment?.payment_status || "").toUpperCase()
  const paymentId = payload?.data?.payment?.cf_payment_id

  if (!cashfreeOrderId || !paymentStatus) {
    return jsonResponse({ error: "Webhook payment data is incomplete." }, 400)
  }

  const serviceClient = createClient(supabaseUrl, supabaseServiceRoleKey)
  let orderResult = await serviceClient
    .from("orders")
    .select("id, total_amount, cashfree_order_id")
    .eq("cashfree_order_id", cashfreeOrderId)
    .maybeSingle()

  if (!orderResult.data && !orderResult.error && taggedOrderId) {
    orderResult = await serviceClient
      .from("orders")
      .select("id, total_amount, cashfree_order_id")
      .eq("id", taggedOrderId)
      .maybeSingle()
  }

  if (orderResult.error) {
    console.error("Cashfree webhook order lookup error:", orderResult.error)
    return jsonResponse({ error: "Could not find the local order." }, 500)
  }

  const order = orderResult.data

  if (!order || (order.cashfree_order_id && order.cashfree_order_id !== cashfreeOrderId)) {
    return jsonResponse({ error: "Webhook order does not match a local checkout." }, 400)
  }

  const paymentUpdate = {
    cashfree_order_id: cashfreeOrderId,
    cashfree_payment_id: paymentId ? String(paymentId) : null,
    cashfree_payment_status: paymentStatus,
  }

  if (paymentStatus !== "SUCCESS") {
    const { error } = await serviceClient
      .from("orders")
      .update(paymentUpdate)
      .eq("id", order.id)

    if (error) {
      console.error("Cashfree payment status update error:", error)
      return jsonResponse({ error: "Could not store the payment status." }, 500)
    }

    return jsonResponse({ received: true, payment_status: paymentStatus })
  }

  const cashfreeAmount = Number(payload?.data?.order?.order_amount)
  const expectedAmount = Number(order.total_amount || 0) / 100

  if (!Number.isFinite(cashfreeAmount) || Math.round(cashfreeAmount * 100) !== Math.round(expectedAmount * 100)) {
    console.error("Cashfree webhook amount mismatch:", { cashfreeOrderId, cashfreeAmount, expectedAmount })
    return jsonResponse({ error: "Webhook payment amount does not match the local order." }, 400)
  }

  const { error: paidOrderError } = await serviceClient
    .from("orders")
    .update({
      ...paymentUpdate,
      status: "paid",
      paid_at: getPaymentTime(payload?.data?.payment?.payment_time),
    })
    .eq("id", order.id)

  if (paidOrderError) {
    console.error("Cashfree paid order update error:", paidOrderError)
    return jsonResponse({ error: "Could not mark the local order as paid." }, 500)
  }

  const { error: orderNumberError } = await serviceClient.rpc("assign_order_number", {
    target_order_id: order.id,
  })

  if (orderNumberError) {
    console.error("Cashfree order number assignment error:", orderNumberError)
    return jsonResponse({ error: "Could not assign an order number." }, 500)
  }

  const { error: stockError } = await serviceClient.rpc("deduct_order_stock", {
    target_order_id: order.id,
  })

  if (stockError) {
    console.error("Cashfree stock deduction error:", stockError)
    return jsonResponse({ error: "Could not reserve order stock." }, 500)
  }

  return jsonResponse({ received: true, payment_status: paymentStatus })
})
