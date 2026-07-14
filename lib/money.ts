// All money is stored and computed in integer minor units (cents) to avoid
// floating-point rounding errors. These helpers convert to/from the major
// units the user sees, and format for display.

export function toCents(major: number | string): number {
  const n = typeof major === "string" ? parseFloat(major) : major;
  if (!isFinite(n)) return NaN;
  return Math.round(n * 100);
}

export function fromCents(cents: number): number {
  return cents / 100;
}

// Split a total (in cents) equally across `count` participants, distributing
// any remainder one cent at a time so the shares always sum exactly to total.
export function splitEqual(totalCents: number, count: number): number[] {
  if (count <= 0) return [];
  const base = Math.floor(totalCents / count);
  let remainder = totalCents - base * count;
  const shares = new Array<number>(count).fill(base);
  for (let i = 0; i < shares.length && remainder > 0; i++) {
    shares[i] += 1;
    remainder -= 1;
  }
  return shares;
}

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: "$",
  EUR: "€",
  GBP: "£",
  INR: "₹",
  JPY: "¥",
  AUD: "A$",
  CAD: "C$",
};

export function currencySymbol(currency: string): string {
  return CURRENCY_SYMBOLS[currency] ?? "";
}

export function formatMoney(cents: number, currency: string): string {
  const symbol = currencySymbol(currency);
  const value = Math.abs(cents / 100).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const sign = cents < 0 ? "-" : "";
  return symbol ? `${sign}${symbol}${value}` : `${sign}${value} ${currency}`;
}

export const SUPPORTED_CURRENCIES = Object.keys(CURRENCY_SYMBOLS);
