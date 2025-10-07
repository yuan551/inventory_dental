// Utility to detect placeholder/dummy documents that should not appear in UI.
// A doc is considered a placeholder if:
//  - its id is exactly 'dummy' (your seeded keep-alive doc), OR
//  - it contains a boolean field `placeholder` set to true.
// Extend here if you add other sentinel markers later.
export function isPlaceholderDoc(id, data) {
  if (!id) return false;
  const d = data || {};
  // Explicit sentinel markers
  if (id === 'dummy') return true;
  if (d.placeholder === true) return true;
  // Heuristic fallback: completely unnamed & zeroed document (common keep-alive pattern)
  const name = d.item_name || d.name || '';
  const qty = Number(d.quantity || 0);
  const cost = Number(d.unit_cost || 0);
  if (!name && qty === 0 && cost === 0) return true;
  return false;
}

// Optional helper to strip placeholders from an array of Firestore docs
export function filterOutPlaceholders(docs) {
  return docs.filter(d => !isPlaceholderDoc(d.id, d.data && d.data()));
}