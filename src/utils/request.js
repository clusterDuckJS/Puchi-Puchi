export const withRequestTimeout = (promise, timeoutMs = 12000) =>
  Promise.race([
    promise,
    new Promise((_, reject) => {
      window.setTimeout(() => reject(new Error("Request timed out")), timeoutMs)
    }),
  ])

export const isTimeoutError = (error) => error?.message === "Request timed out"
