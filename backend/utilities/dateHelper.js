function now() {
  return Date.now();
}

function toUnix(dateStr) {
  if (!dateStr) return null;
  const ts = new Date(dateStr).getTime();
  return isNaN(ts) ? null : ts;
}

function fromUnix(ts) {
  if (!ts) return null;
  return new Date(ts).toISOString();
}

module.exports = { now, toUnix, fromUnix };
