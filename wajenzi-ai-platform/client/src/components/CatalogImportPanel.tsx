import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { AlertTriangle, CheckCircle2, Eye, EyeOff, FileSpreadsheet, Loader2, PackageSearch, UploadCloud } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";

const MAX_CATALOG_FILE_BYTES = 12 * 1024 * 1024;

function readFileAsBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error ?? new Error("The selected file could not be read."));
    reader.onload = () => {
      if (typeof reader.result !== "string") return reject(new Error("The selected file could not be read."));
      resolve(reader.result.slice(reader.result.indexOf(",") + 1));
    };
    reader.readAsDataURL(file);
  });
}

export function CatalogImportPanel() {
  const inputRef = useRef<HTMLInputElement>(null);
  const { user, isAuthenticated } = useAuth();
  const utils = trpc.useUtils();
  const [selectedName, setSelectedName] = useState<string>();
  const isAdmin = user?.role === "admin";
  const recentImports = trpc.catalog.recentImports.useQuery(undefined, { enabled: isAuthenticated && isAdmin });
  const catalogItems = trpc.catalog.adminList.useQuery(undefined, { enabled: isAuthenticated && isAdmin });
  const updateStatus = trpc.catalog.setStatus.useMutation({
    onSuccess: () => {
      toast.success("Catalog visibility updated.");
      utils.catalog.adminList.invalidate();
      utils.catalog.list.invalidate();
      utils.catalog.categories.invalidate();
    },
    onError: (error) => toast.error(error.message),
  });
  const importCsv = trpc.catalog.importCsv.useMutation({
    onSuccess: (result) => {
      const summary = result.skippedRows ? `${result.importedRows} product${result.importedRows === 1 ? "" : "s"} imported; ${result.skippedRows} row${result.skippedRows === 1 ? "" : "s"} skipped.` : `${result.importedRows} product${result.importedRows === 1 ? "" : "s"} are now in the marketplace.`;
      toast.success(summary);
      setSelectedName(undefined);
      utils.catalog.list.invalidate();
      utils.catalog.categories.invalidate();
      utils.catalog.recentImports.invalidate();
    },
    onError: (error) => toast.error(error.message),
  });

  const chooseFile = () => {
    if (!isAuthenticated) {
      toast("Sign in as a platform administrator to import a catalog.");
      startLogin();
      return;
    }
    if (!isAdmin) {
      toast.error("Catalog imports are restricted to platform administrators.");
      return;
    }
    inputRef.current?.click();
  };

  const onFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".csv")) {
      toast.error("Choose a CSV file exported from WooCommerce or your product system.");
      return;
    }
    if (file.size > MAX_CATALOG_FILE_BYTES) {
      toast.error("Choose a CSV file smaller than 12 MB.");
      return;
    }
    setSelectedName(file.name);
    const base64 = await readFileAsBase64(file);
    importCsv.mutate({ originalName: file.name, contentType: file.type || "text/csv", base64, supplierId: 0 });
    event.target.value = "";
  };

  return <section className="surface overflow-hidden"><input ref={inputRef} type="file" accept=".csv,text/csv" className="hidden" onChange={onFileChange} /><div className="border-b border-border bg-primary/10 px-5 py-4"><div className="flex items-start gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground"><FileSpreadsheet className="size-5" /></span><div className="min-w-0 flex-1"><p className="font-display text-base font-semibold tracking-[-.035em]">Catalog CSV import</p><p className="mt-1 text-xs leading-5 text-muted-foreground">Imports WooCommerce-style product rows, preserves product links, and safely updates matching supplier SKUs.</p></div></div></div><div className="p-5"><div className="rounded-xl border border-dashed border-border bg-muted/35 p-4"><div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm font-semibold">{selectedName ?? "Ready for a CSV catalog"}</p><p className="mt-1 text-xs leading-5 text-muted-foreground">Required: <strong>Name</strong> and either an <strong>External URL</strong> or source-product ID. Supports CSV files up to 12 MB, including WooCommerce SKU, categories, prices, stock, images, descriptions, and visibility fields.</p></div><Button onClick={chooseFile} disabled={importCsv.isPending} className="btn-press shrink-0 bg-foreground text-background hover:bg-foreground/90">{importCsv.isPending ? <><Loader2 className="mr-2 size-4 animate-spin" />Importing…</> : <><UploadCloud className="mr-2 size-4" />Choose CSV</>}</Button></div></div>{isAuthenticated && !isAdmin && <p className="mt-3 flex items-center gap-2 text-xs text-amber-800"><AlertTriangle className="size-3.5" />Your current account can browse the catalog but cannot publish imports.</p>}{recentImports.data?.length ? <div className="mt-5"><div className="mb-2 flex items-center gap-2"><CheckCircle2 className="size-4 text-emerald-700" /><p className="text-xs font-bold uppercase tracking-[.12em] text-muted-foreground">Recent imports</p></div><div className="divide-y divide-border rounded-xl border border-border/70">{recentImports.data.map((item) => <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 px-3.5 py-3"><div className="min-w-0"><p className="truncate text-sm font-semibold">{item.originalName}</p><p className="mt-0.5 text-xs text-muted-foreground">{item.importedRows} imported · {item.skippedRows} skipped</p></div><span className={item.status === "completed" ? "rounded-full bg-emerald-100 px-2 py-1 text-[10px] font-bold text-emerald-700" : item.status === "failed" ? "rounded-full bg-rose-100 px-2 py-1 text-[10px] font-bold text-rose-700" : "rounded-full bg-amber-100 px-2 py-1 text-[10px] font-bold text-amber-800"}>{item.status.replaceAll("_", " ")}</span></div>)}</div></div> : null}{catalogItems.data?.length ? <div className="mt-5"><div className="mb-2 flex items-center gap-2"><PackageSearch className="size-4 text-sky-700" /><p className="text-xs font-bold uppercase tracking-[.12em] text-muted-foreground">Published product controls</p></div><div className="divide-y divide-border overflow-hidden rounded-xl border border-border/70">{catalogItems.data.map((item) => <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 px-3.5 py-3"><div className="min-w-0"><p className="truncate text-sm font-semibold">{item.title}</p><p className="mt-0.5 text-xs text-muted-foreground">{item.sku} · {item.category}</p></div><Button disabled={updateStatus.isPending} onClick={() => updateStatus.mutate({ id: item.id, status: item.status === "active" ? "draft" : "active" })} variant="outline" className="btn-press h-8 border-border bg-background px-2.5 text-[11px] font-bold">{item.status === "active" ? <><EyeOff className="mr-1.5 size-3.5" />Hide</> : <><Eye className="mr-1.5 size-3.5" />Publish</>}</Button></div>)}</div></div> : null}</div></section>;
}
