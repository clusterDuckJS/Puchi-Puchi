import { supabase } from "./supabase"

export const CART_UPDATED_EVENT = "puchi-cart-updated"
export const CUSTOM_BASE_FEE = 10000

export const formatCartPrice = (amount = 0) =>
  `\u20b9${((amount || 0) / 100).toLocaleString("en-IN")}`

export const parseCartListField = (value) => {
  if (Array.isArray(value)) return value.map(String).filter(Boolean)
  if (!value) return []
  return String(value).split(",").map((item) => item.trim()).filter(Boolean)
}

export const notifyCartUpdated = () => {
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

const getVariantStock = async (variantId) => {
  const { data, error } = await supabase
    .from("product_variants")
    .select("stock, is_active")
    .eq("id", variantId)
    .single()

  if (error) throw error

  if (!data || data.is_active === false) {
    throw new Error("Please choose an available product variant.")
  }

  return Math.max(0, Number(data.stock) || 0)
}

const getOrderVariantQuantity = async ({ orderId, variantId, exceptItemId = null }) => {
  let query = supabase
    .from("order_items")
    .select("id, quantity")
    .eq("order_id", orderId)
    .eq("variant_id", variantId)

  if (exceptItemId) {
    query = query.neq("id", exceptItemId)
  }

  const { data, error } = await query

  if (error) throw error

  return (data || []).reduce((sum, item) => sum + (Number(item.quantity) || 0), 0)
}

const assertVariantStockAvailable = async ({ orderId, variantId, quantity, exceptItemId = null }) => {
  const stock = await getVariantStock(variantId)

  if (stock <= 0) {
    throw new Error("This variant is out of stock.")
  }

  const existingQuantity = await getOrderVariantQuantity({ orderId, variantId, exceptItemId })
  const requestedQuantity = existingQuantity + Math.max(0, Number(quantity) || 0)

  if (requestedQuantity > stock) {
    throw new Error(`Only ${stock} ${stock === 1 ? "item is" : "items are"} available.`)
  }
}

export const addItemToCart = async ({
  userId,
  productId,
  variantId,
  quantity,
  price,
  customImageUrl,
  customBaseText = "",
  customBaseFee = 0,
  customTextType = null,
}) => {
  if (!userId) {
    throw new Error("Please log in before adding items to your cart.")
  }

  if (!productId || !variantId || !price) {
    throw new Error("Please choose an available product variant.")
  }

  const order = await getOrCreatePendingOrder(userId)
  const nextQuantity = Math.max(1, Number(quantity) || 1)

  await assertVariantStockAvailable({
    orderId: order.id,
    variantId,
    quantity: nextQuantity,
  })

  const hasCustomUpload = Boolean(customImageUrl)
  const normalizedBaseText = customBaseText.trim().slice(0, 40)
  const baseFee = normalizedBaseText ? Number(customBaseFee) || 0 : 0
  const normalizedTextType = normalizedBaseText && customTextType === "name_plate" ? "name_plate" : (normalizedBaseText ? "name" : null)
  const itemPrice = price + baseFee

  let cartItem = null

  if (!hasCustomUpload && !normalizedBaseText) {
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
      const { data, error } = await supabase
        .from("order_items")
        .update({
          quantity: (existingItem.quantity || 0) + nextQuantity,
          price: itemPrice,
        })
        .eq("id", existingItem.id)
        .select("id, order_id, product_id, variant_id, quantity, price")
        .single()

      if (error) throw error

      cartItem = data
    }
  }

  if (!cartItem) {
    const { data, error } = await supabase
      .from("order_items")
      .insert({
        order_id: order.id,
        product_id: productId,
        variant_id: variantId,
        quantity: nextQuantity,
        price: itemPrice,
      })
      .select("id, order_id, product_id, variant_id, quantity, price")
      .single()

    if (error) throw error

    cartItem = data
  }

  if (hasCustomUpload || normalizedBaseText) {
    const { error } = await supabase
      .from("custom_uploads")
      .insert({
        order_item_id: cartItem.id,
        image_url: customImageUrl || null,
        base_text: normalizedBaseText || null,
        base_fee: baseFee,
        custom_text_type: normalizedTextType,
        status: "pending",
      })

    if (error) {
      await supabase
        .from("order_items")
        .delete()
        .eq("id", cartItem.id)

      await recalculateOrderTotal(order.id)
      throw error
    }
  }

  await recalculateOrderTotal(order.id)
  notifyCartUpdated()

  return {
    order,
    item: cartItem,
  }
}

export const uploadCustomOrderImage = async ({ file, userId }) => {
  if (!file) {
    throw new Error("Please upload a reference image.")
  }

  if (!file.type.startsWith("image/")) {
    throw new Error("Please upload an image file.")
  }

  if (file.size > 15 * 1024 * 1024) {
    throw new Error("Image must be 15MB or smaller.")
  }

  const extension = file.name.split(".").pop()?.toLowerCase() || "jpg"
  const safeName = `${crypto.randomUUID()}.${extension}`
  const filePath = `${userId}/${safeName}`

  const { error } = await supabase.storage
    .from("custom-uploads")
    .upload(filePath, file, {
      cacheControl: "3600",
      contentType: file.type,
      upsert: false,
    })

  if (error) throw error

  const { data } = supabase.storage
    .from("custom-uploads")
    .getPublicUrl(filePath)

  return data.publicUrl
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
        *
      ),
      product_variants (
        *
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
    const { data: item, error: itemError } = await supabase
      .from("order_items")
      .select("variant_id")
      .eq("id", itemId)
      .single()

    if (itemError) throw itemError

    await assertVariantStockAvailable({
      orderId,
      variantId: item.variant_id,
      quantity: nextQuantity,
      exceptItemId: itemId,
    })

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
