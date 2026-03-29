function isNonEmptyString(val) {
  return typeof val === 'string' && val.trim().length > 0;
}

function isPositiveInteger(val) {
  return Number.isInteger(val) && val > 0;
}

function isValidEmail(val) {
  if (!isNonEmptyString(val)) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
}

function validateRequired(obj, fields) {
  const errors = [];
  for (const field of fields) {
    if (obj[field] === undefined || obj[field] === null || obj[field] === '') {
      errors.push(`${field} is required`);
    }
  }
  return { valid: errors.length === 0, errors };
}

module.exports = { isNonEmptyString, isPositiveInteger, isValidEmail, validateRequired };
