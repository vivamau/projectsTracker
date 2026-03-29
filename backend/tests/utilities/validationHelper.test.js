const {
  isNonEmptyString,
  isPositiveInteger,
  isValidEmail,
  validateRequired
} = require('../../utilities/validationHelper');

describe('validationHelper', () => {
  describe('isNonEmptyString()', () => {
    it('should return true for a non-empty string', () => {
      expect(isNonEmptyString('hello')).toBe(true);
    });

    it('should return false for an empty string', () => {
      expect(isNonEmptyString('')).toBe(false);
    });

    it('should return false for whitespace-only string', () => {
      expect(isNonEmptyString('   ')).toBe(false);
    });

    it('should return false for null', () => {
      expect(isNonEmptyString(null)).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(isNonEmptyString(undefined)).toBe(false);
    });

    it('should return false for a number', () => {
      expect(isNonEmptyString(123)).toBe(false);
    });
  });

  describe('isPositiveInteger()', () => {
    it('should return true for a positive integer', () => {
      expect(isPositiveInteger(1)).toBe(true);
      expect(isPositiveInteger(100)).toBe(true);
    });

    it('should return false for zero', () => {
      expect(isPositiveInteger(0)).toBe(false);
    });

    it('should return false for negative integer', () => {
      expect(isPositiveInteger(-5)).toBe(false);
    });

    it('should return false for a float', () => {
      expect(isPositiveInteger(1.5)).toBe(false);
    });

    it('should return false for a string', () => {
      expect(isPositiveInteger('5')).toBe(false);
    });

    it('should return false for null', () => {
      expect(isPositiveInteger(null)).toBe(false);
    });
  });

  describe('isValidEmail()', () => {
    it('should return true for a valid email', () => {
      expect(isValidEmail('test@example.com')).toBe(true);
    });

    it('should return true for email with subdomain', () => {
      expect(isValidEmail('user@mail.example.com')).toBe(true);
    });

    it('should return false for empty string', () => {
      expect(isValidEmail('')).toBe(false);
    });

    it('should return false for string without @', () => {
      expect(isValidEmail('notanemail')).toBe(false);
    });

    it('should return false for string without domain', () => {
      expect(isValidEmail('user@')).toBe(false);
    });

    it('should return false for null', () => {
      expect(isValidEmail(null)).toBe(false);
    });

    it('should return false for number', () => {
      expect(isValidEmail(123)).toBe(false);
    });
  });

  describe('validateRequired()', () => {
    it('should return valid when all fields present', () => {
      const result = validateRequired({ name: 'John', age: 30 }, ['name', 'age']);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return errors for missing fields', () => {
      const result = validateRequired({ name: 'John' }, ['name', 'age', 'email']);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('age is required');
      expect(result.errors).toContain('email is required');
    });

    it('should treat null values as missing', () => {
      const result = validateRequired({ name: null }, ['name']);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('name is required');
    });

    it('should treat empty string values as missing', () => {
      const result = validateRequired({ name: '' }, ['name']);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('name is required');
    });

    it('should return valid for empty fields array', () => {
      const result = validateRequired({}, []);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });
});
