import { EmptyState, StatusPill, WajenziId, WorkspaceFrame } from "@/components/WorkspaceFrame";
import { trpc } from "@/lib/trpc";
import { FileUp, FolderLock, Paperclip } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const assetKinds = ["supplier_catalogue", "product_image", "datasheet", "certificate", "csv_import", "verification_evidence", "other"] as const;

export default function Files() {
  const utils = trpc.useUtils();
  const files = trpc.files.list.useQuery(undefined, { retry: false });
  const [assetKind, setAssetKind] = useState<(typeof assetKinds)[number]>("verification_evidence");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const upload = trpc.files.upload.useMutation({ onSuccess: () => { toast.success("File stored outside the database; governed metadata recorded."); setSelectedFile(null); utils.files.list.invalidate(); }, onError: error => toast.error(error.message) });
  const sendFile = () => {
    if (!selectedFile) return;
    if (selectedFile.size > 8 * 1024 * 1024) { toast.error("This workspace upload supports files up to 8 MB. Larger files require the production direct-upload flow."); return; }
    const reader = new FileReader();
    reader.onload = () => { const value = String(reader.result); upload.mutate({ assetKind, originalFilename: selectedFile.name, mimeType: selectedFile.type || "application/octet-stream", contentBase64: value.split(",")[1] || "" }); };
    reader.readAsDataURL(selectedFile);
  };
  return <WorkspaceFrame eyebrow="Evidence & source provenance" title="Secure file metadata vault" description="Files are stored in object storage rather than database columns. The registry retains the WAJENZI file ID, file key, metadata, uploader, asset type, and provenance link." action={<div className="rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-xs font-medium text-teal-100">Object storage · governed metadata</div>}>
    <section className="grid gap-6 xl:grid-cols-[0.75fr_1.25fr]"><div className="data-card rounded-2xl p-5"><div className="flex items-center gap-2"><FileUp className="h-4 w-4 text-teal-700" /><h2 className="font-display text-xl text-slate-900">Upload evidence</h2></div><p className="mt-2 text-xs leading-5 text-muted-foreground">Use this for supplier catalogues, product images, datasheets, certificates, CSV imports, and verification evidence.</p><div className="mt-5 space-y-4"><label className="block text-xs font-bold uppercase tracking-[0.12em] text-slate-600">Asset classification<select value={assetKind} onChange={event => setAssetKind(event.target.value as typeof assetKind)} className="mt-2 w-full rounded-xl border bg-white px-3 py-2.5 text-sm font-normal outline-none focus:border-teal-600">{assetKinds.map(kind => <option key={kind} value={kind}>{kind.replaceAll("_", " ")}</option>)}</select></label><label className="block cursor-pointer rounded-xl border border-dashed border-teal-300 bg-teal-50/60 p-5 text-center"><Paperclip className="mx-auto h-5 w-5 text-teal-700" /><p className="mt-2 text-sm font-bold text-teal-950">{selectedFile?.name || "Choose a file"}</p><p className="mt-1 text-xs text-teal-800">Maximum 8 MB in this authenticated workspace flow</p><input className="hidden" type="file" onChange={event => setSelectedFile(event.target.files?.[0] || null)} /></label><button disabled={!selectedFile || upload.isPending} onClick={sendFile} className="flex w-full items-center justify-center gap-2 rounded-xl bg-teal-800 px-4 py-3 text-sm font-bold text-white transition hover:bg-teal-900 disabled:opacity-50 active:scale-[0.97]"><FolderLock className="h-4 w-4" />{upload.isPending ? "Storing securely…" : "Store file & record provenance"}</button></div></div>
      <div className="data-card rounded-2xl"><div className="border-b soft-divider px-5 py-4"><p className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">Workspace file records</p><h2 className="mt-1 font-display text-xl text-slate-900">Storage is separate from entity identity</h2></div>{files.isLoading ? <p className="p-8 text-sm text-muted-foreground">Loading file records…</p> : files.data?.length ? <div className="divide-y soft-divider">{files.data.map(file => <div key={file.id} className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0"><a href={file.storageUrl} target="_blank" rel="noreferrer" className="truncate font-medium text-teal-800 hover:text-teal-950">{file.originalFilename}</a><p className="mt-1 text-xs text-muted-foreground">{file.assetKind.replaceAll("_", " ")} · {(file.byteSize / 1024).toFixed(1)} KB · {new Date(file.createdAt).toLocaleDateString()}</p><p className="mt-1"><WajenziId value={file.wajenziId} /></p></div><StatusPill value="stored" /></div>)}</div> : <EmptyState title="No files have been recorded" detail="Upload a small source file or evidence record to demonstrate the secure metadata and object-storage flow." />}</div></section>
  </WorkspaceFrame>;
}
