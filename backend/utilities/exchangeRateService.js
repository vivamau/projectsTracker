const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour
const FALLBACK_RATES = { USD: 1 };
const API_URL = 'https://api.frankfurter.app/latest?from=USD';

let cache = null; // { rates, fetchedAt }

async function getRates() {
  if (cache && Date.now() - cache.fetchedAt < CACHE_TTL_MS) {
    return cache.rates;
  }

  try {
    const res = await fetch(API_URL);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const rates = { USD: 1, ...data.rates };
    cache = { rates, fetchedAt: Date.now() };
    return rates;
  } catch {
    return cache ? cache.rates : { ...FALLBACK_RATES };
  }
}

function convertToUSD(amount, currencyCode, rates) {
  if (amount == null) return 0;
  if (!currencyCode || currencyCode === 'USD' || !rates[currencyCode]) return amount;
  return amount / rates[currencyCode];
}

function getLastFetchedAt() {
  return cache ? cache.fetchedAt : null;
}

function clearCache() {
  cache = null;
}

function expireCache() {
  if (cache) cache.fetchedAt = 0;
}

module.exports = { getRates, convertToUSD, getLastFetchedAt, clearCache, expireCache };
