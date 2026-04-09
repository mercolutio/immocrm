import type { Property } from "./types";

export function formatEUR(n: number | null | undefined): string {
  if (n == null) return "—";
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(n);
}

export function formatArea(n: number | null | undefined): string {
  if (n == null) return "—";
  return `${new Intl.NumberFormat("de-DE", { maximumFractionDigits: 1 }).format(n)} m²`;
}

export function formatRooms(n: number | null | undefined): string {
  if (n == null) return "—";
  return new Intl.NumberFormat("de-DE", { maximumFractionDigits: 1 }).format(n);
}

export function formatAddress(p: Pick<Property, "street" | "house_number" | "zip" | "city">): string {
  const line1 = [p.street, p.house_number].filter(Boolean).join(" ");
  const line2 = [p.zip, p.city].filter(Boolean).join(" ");
  return [line1, line2].filter(Boolean).join(", ") || "—";
}

export function formatAddressShort(p: Pick<Property, "street" | "house_number" | "city">): string {
  const street = [p.street, p.house_number].filter(Boolean).join(" ");
  if (street && p.city) return `${street}, ${p.city}`;
  return street || p.city || "—";
}

export function propertyPrice(p: Pick<Property, "listing_type" | "price" | "rent">): string {
  if (p.listing_type === "rent") {
    return p.rent != null ? `${formatEUR(p.rent)}/mo` : "—";
  }
  return formatEUR(p.price);
}

export function hasRooms(type: Property["type"]): boolean {
  return type === "apartment" || type === "house";
}
