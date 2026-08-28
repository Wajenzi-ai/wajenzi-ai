import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { ChevronDown, ExternalLink, Github, Search, X } from "lucide-react";
import { useState } from "react";

export function GitHubCanonicalCataloguePanel() {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const catalogue = trpc.catalog.canonicalGithub.useQuery({ search: search.trim() || undefined, limit: 4 }, { staleTime: 5 * 60 * 1000, retry: 1 });
  const products = catalogue.data?.products ?? [];

  return <aside className="fixed bottom-4 right-4 z-40 w-[min(23rem,calc(100vw-2rem))] rounded-2xl border border-teal-300/25 bg-[#07110f]/95 p-3 text-white shadow-[0_24px_65px_-26px_rgba(4,18,15,.8)] backdrop-blur-xl">
    <button onClick={() => setOpen((value) => !value)} aria-expanded={open} className="btn-press flex w-full items-center gap-3 rounded-xl px-2 py-1 text-left hover:bg-white/[.04]">
      <span className="grid size-9 shrink-0 place-items-center rounded-lg border border-teal-300/20 bg-teal-400/10 text-teal-200"><Github className="size-4" /></span>
      <span className="min-w-0 flex-1"><span className="block font-mono text-[10px] font-semibold uppercase tracking-[.14em] text-teal-200">GitHub catalogue source</span><span className="mt-0.5 block truncate text-xs text-zinc-300">Canonical product identity reference</span></span>
      <ChevronDown className={`size-4 text-zinc-400 transition ${open ? "rotate-180" : ""}`} />
    </button>
    {open && <div className="px-2 pb-2 pt-4">
      <div className="flex items-start justify-between gap-4"><p className="text-xs leading-5 text-zinc-400">Canonical product data is read server-side from the public Wajenzi-ai/wajenzi-ai registry. Prices and stock remain supplier-specific.</p><button onClick={() => setOpen(false)} className="btn-press grid size-7 shrink-0 place-items-center rounded-lg text-zinc-400 hover:bg-white/10 hover:text-white" aria-label="Close GitHub catalogue panel"><X className="size-4" /></button></div>
      <label className="mt-4 flex h-10 items-center gap-2 rounded-lg border border-white/10 bg-black/30 px-3"><Search className="size-3.5 text-teal-200" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search canonical products" className="min-w-0 flex-1 bg-transparent text-xs text-white outline-none placeholder:text-zinc-500" /></label>
      {catalogue.isLoading ? <p className="py-5 text-center text-xs text-zinc-500">Reading canonical catalogue…</p> : catalogue.error ? <p className="py-5 text-center text-xs text-amber-200">Canonical catalogue is temporarily unavailable.</p> : <><div className="mt-3 space-y-2">{products.map((product) => <div key={product.canonicalEntityId} className="rounded-xl border border-white/[.08] bg-white/[.035] px-3 py-2.5"><p className="line-clamp-1 text-xs font-semibold text-zinc-100">{product.title}</p><p className="mt-1 font-mono text-[9px] uppercase tracking-[.12em] text-teal-200">{product.category}{product.brand ? ` · ${product.brand}` : ""}</p><p className="mt-1 text-[10px] text-zinc-500">{product.sku ? `SKU ${product.sku}` : "Canonical identity"}{product.packSize ? ` · ${product.packSize}` : ""}</p></div>)}</div><div className="mt-4 flex items-center justify-between gap-3"><span className="text-[10px] text-zinc-500">{catalogue.data?.totalProducts.toLocaleString()} published canonical products</span><a href={catalogue.data?.repositoryUrl ?? "https://github.com/Wajenzi-ai/wajenzi-ai"} target="_blank" rel="noreferrer" className="btn-press inline-flex items-center gap-1 text-[10px] font-semibold text-teal-200 hover:text-teal-100">View source <ExternalLink className="size-3" /></a></div></>}
    </div>}
  </aside>;
}
