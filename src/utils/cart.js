import { supabase } from "./supabase"

export const CART_UPDATED_EVENT = "puchi-cart-updated"

export const formatCartPrice = (amount = 0) =>
  `\u20b9${((amount || 0) / 100).toLocaleString("en-IN")}`

const notifyCartUpdated = () => {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(CART_UPDATED_EVENT))
  }
}

export const getCurrentUserId = async () => {
  const { data, error } = await supabase.auth.getSession()

  if (error) throw error

  return data.session?.user?.id || null
}

export const getPendingOrder = async (userId) => {
  if (!userId) return null

  const { data, error } = await supabase
    .from("orders")
    .select("id, total_amount, status, created_at")
    .eq("user_id", userId)
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) throw error

  return data
}

export const getOrCreatePendingOrder = async (userId) => {
  const existingOrder = await getPendingOrder(userId)

  if (existingOrder) return existingOrder

  const { data, error } = await supabase
    .from("orders")
    .insert({
      user_id: userId,
      total_amount: 0,
      status: "pending",
    })
    .select("id, total_amount, status, created_at")
    .single()

  if (error) throw error

  return data
}

export const recalculateOrderTotal = async (orderId) => {
  const { data, error } = await supabase
    .from("order_items")
    .select("quantity, price")
    .eq("order_id", orderId)

  if (error) throw error

  const total = (data || []).reduce(
    (sum, item) => sum + (item.quantity || 0) * (item.price || 0),
    0,
  )

  const { error: updateError } = await supabase
    .from("orders")
    .update({ total_amount: total })
    .eq("id", orderId)

  if (updateError) throw updateError

  return total
}

export const addItemToCart = async ({
  userId,
  productId,
  variantId,
  quantity,
  price,
}) => {
  if (!userId) {
    throw new Error("Please log in before adding items to your cart.")
  }

  if (!productId || !variantId || !price) {
    throw new Error("Please choose an available product variant.")
  }

  const order = await getOrCreatePendingOrder(userId)
  const nextQuantity = Math.max(1, Number(quantity) || 1)

  const { data: existingItem, error: itemError } = await supabase
    .from("order_items")
    .select("id, quantity")
    .eq("order_id", order.id)
    .eq("product_id", productId)
    .eq("variant_id", variantId)
    .limit(1)
    .maybeSingle()

  if (itemError) throw itemError

  if (existingItem) {
    const { error } = await supabase
      .from("order_items")
      .update({
        quantity: (existingItem.quantity || 0) + nextQuantity,
        price,
      })
      .eq("id", existingItem.id)

    if (error) throw error
  } else {
    const { error } = await supabase
      .from("order_items")
      .insert({
        order_id: order.id,
        product_id: productId,
        variant_id: variantId,
        quantity: nextQuantity,
        price,
      })

    if (error) throw error
  }

  await recalculateOrderTotal(order.id)
  notifyCartUpdated()

  return order
}

export const getCartItemCount = async (userId) => {
  const order = await getPendingOrder(userId)

  if (!order) return 0

  const { data, error } = await supabase
    .from("order_items")
    .select("quantity")
    .eq("order_id", order.id)

  if (error) throw error

  return (data || []).reduce((count, item) => count + (item.quantity || 0), 0)
}

export const fetchCart = async (userId) => {
  const order = await getPendingOrder(userId)

  if (!order) {
    return {
      order: null,
      items: [],
      subtotal: 0,
    }
  }

  const { data, error } = await supabase
    .from("order_items")
    .select(`
      id,
      product_id,
      variant_id,
      quantity,
      price,
      products (
        id,
        name,
        category
      ),
      product_variants (
        id,
        name,
        image_url,
        price,
        discount_price
      )
    `)
    .eq("order_id", order.id)
    .order("created_at", { ascending: true })

  if (error) throw error

  const items = data || []
  const subtotal = items.reduce(
    (sum, item) => sum + (item.quantity || 0) * (item.price || 0),
    0,
  )

  return {
    order: {
      ...order,
      total_amount: subtotal,
    },
    items,
    subtotal,
  }
}

export const updateCartItemQuantity = async ({ itemId, orderId, quantity }) => {
  const nextQuantity = Math.max(0, Number(quantity) || 0)

  if (nextQuantity === 0) {
    const { error } = await supabase
      .from("order_items")
      .delete()
      .eq("id", itemId)

    if (error) throw error
  } else {
    const { error } = await supabase
      .from("order_items")
      .update({ quantity: nextQuantity })
      .eq("id", itemId)

    if (error) throw error
  }

  await recalculateOrderTotal(orderId)
  notifyCartUpdated()
}

export const removeCartItem = async ({ itemId, orderId }) => {
  const { error } = await supabase
    .from("order_items")
    .delete()
    .eq("id", itemId)

  if (error) throw error

  await recalculateOrderTotal(orderId)
  notifyCartUpdated()
}
