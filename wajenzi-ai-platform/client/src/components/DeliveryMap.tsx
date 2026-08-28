import { MapView } from "@/components/Map";
import { MapPinned, Navigation, Warehouse } from "lucide-react";
import { useCallback, useRef, useState } from "react";

const source = { lat: -1.2866, lng: 36.8172 };
const destination = { lat: -1.3208, lng: 36.7904 };

export function DeliveryMap() {
  const mapRef = useRef<google.maps.Map | null>(null);
  const [mapStatus, setMapStatus] = useState("Loading live route");
  const [mapError, setMapError] = useState(false);
  const [siteAddress, setSiteAddress] = useState("Westlands, Nairobi");
  const onMapReady = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
    const directionsService = new google.maps.DirectionsService();
    const directionsRenderer = new google.maps.DirectionsRenderer({ map, suppressMarkers: true, polylineOptions: { strokeColor: "#D89116", strokeWeight: 5, strokeOpacity: 0.88 } });
    new google.maps.marker.AdvancedMarkerElement({ map, position: source, title: "Nairobi supplier depot" });
    new google.maps.marker.AdvancedMarkerElement({ map, position: destination, title: "Westlands site drop-off" });
    new google.maps.marker.AdvancedMarkerElement({ map, position: { lat: -1.3047, lng: 36.8021 }, title: "Driver Martin W. · KCA 618B" });
    directionsService.route({ origin: source, destination, travelMode: google.maps.TravelMode.DRIVING }, (result, status) => {
      if (status === "OK" && result) { directionsRenderer.setDirections(result); setMapStatus("Active route · Westlands site"); } else { setMapStatus("Route preview unavailable"); }
    });
  }, []);
  const geocodeSite = () => {
    if (!mapRef.current || !window.google?.maps) { setMapStatus("Live geocoding is unavailable in this preview"); return; }
    const geocoder = new google.maps.Geocoder();
    geocoder.geocode({ address: siteAddress }, (results, status) => {
      if (status === "OK" && results?.[0]) { const location = results[0].geometry.location; mapRef.current?.setCenter(location); new google.maps.marker.AdvancedMarkerElement({ map: mapRef.current, position: location, title: siteAddress }); setMapStatus(`Drop-off located · ${results[0].formatted_address}`); } else setMapStatus("Address could not be located. Try a more specific site address.");
    });
  };
  const geocoder = <div className="pointer-events-auto absolute bottom-4 left-4 right-4 flex flex-col gap-2 rounded-xl border border-white/80 bg-white/92 p-2.5 shadow-lg backdrop-blur sm:left-auto sm:w-[350px] sm:flex-row"><input value={siteAddress} onChange={(event) => setSiteAddress(event.target.value)} className="h-8 min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-2.5 text-xs text-slate-700 outline-none focus:ring-2 focus:ring-amber-500" aria-label="Site address for geocoding" /><button onClick={geocodeSite} className="btn-press inline-flex h-8 items-center justify-center gap-1 rounded-lg bg-slate-800 px-3 text-xs font-bold text-white hover:bg-slate-700"><MapPinned className="size-3" />Locate</button></div>;
  if (mapError) return <div className="grid-fine relative h-[370px] overflow-hidden rounded-b-2xl bg-slate-100 p-5"><div className="amber-glow absolute inset-0" /><div className="relative flex h-full flex-col justify-between"><div className="rounded-xl border border-slate-200 bg-white/85 p-3 shadow-sm backdrop-blur"><p className="text-[10px] font-bold uppercase tracking-[.14em] text-slate-500">Route intelligence</p><p className="mt-1 text-xs font-semibold text-slate-800">Map preview unavailable in this environment</p></div><div className="mx-auto w-full max-w-xl rounded-2xl border border-slate-200 bg-white/90 p-5 shadow-xl backdrop-blur"><div className="flex items-center gap-3"><span className="grid size-9 place-items-center rounded-xl bg-slate-100 text-slate-600"><Warehouse className="size-4" /></span><div><p className="text-sm font-bold text-slate-800">Nairobi supplier depot</p><p className="text-xs text-slate-500">Dispatch origin · -1.2866, 36.8172</p></div></div><div className="mx-4 my-3 flex items-center gap-3"><span className="h-8 border-l-2 border-dashed border-amber-500" /><span className="rounded-full bg-amber-100 px-2 py-1 text-[10px] font-bold text-amber-800">Active driver · KCA 618B</span></div><div className="flex items-center gap-3"><span className="grid size-9 place-items-center rounded-xl bg-amber-100 text-amber-800"><MapPinned className="size-4" /></span><div><p className="text-sm font-bold text-slate-800">Westlands site drop-off</p><p className="text-xs text-slate-500">Destination · -1.3208, 36.7904</p></div><Navigation className="ml-auto size-4 text-amber-700" /></div></div><p className="text-center text-[10px] font-medium text-slate-500">Live geocoding and turn-by-turn directions are enabled when Google Maps is available.</p></div></div>;
  return <div className="relative overflow-hidden rounded-b-2xl"><MapView className="h-[370px]" initialCenter={{ lat: -1.3024, lng: 36.8034 }} initialZoom={12} onMapReady={onMapReady} onMapError={() => setMapError(true)} /><div className="pointer-events-none absolute left-4 top-4 rounded-lg border border-white/80 bg-white/90 px-3 py-2 shadow-lg backdrop-blur"><p className="text-[10px] font-bold uppercase tracking-[.14em] text-slate-500">Route intelligence</p><p className="mt-1 text-xs font-semibold text-slate-800">{mapStatus}</p></div>{geocoder}</div>;
}
