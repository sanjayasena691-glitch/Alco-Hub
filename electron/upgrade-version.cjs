function parseVersion(v) {
  if (typeof v !== 'string') return null;
  const m = v.trim().match(/^v?(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[A-Za-z-][0-9A-Za-z-]*)(?:\.(?:0|[1-9]\d*|\d*[A-Za-z-][0-9A-Za-z-]*))*))?(?:\+[0-9A-Za-z.-]+)?$/);
  return m ? [BigInt(m[1]), BigInt(m[2]), BigInt(m[3]), m[4] || ''] : null;
}
function compareVersions(a, b) {
  const x = parseVersion(a), y = parseVersion(b);
  if (!x || !y) return null;
  for (let i = 0; i < 3; i++) { if (x[i] !== y[i]) return x[i] > y[i] ? 1 : -1; }
  if (x[3] === y[3]) return 0;
  if (!x[3] || !y[3]) return x[3] ? -1 : 1;
  const l = x[3].split('.'), r = y[3].split('.');
  for (let i = 0; i < Math.max(l.length, r.length); i++) {
    if (l[i] === undefined || r[i] === undefined) return l[i] === undefined ? -1 : 1;
    if (l[i] === r[i]) continue;
    const ln = /^\d+$/.test(l[i]), rn = /^\d+$/.test(r[i]);
    if (ln && rn) return BigInt(l[i]) > BigInt(r[i]) ? 1 : -1;
    if (ln !== rn) return ln ? -1 : 1;
    return l[i] > r[i] ? 1 : -1;
  }
  return 0;
}

module.exports = {parseVersion, compareVersions};
