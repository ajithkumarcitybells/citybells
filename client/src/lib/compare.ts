export const COMPARE_KEY = "compareProducts";

export function getCompareList(): string[] {
  try {
    const raw = localStorage.getItem(COMPARE_KEY) || "[]";
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed;
    return [];
  } catch {
    return [];
  }
}

export function setCompareList(list: string[]) {
  try {
    localStorage.setItem(COMPARE_KEY, JSON.stringify(list));
  } catch {}
}

export function toggleCompare(productId: string) {
  const list = getCompareList();
  const idx = list.indexOf(productId);
  if (idx === -1) {
    // limit to 4 products
    if (list.length >= 4) {
      list.shift();
    }
    list.push(productId);
  } else {
    list.splice(idx, 1);
  }
  setCompareList(list);
  return list;
}

export function isCompared(productId: string) {
  return getCompareList().includes(productId);
}

export function clearCompare() {
  try { localStorage.removeItem(COMPARE_KEY); } catch {}
}
