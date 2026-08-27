import { EmptyState, StatusPill, WajenziId, WorkspaceFrame } from "@/components/WorkspaceFrame";
import { MapView } from "@/components/Map";
import { trpc } from "@/lib/trpc";
import { Crosshair, MapPinned, Save } from "lucide-react";
import { useCallback, useState } from "react";
import { toast } from "sonner";

type Point = { latitude: string | number | null; longitude: string | number | null; label: string; wajenziId?: string; verificationStatus?: string | null; addressRaw?: string | null; id: number };

function LocationMap({ sites, facilities, onPick }: { sites: Point[]; facilities: Point[]; onPick: (point: { latitude: number; longitude: number }) => void }) {
  const onMapReady = useCallback((map: google.maps.Map) => {
    const bounds = new google.maps.LatLngBounds();
    const points = [...sites.map(point => ({ ...point, type: "Project site" })), ...facilities.map(point => ({ ...point, type: "Supplier facility" }))];
    points.forEach(point => {
      if (point.latitude == null || point.longitude == null) return;
      const position = { lat: Number(point.latitude), lng: Number(point.longitude) };
      bounds.extend(position);
      new google.maps.marker.AdvancedMarkerElement({ map, position, title: `${point.type}: ${point.label}` });
    });
    if (!bounds.isEmpty()) map.fitBounds(bounds, 70);
    map.addListener("click", (event: google.maps.MapMouseEvent) => { if (event.latLng) onPick({ latitude: event.latLng.lat(), longitude: event.latLng.lng() }); });
  }, [sites, facilities, onPick]);
  return <MapView key={`${sites.length}-${facilities.length}`} initialCenter={{ lat: -1.286389, lng: 36.817223 }} initialZoom={11} onMapReady={onMapReady} className="h-[520px] overflow-hidden rounded-2xl border border-slate-200" />;
}

export default function Locations() {
  const utils = trpc.useUtils();
  const locations = trpc.procurement.locations.useQuery(undefined, { retry: false });
  const [picked, setPicked] = useState<{ latitude: number; longitude: number } | null>(null);
  const updateSite = trpc.procurement.updateSiteCoordinates.useMutation({ onSuccess: () => { toast.success("Project-site coordinate updated with an audit event."); utils.procurement.locations.invalidate(); }, onError: error => toast.error(error.message) });
  const firstSite = locations.data?.sites[0];
  return <WorkspaceFrame eyebrow="Spatial registry" title="Project sites & supplier facilities" description="Coordinates are first-class governed records. Select a project anchor on the map, retain the location confidence, and use verified supplier facilities for distance-aware procurement." action={<div className="rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-xs font-medium text-teal-100">Click map to choose a project pin</div>}>
    <section className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">{locations.isLoading ? <div className="data-card rounded-2xl p-8 text-sm text-muted-foreground">Loading spatial records…</div> : locations.error ? <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-800">{locations.error.message}</div> : locations.data ? <><LocationMap sites={locations.data.sites as Point[]} facilities={locations.data.facilities as Point[]} onPick={setPicked} /><div className="data-card rounded-2xl p-5"><div className="flex items-center gap-2"><Crosshair className="h-4 w-4 text-teal-700" /><h2 className="font-display text-xl text-slate-900">Project anchor</h2></div><p className="mt-2 text-xs leading-5 text-muted-foreground">Map selection updates only the active project site within the authenticated workspace and creates an audit event.</p><div className="mt-5 rounded-xl bg-slate-50 p-4"><p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">Selected coordinate</p><p className="mt-2 font-mono-data text-sm text-slate-800">{picked ? `${picked.latitude.toFixed(6)}, ${picked.longitude.toFixed(6)}` : "Click map to select"}</p></div><button disabled={!picked || !firstSite || updateSite.isPending} onClick={() => picked && firstSite && updateSite.mutate({ siteId: firstSite.id, latitude: picked.latitude, longitude: picked.longitude, address: "Selected in WAJENZI map workspace" })} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-teal-800 px-4 py-3 text-sm font-bold text-white transition hover:bg-teal-900 disabled:opacity-50 active:scale-[0.97]"><Save className="h-4 w-4" />{updateSite.isPending ? "Saving governed location…" : "Save project-site pin"}</button><div className="mt-6 border-t soft-divider pt-5"><p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">Distance-ready policy</p><p className="mt-2 text-xs leading-5 text-slate-600">The current procurement view calculates geodesic distance. Route distance and delivery constraints remain a future transport-validated layer.</p></div></div></> : <EmptyState title="No location data available" detail="Add a project site and verified supplier facility before running location-aware procurement." />}</section>
    {locations.data ? <section className="mt-6 grid gap-6 lg:grid-cols-2"><div className="data-card rounded-2xl"><div className="border-b soft-divider px-5 py-4"><p className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">Project sites</p></div>{locations.data.sites.map(site => <div key={site.id} className="border-b soft-divider px-5 py-4 last:border-b-0"><p className="font-medium text-slate-800">{site.label}</p><p className="mt-1"><WajenziId value={site.wajenziId} /></p><p className="mt-2 text-xs text-muted-foreground">{site.addressNormalized || site.addressRaw || "Address pending"}</p></div>)}</div><div className="data-card rounded-2xl"><div className="border-b soft-divider px-5 py-4"><p className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">Verified supplier facilities</p></div>{locations.data.facilities.map(facility => <div key={facility.id} className="border-b soft-divider px-5 py-4 last:border-b-0"><div className="flex items-center justify-between gap-3"><p className="font-medium text-slate-800">{facility.label}</p><StatusPill value={facility.verificationStatus} /></div><p className="mt-1"><WajenziId value={facility.wajenziId} /></p><p className="mt-2 text-xs text-muted-foreground">{facility.addressRaw || "Address pending"}</p></div>)}</div></section> : null}
  </WorkspaceFrame>;
}
