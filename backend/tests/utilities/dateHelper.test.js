const { now, toUnix, fromUnix } = require('../../utilities/dateHelper');

describe('dateHelper', () => {
  describe('now()', () => {
    it('should return a number', () => {
      expect(typeof now()).toBe('number');
    });

    it('should return current timestamp in milliseconds', () => {
      const before = Date.now();
      const result = now();
      const after = Date.now();
      expect(result).toBeGreaterThanOrEqual(before);
      expect(result).toBeLessThanOrEqual(after);
    });
  });

  describe('toUnix()', () => {
    it('should convert a valid date string to unix timestamp', () => {
      const result = toUnix('2024-01-15T10:30:00Z');
      expect(typeof result).toBe('number');
      expect(result).toBe(new Date('2024-01-15T10:30:00Z').getTime());
    });

    it('should return null for null input', () => {
      expect(toUnix(null)).toBeNull();
    });

    it('should return null for undefined input', () => {
      expect(toUnix(undefined)).toBeNull();
    });

    it('should return null for empty string', () => {
      expect(toUnix('')).toBeNull();
    });

    it('should return null for invalid date string', () => {
      expect(toUnix('not-a-date')).toBeNull();
    });
  });

  describe('fromUnix()', () => {
    it('should convert a unix timestamp to ISO string', () => {
      const ts = new Date('2024-01-15T10:30:00.000Z').getTime();
      expect(fromUnix(ts)).toBe('2024-01-15T10:30:00.000Z');
    });

    it('should return null for null input', () => {
      expect(fromUnix(null)).toBeNull();
    });

    it('should return null for undefined input', () => {
      expect(fromUnix(undefined)).toBeNull();
    });

    it('should return null for 0', () => {
      expect(fromUnix(0)).toBeNull();
    });
  });
});
