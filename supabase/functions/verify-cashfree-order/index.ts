import { serve } from "https://deno.land/std@0.224.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.99.3"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
}

const jsonResponse = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  })

serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  if (request.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405)
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")
  const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
  const cashfreeAppId = Deno.env.get("CASHFREE_APP_ID")
  const cashfreeSecretKey = Deno.env.get("CASHFREE_SECRET_KEY")
  const cashfreeApiVersion = Deno.env.get("CASHFREE_API_VERSION") || "2025-01-01"
  const cashfreeBaseUrl = Deno.env.get("CASHFREE_BASE_URL") || "https://api.cashfree.com/pg"

  if (!supabaseUrl || !supabaseServiceRoleKey || !cashfreeAppId || !cashfreeSecretKey) {
    return jsonResponse({ error: "Payment verification secrets are missing." }, 500)
  }

  const body = await request.json().catch(() => ({}))
  const cashfreeOrderId = typeof body.orderId === "string" ? body.orderId : ""

  if (!cashfreeOrderId) {
    return jsonResponse({ error: "Cashfree order id is missing." }, 400)
  }

  const cashfreeResponse = await fetch(`${cashfreeBaseUrl}/orders/${cashfreeOrderId}`, {
    headers: {
      "x-api-version": cashfreeApiVersion,
      "x-client-id": cashfreeAppId,
      "x-client-secret": cashfreeSecretKey,
    },
  })
  const cashfreeData = await cashfreeResponse.json().catch(() => ({}))

  if (!cashfreeResponse.ok) {
    return jsonResponse(
      {
        error: cashfreeData.message || cashfreeData.error || "Cashfree verification failed.",
      },
      cashfreeResponse.status,
    )
  }

  const supabaseOrderId = cashfreeData.order_tags?.supabase_order_id
  const orderStatus = cashfreeData.order_status

  if (supabaseOrderId && orderStatus === "PAID") {
    const serviceClient = createClient(supabaseUrl, supabaseServiceRoleKey)
    await serviceClient
      .from("orders")
      .update({ status: "paid", paid_at: new Date().toISOString() })
      .eq("id", supabaseOrderId)

    await serviceClient.rpc("assign_order_number", {
      target_order_id: supabaseOrderId,
    })
  }

  return jsonResponse({
    order_id: cashfreeData.order_id,
    order_status: orderStatus,
    order_amount: cashfreeData.order_amount,
  })
})
