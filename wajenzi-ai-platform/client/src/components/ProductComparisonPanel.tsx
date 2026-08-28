import { Button } from "@/components/ui/button";
import { ArrowRight, Bot, CheckCircle2, ExternalLink, Scale, X } from "lucide-react";

export type ComparisonProduct = {
  id: number;
  title: string;
  category: string;
  priceKes: number;
  salePriceKes: number | null;
  availableQuantity: number;
  supplierName: string | null;
  externalUrl: string | null;
  status: "active" | "out_of_stock" | "draft";
};

function formatKES(value: number) {
  return new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES", maximumFractionDigits: 0 }).format(value);
}

export function ProductComparisonPanel({ items, onClose, onSourceWithAI }: { items: ComparisonProduct[]; onClose: () => void; onSourceWithAI: () => void }) {
  const comparable = items.slice(0, 4);
  const lowestPrice = Math.min(...comparable.map((item) => item.salePriceKes ?? item.priceKes));

  return <div className="fixed inset-0 z-[60] flex items-end bg-zinc-950/55 p-0 sm:items-center sm:justify-center sm:p-5" role="dialog" aria-modal="true" aria-label="Compare shortlisted products">
    <button onClick={onClose} aria-label="Close comparison" className="absolute inset-0 cursor-default" />
    <section className="relative max-h-[92vh] w-full max-w-6xl overflow-hidden rounded-t-3xl bg-[#f8faf8] shadow-2xl sm:rounded-3xl">
      <header className="flex items-start justify-between gap-5 border-b border-zinc-200 bg-white px-5 py-5 sm:px-7"><div><div className="flex items-center gap-2 text-teal-700"><Scale className="size-4" /><p className="font-mono text-[10px] font-bold uppercase tracking-[.16em]">Comparison workspace</p></div><h2 className="mt-2 text-xl font-semibold tracking-[-.045em] text-zinc-950 sm:text-2xl">Review supplier options before you source.</h2><p className="mt-1 text-sm text-zinc-500">Compare up to four shortlisted products, then bring their details into the AI Procurement Agent to prepare an RFQ or review a cart.</p></div><button onClick={onClose} className="btn-press grid size-9 shrink-0 place-items-center rounded-lg border border-zinc-200 text-zinc-500 hover:bg-zinc-100" aria-label="Close comparison"><X className="size-4" /></button></header>
      <div className="overflow-x-auto px-5 py-5 sm:px-7"><table className="min-w-[760px] w-full border-separate border-spacing-0 text-left"><thead><tr><th className="w-44 border-b border-zinc-200 pb-3 text-[10px] font-bold uppercase tracking-[.14em] text-zinc-400">Comparison point</th>{comparable.map((item) => <th key={item.id} className="min-w-48 border-b border-zinc-200 px-3 pb-3 align-top"><p className="line-clamp-2 text-sm font-semibold leading-5 text-zinc-950">{item.title}</p><p className="mt-1 text-xs font-medium text-teal-700">{item.supplierName ?? "Marketplace supplier"}</p></th>)}</tr></thead><tbody><tr><th className="border-b border-zinc-200 py-4 text-xs font-semibold text-zinc-500">Current price</th>{comparable.map((item) => { const price = item.salePriceKes ?? item.priceKes; return <td key={item.id} className="border-b border-zinc-200 px-3 py-4 text-sm font-semibold text-zinc-950">{formatKES(price)}{price === lowestPrice && <span className="ml-2 rounded-full bg-emerald-100 px-1.5 py-0.5 text-[9px] font-bold text-emerald-700">LOWEST</span>}</td>; })}</tr><tr><th className="border-b border-zinc-200 py-4 text-xs font-semibold text-zinc-500">Availability</th>{comparable.map((item) => <td key={item.id} className="border-b border-zinc-200 px-3 py-4 text-xs text-zinc-700">{item.status === "active" ? <span className="inline-flex items-center gap-1 font-semibold text-emerald-700"><CheckCircle2 className="size-3.5" />Supplier-listed</span> : "Confirm with supplier"}</td>)}</tr><tr><th className="border-b border-zinc-200 py-4 text-xs font-semibold text-zinc-500">Catalog detail</th>{comparable.map((item) => <td key={item.id} className="border-b border-zinc-200 px-3 py-4 text-xs text-zinc-600">{item.category} · {item.availableQuantity > 0 ? `${item.availableQuantity.toLocaleString()} shown in feed` : "Quantity on request"}</td>)}</tr><tr><th className="py-4 text-xs font-semibold text-zinc-500">Supplier link</th>{comparable.map((item) => <td key={item.id} className="px-3 py-4">{item.externalUrl ? <a href={item.externalUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-bold text-teal-700 hover:text-teal-900">View listing <ExternalLink className="size-3" /></a> : <span className="text-xs text-zinc-400">Not provided</span>}</td>)}</tr></tbody></table></div>
      <footer className="flex flex-col gap-3 border-t border-zinc-200 bg-white px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-7"><p className="text-xs leading-5 text-zinc-500">Prices and stock records are supplier-published signals. Verify final availability, specification, payment protection, and delivery timing before approval.</p><Button onClick={onSourceWithAI} className="btn-press shrink-0 rounded-lg bg-teal-500 font-bold text-[#04120f] hover:bg-teal-400">Source with AI <Bot className="ml-2 size-4" /><ArrowRight className="ml-1 size-3.5" /></Button></footer>
    </section>
  </div>;
}
