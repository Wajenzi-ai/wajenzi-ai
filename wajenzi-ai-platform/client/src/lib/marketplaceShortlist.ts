export type ShortlistedProduct = {
  id: number;
  title: string;
  priceKes: number;
  salePriceKes: number | null;
  supplierName: string | null;
  externalUrl: string | null;
};

function formatKES(value: number) {
  return new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES", maximumFractionDigits: 0 }).format(value);
}

export function toggleShortlist<T extends ShortlistedProduct>(items: T[], item: T) {
  return items.some((saved) => saved.id === item.id) ? items.filter((saved) => saved.id !== item.id) : [...items, item];
}

export function buildProcurementContext(items: ShortlistedProduct[]) {
  const shortlistContext = items.map((item) => `${item.title} · ${item.supplierName ?? "Marketplace supplier"} · ${formatKES(item.salePriceKes ?? item.priceKes)}${item.externalUrl ? ` · ${item.externalUrl}` : ""}`).join("\n");
  return `Marketplace comparison shortlist:\n${shortlistContext}\n\nHelp me assess specifications, quantities, supplier fit, protected-payment considerations, and RFQ next steps.`;
}
