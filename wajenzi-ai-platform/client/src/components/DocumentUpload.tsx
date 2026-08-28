import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { FileCheck2, FileUp, Loader2, LockKeyhole } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";

type Purpose = "supplier_catalog" | "boq" | "drawing" | "compliance" | "delivery_proof";

function bytesToBase64(bytes: Uint8Array) {
  let result = "";
  const chunk = 0x8000;
  for (let index = 0; index < bytes.length; index += chunk) result += String.fromCharCode(...Array.from(bytes.subarray(index, index + chunk)));
  return btoa(result);
}

export function DocumentUpload({ purpose, title, hint, className, onUploaded }: { purpose: Purpose; title: string; hint: string; className?: string; onUploaded?: (name: string) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const { isAuthenticated } = useAuth();
  const [uploadedName, setUploadedName] = useState<string>();
  const upload = trpc.documents.upload.useMutation({
    onSuccess: (file) => { setUploadedName(file.originalName); toast.success(`${file.originalName} is stored securely.`); onUploaded?.(file.originalName); },
    onError: (error) => toast.error(error.message),
  });
  const chooseFile = () => { if (!isAuthenticated) { toast("Sign in to upload project documents securely."); startLogin(); return; } inputRef.current?.click(); };
  const onFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { toast.error("Choose a file smaller than 10 MB."); return; }
    const bytes = new Uint8Array(await file.arrayBuffer());
    upload.mutate({ originalName: file.name, contentType: file.type || "application/octet-stream", base64: bytesToBase64(bytes), purpose, accessScope: purpose === "compliance" ? "platform_review" : "owner" });
    event.target.value = "";
  };
  return <div className={cn("rounded-2xl border border-dashed border-border bg-muted/40 p-4", className)}><input ref={inputRef} type="file" accept=".pdf,.csv,.xlsx,.xls,.png,.jpg,.jpeg" className="hidden" onChange={onFileChange} /><div className="flex gap-3"><span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary/15 text-amber-700">{upload.isPending ? <Loader2 className="size-4 animate-spin" /> : uploadedName ? <FileCheck2 className="size-4" /> : <FileUp className="size-4" />}</span><div className="min-w-0 flex-1"><p className="text-sm font-semibold">{uploadedName ?? title}</p><p className="mt-1 text-xs leading-5 text-muted-foreground">{uploadedName ? "Stored in your secure document workspace." : hint}</p><div className="mt-3 flex items-center justify-between gap-3"><button onClick={chooseFile} disabled={upload.isPending} className="btn-press text-xs font-bold text-amber-700 hover:text-amber-800 disabled:opacity-60">{upload.isPending ? "Uploading…" : uploadedName ? "Replace document" : "Choose file"}</button><span className="flex items-center gap-1 text-[10px] text-muted-foreground"><LockKeyhole className="size-3" />S3-backed</span></div></div></div></div>;
}
