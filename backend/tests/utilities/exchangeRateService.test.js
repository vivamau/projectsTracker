const exchangeRateService = require('../../utilities/exchangeRateService');

const MOCK_RATES = { EUR: 0.92, GBP: 0.79, CHF: 0.89, JPY: 150.5 };

function mockFetch(rates = MOCK_RATES) {
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ base: 'USD', rates })
  });
}

beforeEach(() => {
  exchangeRateService.clearCache();
  jest.clearAllMocks();
});

describe('exchangeRateService', () => {
  describe('getRates', () => {
    it('should fetch and return rates with USD=1', async () => {
      mockFetch();
      const rates = await exchangeRateService.getRates();
      expect(rates.USD).toBe(1);
      expect(rates.EUR).toBe(MOCK_RATES.EUR);
      expect(rates.GBP).toBe(MOCK_RATES.GBP);
    });

    it('should cache rates and not re-fetch within TTL', async () => {
      mockFetch();
      await exchangeRateService.getRates();
      await exchangeRateService.getRates();
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it('should re-fetch after cache expires', async () => {
      mockFetch();
      await exchangeRateService.getRates();
      exchangeRateService.expireCache();
      await exchangeRateService.getRates();
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    it('should return fallback rates on fetch failure', async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));
      const rates = await exchangeRateService.getRates();
      expect(rates.USD).toBe(1);
      expect(typeof rates).toBe('object');
    });
  });

  describe('getLastFetchedAt', () => {
    it('should return null before first fetch', () => {
      expect(exchangeRateService.getLastFetchedAt()).toBeNull();
    });

    it('should return a timestamp after fetch', async () => {
      mockFetch();
      const before = Date.now();
      await exchangeRateService.getRates();
      const ts = exchangeRateService.getLastFetchedAt();
      expect(ts).toBeGreaterThanOrEqual(before);
    });
  });

  describe('convertToUSD', () => {
    it('should return amount unchanged for USD', () => {
      expect(exchangeRateService.convertToUSD(1000, 'USD', { USD: 1, EUR: 0.92 })).toBe(1000);
    });

    it('should convert EUR to USD', () => {
      const result = exchangeRateService.convertToUSD(920, 'EUR', { USD: 1, EUR: 0.92 });
      expect(result).toBeCloseTo(1000, 1);
    });

    it('should convert GBP to USD', () => {
      const result = exchangeRateService.convertToUSD(790, 'GBP', { USD: 1, GBP: 0.79 });
      expect(result).toBeCloseTo(1000, 1);
    });

    it('should return amount unchanged for unknown currency', () => {
      expect(exchangeRateService.convertToUSD(500, 'XYZ', { USD: 1, EUR: 0.92 })).toBe(500);
    });

    it('should return 0 for null/undefined amount', () => {
      expect(exchangeRateService.convertToUSD(null, 'EUR', { USD: 1, EUR: 0.92 })).toBe(0);
      expect(exchangeRateService.convertToUSD(undefined, 'EUR', { USD: 1, EUR: 0.92 })).toBe(0);
    });
  });
});
