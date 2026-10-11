const USER_KEY = "roamwise_user";
const SUPPORTED_CURRENCIES = new Set(["INR", "USD", "EUR", "GBP"]);

/** Returns the signed-in user's preferred currency, defaulting to INR immediately. */
export function getPreferredCurrency() {
  try {
    const user = JSON.parse(localStorage.getItem(USER_KEY) || "null");
    const currency = user?.preferences?.currency;
    return SUPPORTED_CURRENCIES.has(currency) ? currency : "INR";
  } catch {
    return "INR";
  }
}

export function formatCurrency(value, currency = getPreferredCurrency()) {
  const safeCurrency = SUPPORTED_CURRENCIES.has(currency) ? currency : "INR";
  const locale = safeCurrency === "INR" ? "en-IN" : "en-US";
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: safeCurrency,
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);
}
