const SUPPORTED_CURRENCIES = ["USD", "INR", "EUR", "GBP"];

export function getPreferredCurrency() {
    try {
        const user = JSON.parse(localStorage.getItem("roamwise_user") || "null");
        const currency = user?.preferences?.currency;
        return SUPPORTED_CURRENCIES.includes(currency) ? currency : "USD";
    } catch {
        return "USD";
    }
}

export function formatCurrency(value, currency = getPreferredCurrency()) {
    const localeByCurrency = {
        USD: "en-US",
        INR: "en-IN",
        EUR: "de-DE",
        GBP: "en-GB",
    };

    return new Intl.NumberFormat(localeByCurrency[currency] || "en-US", {
        style: "currency",
        currency,
        maximumFractionDigits: 0,
    }).format(Number(value) || 0);
}
