/**
 * Shared filter helpers for custom reports
 */

function buildDateFilter(col, filters) {
  const f = filters.find(x => x.field === 'Date');
  if (!f) return { sql: '', params: [] };
  const map = {
    'Today':        `AND DATE(${col}) = CURDATE()`,
    'Last 7 Days':  `AND ${col} >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)`,
    'Last 30 Days': `AND ${col} >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)`,
    'This Quarter': `AND QUARTER(${col})=QUARTER(CURDATE()) AND YEAR(${col})=YEAR(CURDATE())`,
    'This Year':    `AND YEAR(${col})=YEAR(CURDATE())`,
  };
  return { sql: map[f.value] || '', params: [] };
}

function buildEnumFilter(col, filters, fieldName = 'Status') {
  const f = filters.find(x => x.field === fieldName);
  if (!f || f.value === 'All') return { sql: '', params: [] };
  return { sql: `AND ${col}=?`, params: [f.value] };
}

function buildLikeFilter(col, filters, fieldName = 'Department') {
  const f = filters.find(x => x.field === fieldName);
  if (!f || f.value === 'All') return { sql: '', params: [] };
  return { sql: `AND ${col}=?`, params: [f.value] };
}

module.exports = { buildDateFilter, buildEnumFilter, buildLikeFilter };
