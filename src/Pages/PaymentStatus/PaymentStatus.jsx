import { useEffect, useState } from "react"
import { NavLink, useSearchParams } from "react-router-dom"
import { LuCircleAlert, LuCircleCheck, LuLoaderCircle } from "react-icons/lu"
import { isTimeoutError, withRequestTimeout } from "../../utils/request"
import { supabase } from "../../utils/supabase"
import "./payment-status.css"

const statusCopy = {
  PAID: {
    title: "Payment received",
    message: "Your Puchi Puchi order is confirmed. We will start preparing it soon.",
    tone: "success",
  },
  ACTIVE: {
    title: "Payment is still pending",
    message: "Cashfree has not confirmed this payment yet. Please check again in a moment.",
    tone: "pending",
  },
  EXPIRED: {
    title: "Payment expired",
    message: "This payment session expired before completion.",
    tone: "error",
  },
}

function PaymentStatus() {
  const [searchParams] = useSearchParams()
  const [loading, setLoading] = useState(true)
  const [result, setResult] = useState(null)
  const [errorMessage, setErrorMessage] = useState("")
  const orderId = searchParams.get("order_id")

  useEffect(() => {
    let isCurrent = true

    const verifyPayment = async () => {
      if (!orderId) {
        setErrorMessage("We could not find a Cashfree order id in this return link.")
        setLoading(false)
        return
      }

      try {
        const { data, error } = await withRequestTimeout(supabase.functions.invoke("verify-cashfree-order", {
          body: { orderId },
        }))

        if (error) throw error

        if (isCurrent) {
          setResult(data)
        }
      } catch (error) {
        console.error("Payment verification error:", error)

        if (isCurrent) {
          setErrorMessage(
            isTimeoutError(error)
              ? "Payment verification is taking too long. Please refresh in a moment."
              : error.message || "We could not verify this payment."
          )
        }
      } finally {
        if (isCurrent) {
          setLoading(false)
        }
      }
    }

    verifyPayment()

    return () => {
      isCurrent = false
    }
  }, [orderId])

  const copy = result
    ? statusCopy[result.order_status] || {
      title: "Payment status received",
      message: `Cashfree returned status: ${result.order_status || "unknown"}.`,
      tone: "pending",
    }
    : null

  return (
    <main className="payment-status-page">
      <section className="payment-status-card">
        {loading && (
          <>
            <LuLoaderCircle className="payment-status-icon spin" />
            <h1>Checking payment</h1>
            <p>We are confirming your payment with Cashfree.</p>
          </>
        )}

        {!loading && errorMessage && (
          <>
            <LuCircleAlert className="payment-status-icon error" />
            <h1>Could not verify payment</h1>
            <p>{errorMessage}</p>
          </>
        )}

        {!loading && copy && (
          <>
            {copy.tone === "success" ? (
              <LuCircleCheck className="payment-status-icon success" />
            ) : (
              <LuCircleAlert className={`payment-status-icon ${copy.tone}`} />
            )}
            <h1>{copy.title}</h1>
            <p>{copy.message}</p>
          </>
        )}

        <div className="payment-status-actions">
          <NavLink to="/shop">Continue Shopping</NavLink>
          <NavLink to="/cart">Back to Cart</NavLink>
        </div>
      </section>
    </main>
  )
}

export default PaymentStatus
