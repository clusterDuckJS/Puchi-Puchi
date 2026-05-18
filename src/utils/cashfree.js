const CASHFREE_SDK_URL = "https://sdk.cashfree.com/js/v3/cashfree.js"

export const loadCashfreeSdk = () => {
  if (window.Cashfree) {
    return Promise.resolve(window.Cashfree)
  }

  return new Promise((resolve, reject) => {
    const existingScript = document.querySelector(`script[src="${CASHFREE_SDK_URL}"]`)

    if (existingScript) {
      existingScript.addEventListener("load", () => resolve(window.Cashfree), { once: true })
      existingScript.addEventListener("error", reject, { once: true })
      return
    }

    const script = document.createElement("script")
    script.src = CASHFREE_SDK_URL
    script.async = true
    script.onload = () => resolve(window.Cashfree)
    script.onerror = () => reject(new Error("Could not load Cashfree checkout."))
    document.head.appendChild(script)
  })
}

export const openCashfreeCheckout = async (paymentSessionId) => {
  const Cashfree = await loadCashfreeSdk()
  const cashfree = Cashfree({ mode: "production" })

  return cashfree.checkout({
    paymentSessionId,
    redirectTarget: "_self",
  })
}

export const getFunctionErrorMessage = async (error) => {
  if (!error) return ""

  if (error.context instanceof Response) {
    const errorBody = await error.context.json().catch(() => null)
    return errorBody?.error || errorBody?.message || error.message || ""
  }

  return error.context?.error || error.message || ""
}
