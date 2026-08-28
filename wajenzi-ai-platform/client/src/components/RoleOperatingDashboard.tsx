import { DocumentUpload } from "@/components/DocumentUpload";
import { MetricCard, PageHeader, SectionCard, StatePill } from "@/components/dashboard-ui";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/_core/hooks/useAuth";
import { useWorkspaceContext } from "@/contexts/WorkspaceContext";
import { type DashboardKey } from "@/lib/wajenzi";
import { roleWorkDetailConfig } from "@/lib/roleWorkDetails";
import { type RoleWorkType, requiresWorkflowConfirmation, roleWorkType } from "@/lib/roleWorkflow";
import { trpc } from "@/lib/trpc";
import { ArrowRight, Check, Plus, Sparkles } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";

type Profile = {
  eyebrow: string;
  title: string;
  description: string;
  metric: [string, string, string, "amber" | "blue" | "green"][];
  actions: [string, string, string][];
  document?: { purpose: "boq" | "drawing" | "compliance"; title: string; hint: string };
};

type PendingAction = { title: string; detail: string; workType: RoleWorkType; clearNote?: boolean };
type DraftAction = { title: string; workType: RoleWorkType };

const profiles: Partial<Record<DashboardKey, Profile>> = {
  developer: { eyebrow: "Portfolio command centre", title: "Developer workspace", description: "Track portfolio health, project cash exposure, procurement readiness, and approval paths across your developments.", metric: [["Active developments", "6", "2 on track", "blue"], ["Capital exposure", "KES 38.4M", "Within plan", "green"], ["Decisions due", "8", "This week", "amber"]], actions: [["Review portfolio", "Project health, budget and schedule exceptions", "Open review"], ["Approve procurement", "Release a reviewed package to purchase order", "Create approval"], ["Issue investor report", "Prepare a controlled portfolio update", "Draft report"]] },
  architect: { eyebrow: "Design delivery", title: "Architect workspace", description: "Manage drawing versions, specifications, design reviews, coordination comments, and issued-for-construction decisions.", metric: [["Active drawing sets", "24", "3 revisions", "blue"], ["Review comments", "16", "4 urgent", "amber"], ["Issued packages", "12", "Current", "green"]], actions: [["Register drawing", "Add a drawing and controlled revision context", "Register"], ["Review design change", "Prepare a reviewable change decision", "Open review"], ["Issue specification", "Share a controlled document to the project team", "Issue document"]], document: { purpose: "drawing", title: "Upload drawing or specification", hint: "PDF, drawing, or specification · encrypted storage" } },
  engineer: { eyebrow: "Engineering assurance", title: "Engineer workspace", description: "Coordinate engineering documents, inspections, testing records, RFIs, quality actions, and technical approvals.", metric: [["Technical reviews", "9", "3 due today", "amber"], ["Open RFIs", "6", "2 escalated", "blue"], ["Quality checks", "94%", "Within SLA", "green"]], actions: [["Log inspection", "Record a field inspection and required follow-up", "Log inspection"], ["Respond to RFI", "Prepare a tracked technical response", "Create response"], ["Review test result", "Capture engineering test evidence", "Review test"]], document: { purpose: "drawing", title: "Upload engineering document", hint: "Drawing, method statement, or test record" } },
  "quantity-surveyor": { eyebrow: "Cost control", title: "Quantity surveyor workspace", description: "Turn drawings and BOQs into classified cost plans, rate reviews, valuations, variations, and final-account evidence.", metric: [["BOQ lines reviewed", "1,284", "86% mapped", "green"], ["Rate exceptions", "18", "Needs review", "amber"], ["Valuations due", "3", "This month", "blue"]], actions: [["Build cost plan", "Classify a project package and working rates", "Start cost plan"], ["Prepare valuation", "Create a reviewable payment valuation", "Create valuation"], ["Review variation", "Compare scope change against the baseline", "Review variation"]], document: { purpose: "boq", title: "Upload BOQ or cost plan", hint: "Spreadsheet, PDF, or BOQ export · up to 10 MB" } },
  "project-manager": { eyebrow: "Project command centre", title: "Project manager workspace", description: "Coordinate scope, program, site activity, procurement, risks, quality, safety, approvals, and project closeout.", metric: [["Milestones on plan", "18/21", "3 need attention", "amber"], ["Open actions", "27", "Across 4 projects", "blue"], ["Programme health", "82%", "Updated today", "green"]], actions: [["Plan next milestone", "Set responsibility and readiness conditions", "Create milestone"], ["Confirm delivery readiness", "Prepare the site handoff, proof, and delivery dependencies for review", "Review delivery"], ["Run coordination review", "Prepare the next project governance review", "Create review"]] },
  manufacturer: { eyebrow: "Product & channel", title: "Manufacturer workspace", description: "Maintain product master data, product documents, approved channels, commercial availability, and supplier-marketplace visibility.", metric: [["Published products", "1,386", "Canonical-ready", "green"], ["Channel requests", "12", "4 awaiting review", "amber"], ["Data quality", "96%", "Current", "blue"]], actions: [["Publish product master", "Prepare a canonical product submission for review", "Create product"], ["Update availability", "Record product availability for approved channels", "Update availability"], ["Share compliance file", "Attach a technical or compliance document", "Add document"]], document: { purpose: "compliance", title: "Upload product compliance document", hint: "Technical sheet, certificate, or approval record" } },
  financier: { eyebrow: "Capital & settlement", title: "Financier workspace", description: "Assess project funding, settlement readiness, verified transaction evidence, risk exceptions, and controlled approval requests.", metric: [["Funding reviews", "14", "3 new", "blue"], ["Settlement queue", "KES 6.2M", "Protected workflow", "amber"], ["Risk flags", "4", "Review required", "green"]], actions: [["Review funding case", "Capture the next underwriting or funding decision", "Review case"], ["Check settlement", "Prepare an evidence-led settlement review", "Open settlement"], ["Record risk exception", "Create a controlled risk follow-up", "Log exception"]] },
  institutional: { eyebrow: "Programme governance", title: "Institutional client workspace", description: "Oversee capital programmes, procurement controls, approvals, audit trails, contractor performance, and reporting obligations.", metric: [["Capital projects", "11", "Portfolio view", "blue"], ["Approvals pending", "17", "Decision queue", "amber"], ["Audit coverage", "100%", "Traceable events", "green"]], actions: [["Open approval pack", "Review a controlled procurement or variation approval", "Open approval"], ["Create programme report", "Prepare governance reporting for your portfolio", "Draft report"], ["Review contractor score", "Assess project delivery performance", "Review score"]] },
  "custom-role": { eyebrow: "Configured organization workspace", title: "Custom organization workspace", description: "Run the organization-specific project, document, approval, and reporting controls granted to your active role.", metric: [["Assigned work", "12", "Active queue", "blue"], ["Approvals", "4", "Review required", "amber"], ["Access controls", "Active", "Policy aligned", "green"]], actions: [["Create assigned work", "Record a project task within your permitted scope", "Create task"], ["Review organization request", "Complete a role-approved review step", "Open review"], ["Prepare workspace report", "Draft a controlled update for your organization", "Draft report"]] },
  operations: { eyebrow: "Platform operations", title: "Wajenzi operations workspace", description: "Coordinate registry stewardship, ontology controls, platform exceptions, support activity, and operational audit trails.", metric: [["Registry reviews", "31", "8 pending", "amber"], ["Platform tasks", "22", "Assigned today", "blue"], ["Service posture", "Healthy", "All core systems", "green"]], actions: [["Review canonical match", "Record a product-identity stewardship decision", "Open registry"], ["Triage platform issue", "Create a traceable operational task", "Create task"], ["Issue operations report", "Summarise exceptions and service activity", "Draft report"]] },
};

export function RoleOperatingDashboard({ current }: { current: DashboardKey }) {
  const profile = profiles[current];
  const { isAuthenticated } = useAuth();
  const { organizationId, projectId, organizationName, projectName } = useWorkspaceContext();
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();
  const workItems = trpc.roleWork.list.useQuery({ workspace: current }, { enabled: isAuthenticated });
  const createWorkItem = trpc.roleWork.create.useMutation({ onSuccess: () => utils.roleWork.list.invalidate({ workspace: current }) });
  const updateWorkStatus = trpc.roleWork.updateStatus.useMutation({ onSuccess: () => utils.roleWork.list.invalidate({ workspace: current }) });
  const [note, setNote] = useState("");
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [draftAction, setDraftAction] = useState<DraftAction | null>(null);
  const [draftReference, setDraftReference] = useState("");
  const [draftDetail, setDraftDetail] = useState("");
  const existingWork = new Map((workItems.data ?? []).map((item) => [item.title, item]));
  const isWorking = createWorkItem.isPending || updateWorkStatus.isPending;

  if (!profile) return null;

  const recordAction = (title: string, detail: string, workType: RoleWorkType, clearNote = false) => {
    if (!isAuthenticated) { toast("Sign in to record this action in your organization workspace."); return; }
    createWorkItem.mutate({ workspace: current, workType, title, description: detail, status: requiresWorkflowConfirmation(current, title) ? "review" : "in_progress", organizationId, projectId, context: { organization: organizationName, project: projectName, source: "role_dashboard" } }, {
      onSuccess: () => { toast.success(`${title} added to the work queue.`); if (clearNote) setNote(""); setPendingAction(null); },
      onError: (error) => toast.error(error.message),
    });
  };
  const requestAction = (title: string, detail: string, workType = roleWorkType(current, title), clearNote = false) => {
    if (requiresWorkflowConfirmation(current, title)) { setPendingAction({ title, detail, workType, clearNote }); return; }
    recordAction(title, detail, workType, clearNote);
  };
  const openActionForm = (title: string, workType: RoleWorkType) => {
    setDraftAction({ title, workType });
    setDraftReference("");
    setDraftDetail("");
  };
  const submitActionForm = () => {
    if (!draftAction) return;
    if (!draftReference.trim() || !draftDetail.trim()) { toast.error("Add the requested reference and supporting work detail before continuing."); return; }
    requestAction(draftAction.title, `Reference: ${draftReference.trim()}\n${draftDetail.trim()}`, draftAction.workType);
    setDraftAction(null);
  };
  const createNote = () => {
    if (!note.trim()) { toast.error("Enter a work item before recording it."); return; }
    requestAction(note.trim(), "Created from role command centre", "task", true);
  };
  const openAssistant = () => {
    const organization = localStorage.getItem("wajenzi-active-organization") ?? "your active organization";
    const project = localStorage.getItem("wajenzi-active-project") ?? "your active project";
    localStorage.setItem("wajenzi-ai-procurement-context", `${profile.title} · ${organization} · ${project} · Help me plan the next reviewable work item.`);
    setLocation("/app/agent");
  };

  return <>
    <PageHeader eyebrow={profile.eyebrow} title={profile.title} description={profile.description} action={<Button onClick={() => requestAction("Create work item", "Initiated from the role command centre", "task")} disabled={isWorking} className="btn-press bg-teal-300 text-[#04120f] hover:bg-teal-200"><Plus className="mr-2 size-4" />New work item</Button>} />
    <div className="mb-6 grid gap-4 sm:grid-cols-3">{profile.metric.map(([label, value, delta, tone]) => <MetricCard key={label} label={label} value={value} delta={delta} tone={tone} />)}</div>
    <div className="grid gap-5 xl:grid-cols-[1.2fr_.8fr]">
      <SectionCard title="Role work queue" description="Create and record the next reviewable action for your active organization and project.">
        <div className="border-b border-border/70 p-5"><div className="flex flex-col gap-3 sm:flex-row"><Input value={note} onChange={(event) => setNote(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") createNote(); }} placeholder="Describe a new project, document, approval, or follow-up item" className="h-11 rounded-xl bg-background" /><Button onClick={createNote} disabled={isWorking} className="btn-press shrink-0 bg-foreground text-background hover:bg-foreground/90">Add to queue <ArrowRight className="ml-2 size-4" /></Button></div></div>
        <div className="divide-y divide-border/70">{profile.actions.map(([title, detail, action]) => { const item = existingWork.get(title); const workType = roleWorkType(current, title); return <div key={title} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center"><span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary/15 text-teal-300"><Sparkles className="size-4" /></span><div className="min-w-0 flex-1"><p className="text-sm font-semibold">{title}</p><p className="mt-1 text-xs leading-5 text-muted-foreground">{detail}</p></div>{item ? item.status === "review" || item.status === "approved" || item.status === "completed" ? <StatePill label={item.status === "review" ? "In review" : item.status} tone={item.status === "review" ? "warning" : "success"} /> : <Button onClick={() => updateWorkStatus.mutate({ id: item.id, status: "review" }, { onSuccess: () => toast.success(`${title} submitted for review.`), onError: (error) => toast.error(error.message) })} disabled={isWorking} size="sm" variant="outline" className="btn-press border-teal-300/30 bg-card text-teal-200 hover:bg-muted">Submit for review <ArrowRight className="ml-1.5 size-3.5" /></Button> : <Button onClick={() => openActionForm(title, workType)} disabled={isWorking} size="sm" variant="outline" className="btn-press border-border bg-card text-card-foreground hover:bg-muted">{action} <ArrowRight className="ml-1.5 size-3.5" /></Button>}</div>; })}</div>
      </SectionCard>
      <div className="space-y-5">
        <SectionCard title="Connected controls" description="Role work uses the shared registry, project data, controlled vocabulary, event traceability, permissions, and AI assistance."><div className="space-y-3 p-5"><div className="rounded-xl border border-teal-300/15 bg-teal-300/[.07] p-4"><p className="text-xs font-semibold text-teal-200">Canonical IDs and ontology</p><p className="mt-1 text-xs leading-5 text-muted-foreground">Reference the same controlled product and project language across documents, procurement, delivery, and reports.</p></div><div className="rounded-xl border border-border bg-muted/35 p-4"><p className="text-xs font-semibold">Event traceability</p><p className="mt-1 text-xs leading-5 text-muted-foreground">Completed workspace actions are retained for your active user and role context.</p></div><Button onClick={openAssistant} variant="outline" className="btn-press w-full border-border bg-card text-card-foreground hover:bg-muted"><Sparkles className="mr-2 size-4 text-teal-300" />Ask Wajenzi AI</Button></div></SectionCard>
        {profile.document && <DocumentUpload purpose={profile.document.purpose} title={profile.document.title} hint={profile.document.hint} />}
        {(workItems.data ?? []).length > 0 && <SectionCard title="Recent work items" description="Persistent work captured for this role workspace"><div className="divide-y divide-border/70">{(workItems.data ?? []).slice(0, 4).map((item) => <div key={item.id} className="flex gap-3 px-5 py-3.5"><Check className="mt-0.5 size-4 text-emerald-400" /><div><p className="text-xs font-semibold">{item.title}</p><p className="mt-1 text-[11px] text-muted-foreground">{item.workType} · {item.status.replaceAll("_", " ")}</p></div></div>)}</div></SectionCard>}
      </div>
    </div>
    <Dialog open={Boolean(draftAction)} onOpenChange={(open) => { if (!open) setDraftAction(null); }}><DialogContent className="border-border bg-popover text-popover-foreground sm:max-w-xl"><DialogHeader><DialogTitle className="font-display tracking-[-.04em]">{draftAction?.title}</DialogTitle><DialogDescription>Capture the controlled reference and supporting information before creating this reviewable work item.</DialogDescription></DialogHeader>{draftAction && <div className="space-y-4"><div><label className="text-xs font-bold">{roleWorkDetailConfig(draftAction.workType).referenceLabel}</label><Input value={draftReference} onChange={(event) => setDraftReference(event.target.value)} placeholder={roleWorkDetailConfig(draftAction.workType).referencePlaceholder} className="mt-2 h-11 rounded-xl bg-background" /></div><div><label className="text-xs font-bold">{roleWorkDetailConfig(draftAction.workType).detailLabel}</label><Textarea value={draftDetail} onChange={(event) => setDraftDetail(event.target.value)} placeholder={roleWorkDetailConfig(draftAction.workType).detailPlaceholder} className="mt-2 min-h-28 rounded-xl bg-background" /></div></div>}<DialogFooter><Button onClick={() => setDraftAction(null)} variant="outline" className="btn-press border-border bg-card text-card-foreground hover:bg-muted">Cancel</Button><Button onClick={submitActionForm} className="btn-press bg-teal-300 text-[#04120f] hover:bg-teal-200">Continue <ArrowRight className="ml-2 size-4" /></Button></DialogFooter></DialogContent></Dialog>
    <AlertDialog open={Boolean(pendingAction)} onOpenChange={(open) => { if (!open && !isWorking) setPendingAction(null); }}><AlertDialogContent className="border-border bg-popover text-popover-foreground"><AlertDialogHeader><AlertDialogTitle className="font-display tracking-[-.04em]">Confirm reviewable action</AlertDialogTitle><AlertDialogDescription>{pendingAction ? `${pendingAction.title} will create a persistent ${pendingAction.workType} work item for the active role, organization, and project. Confirm that the supporting information and approval path are ready before adding it to review.` : ""}</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel className="btn-press border-border bg-card text-card-foreground hover:bg-muted">Cancel</AlertDialogCancel><AlertDialogAction onClick={() => pendingAction && recordAction(pendingAction.title, pendingAction.detail, pendingAction.workType, pendingAction.clearNote)} disabled={isWorking} className="btn-press bg-teal-300 text-[#04120f] hover:bg-teal-200">{isWorking ? "Creating…" : "Confirm and add"}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
  </>;
}
