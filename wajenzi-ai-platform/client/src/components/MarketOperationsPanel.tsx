import { useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SectionCard, StatePill } from "@/components/dashboard-ui";
import { ArrowRight, ClipboardList, FileCheck2, MapPinned, PackagePlus, Plus, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

type Mode = "buyer" | "supplier" | "project";

export function MarketOperationsPanel({ mode = "buyer" }: { mode?: Mode }) {
  const organizations = trpc.context.organizations.useQuery();
  const projects = trpc.context.projects.useQuery({});
  const organizationId = organizations.data?.[0]?.organization.id;
  const projectId = projects.data?.[0]?.project.id;
  const utils = trpc.useUtils();
  const [listName, setListName] = useState("My project shortlist");
  const [rfqTitle, setRfqTitle] = useState("Materials request");
  const [rfqItem, setRfqItem] = useState("Construction materials");
  const [facilityName, setFacilityName] = useState("Main supplier facility");
  const [facilityLocation, setFacilityLocation] = useState("");

  const savedLists = trpc.marketOperations.savedLists.useQuery(undefined, { enabled: mode === "buyer" });
  const rfqs = trpc.marketOperations.rfqs.useQuery(undefined, { enabled: mode === "buyer" });
  const purchaseOrders = trpc.marketOperations.purchaseOrders.useQuery(undefined, { enabled: mode === "buyer" });
  const projectOps = trpc.marketOperations.projectOperations.useQuery({ organizationId: organizationId ?? 0, projectId: projectId ?? 0 }, { enabled: mode === "project" && Boolean(organizationId && projectId) });
  const facilities = trpc.marketOperations.supplierFacilities.useQuery({ organizationId: organizationId ?? 0 }, { enabled: mode === "supplier" && Boolean(organizationId) });

  const createList = trpc.marketOperations.createSavedList.useMutation({ onSuccess: () => { toast.success("Saved list created."); savedLists.refetch(); }, onError: (error) => toast.error(error.message) });
  const createRfq = trpc.marketOperations.createRfq.useMutation({ onSuccess: () => { toast.success("RFQ draft saved with a canonical-ready line item."); rfqs.refetch(); }, onError: (error) => toast.error(error.message) });
  const createFacility = trpc.marketOperations.createSupplierFacility.useMutation({ onSuccess: () => { toast.success("Facility saved for supplier operations."); facilities.refetch(); }, onError: (error) => toast.error(error.message) });
  const createAsset = trpc.marketOperations.createProjectAsset.useMutation({ onSuccess: () => { toast.success("Project record added to the event history."); projectOps.refetch(); }, onError: (error) => toast.error(error.message) });

  const projectSummary = useMemo(() => {
    const assets = projectOps.data?.assets ?? [];
    return { open: assets.filter((asset) => !["completed", "closed"].includes(asset.status)).length, events: projectOps.data?.events.length ?? 0 };
  }, [projectOps.data]);

  if (mode === "supplier") return <SectionCard title="Supplier operating record" description="Facilities and supplier performance evidence stay linked to the organization that owns them." action={<StatePill label={organizationId ? "Organization selected" : "Select organization"} tone={organizationId ? "success" : "warning"} />}><div className="grid gap-5 p-5 lg:grid-cols-[1fr_1fr]"><div className="space-y-3"><div className="flex items-center gap-2 text-sm font-semibold"><MapPinned className="size-4 text-amber-700" />Add facility</div><Input value={facilityName} onChange={(event) => setFacilityName(event.target.value)} placeholder="Facility name" /><Input value={facilityLocation} onChange={(event) => setFacilityLocation(event.target.value)} placeholder="Location" /><Button disabled={!organizationId || !facilityLocation.trim() || createFacility.isPending} onClick={() => createFacility.mutate({ organizationId: organizationId!, name: facilityName, location: facilityLocation })} className="btn-press bg-foreground text-background hover:bg-foreground/90"><Plus className="mr-2 size-4" />Save facility</Button></div><div><p className="text-sm font-semibold">Configured facilities</p><div className="mt-3 space-y-2">{(facilities.data ?? []).length ? facilities.data?.map((facility) => <div key={facility.id} className="rounded-xl border border-border/70 bg-muted/35 p-3"><p className="text-sm font-semibold">{facility.name}</p><p className="mt-1 text-xs text-muted-foreground">{facility.location} · {facility.status}</p></div>) : <p className="mt-3 text-sm text-muted-foreground">No facility records yet. Add the locations that will support stock and delivery promises.</p>}</div></div></div></SectionCard>;

  if (mode === "project") return <SectionCard title="Project control record" description="A persisted project layer for sites, drawings, BOQs, tasks, risks, costs, inspections, deliveries, and approvals." action={<StatePill label={projectId ? "Project selected" : "Create or select a project"} tone={projectId ? "success" : "warning"} />}><div className="grid gap-4 p-5 sm:grid-cols-3"><div className="rounded-xl bg-muted/45 p-4"><p className="text-xs text-muted-foreground">Open records</p><p className="mt-2 text-2xl font-semibold">{projectSummary.open}</p></div><div className="rounded-xl bg-muted/45 p-4"><p className="text-xs text-muted-foreground">Immutable events</p><p className="mt-2 text-2xl font-semibold">{projectSummary.events}</p></div><div className="rounded-xl bg-muted/45 p-4"><p className="text-xs text-muted-foreground">Project access</p><p className="mt-2 text-sm font-semibold">{projectId ? "Membership verified" : "Not selected"}</p></div><Button disabled={!projectId || !organizationId || createAsset.isPending} onClick={() => createAsset.mutate({ projectId: projectId!, organizationId: organizationId!, assetType: "task", title: "New project control task", description: "Review project scope, documents, cost baseline, and next required action.", status: "open" })} className="sm:col-span-3 btn-press bg-foreground text-background hover:bg-foreground/90"><ClipboardList className="mr-2 size-4" />Add reviewable project task</Button></div></SectionCard>;

  return <SectionCard title="Customer sourcing workspace" description="Save a shortlist, create a reviewable RFQ, and track purchase-order status without leaving the connected marketplace." action={<StatePill label="Protected workflow" tone="success" />}><div className="grid gap-5 p-5 lg:grid-cols-[.9fr_1.1fr]"><div className="space-y-4"><div className="flex items-center gap-2 text-sm font-semibold"><PackagePlus className="size-4 text-amber-700" />Save a project shortlist</div><Input value={listName} onChange={(event) => setListName(event.target.value)} aria-label="Saved list name" /><Button disabled={!listName.trim() || createList.isPending} onClick={() => createList.mutate({ organizationId, name: listName })} className="btn-press bg-foreground text-background hover:bg-foreground/90"><Plus className="mr-2 size-4" />Create saved list</Button><div className="rounded-xl border border-border/70 p-3"><p className="text-xs font-semibold">{savedLists.data?.length ?? 0} saved lists</p><p className="mt-1 text-xs text-muted-foreground">Add marketplace offers to a list from product detail and comparison views.</p></div></div><div className="space-y-4"><div className="flex items-center gap-2 text-sm font-semibold"><FileCheck2 className="size-4 text-amber-700" />Draft an RFQ from a requirement</div><Input value={rfqTitle} onChange={(event) => setRfqTitle(event.target.value)} aria-label="RFQ title" /><Input value={rfqItem} onChange={(event) => setRfqItem(event.target.value)} aria-label="RFQ item" /><Button disabled={!organizationId || !rfqTitle.trim() || !rfqItem.trim() || createRfq.isPending} onClick={() => createRfq.mutate({ organizationId, projectId, title: rfqTitle, items: [{ description: rfqItem, quantity: 1, unit: "LOT" }] })} className="btn-press bg-amber-600 text-white hover:bg-amber-700"><ArrowRight className="mr-2 size-4" />Save RFQ draft</Button><div className="grid gap-2 text-xs text-muted-foreground sm:grid-cols-2"><span>{rfqs.data?.length ?? 0} RFQs</span><span>{purchaseOrders.data?.length ?? 0} purchase orders</span></div></div></div><div className="mt-1 flex items-center gap-2 border-t border-border/70 px-5 pt-4 text-xs text-muted-foreground"><ShieldCheck className="size-4 text-emerald-700" />Quotes, approvals, checkout, and delivery remain evidence-backed workflow states; no payment is captured by this boundary.</div></SectionCard>;
}
