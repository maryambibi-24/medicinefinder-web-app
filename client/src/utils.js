// Small helpers shared by the customer pages

export function ago(date) {
  const s = Math.max(0, (Date.now() - new Date(date).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  return `${Math.floor(s / 86400)} days ago`;
}

export const money = (n) => `Rs ${Number(n).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;

// "In stock", "Low stock" (5 or fewer) or "Out of stock"
export function stockStatus(qty) {
  if (qty === 0) return { label: "Out of stock", cls: "no" };
  if (qty <= 5) return { label: "Low stock", cls: "wait" };
  return { label: "In stock", cls: "ok" };
}

// true = open now, false = closed, null = hours not known.
// Works for hours that pass midnight, for example 18:00 to 02:00.
export function isOpenNow(opening, closing) {
  if (!opening || !closing) return null;
  const mins = (t) => { const [h, m] = t.split(":"); return Number(h) * 60 + Number(m); };
  const o = mins(opening);
  const c = mins(closing);
  const d = new Date();
  const now = d.getHours() * 60 + d.getMinutes();
  if (o === c) return true;
  return o < c ? now >= o && now < c : now >= o || now < c;
}
