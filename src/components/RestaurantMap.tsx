/// <reference types="google.maps" />
import { useEffect, useRef, useState } from "react";
import type { LocalRestaurant } from "@/lib/local-restaurants.functions";
import { MapPin } from "lucide-react";

declare global { interface Window { initMacroChefMap?: () => void; } }
let mapsReady: Promise<void> | undefined;
function loadMaps() {
  if (mapsReady) return mapsReady;
  mapsReady = new Promise<void>((resolve, reject) => {
    const key = import.meta.env['VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY'];
    if (!key) { reject(new Error("Google Maps is not connected.")); return; }
    if (window.google?.maps?.Map) { resolve(); return; }
    window.initMacroChefMap = () => resolve();
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&loading=async&callback=initMacroChefMap&channel=${encodeURIComponent(import.meta.env['VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_TRACKING_ID'] ?? '')}`;
    script.async = true;
    script.onerror = () => reject(new Error("Google Maps could not load. Check the connection and authorized website."));
    document.head.appendChild(script);
  });
  return mapsReady;
}
export function RestaurantMap({ restaurants, selectedId, onSelect }: { restaurants: LocalRestaurant[]; selectedId: string | null; onSelect: (restaurant: LocalRestaurant) => void }) {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<google.maps.Map | null>(null);
  const markers = useRef<google.maps.Marker[]>([]);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    loadMaps().then(() => {
      if (cancelled || !container.current) return;
      map.current = new google.maps.Map(container.current, { zoom: 12, center: { lat: 0, lng: 0 }, clickableIcons: false, streetViewControl: false, mapTypeControl: false, styles: [{ featureType: "poi", stylers: [{ visibility: "off" }] }] });
      setReady(true);
    }).catch((e) => !cancelled && setError(e.message));
    return () => { cancelled = true; markers.current.forEach((m) => { google.maps.event.clearInstanceListeners(m); m.setMap(null); }); map.current = null; };
  }, []);
  useEffect(() => {
    if (!ready || !map.current) return;
    markers.current.forEach((m) => { google.maps.event.clearInstanceListeners(m); m.setMap(null); });
    const bounds = new google.maps.LatLngBounds();
    markers.current = restaurants.map((r, i) => {
      const position = { lat: r.lat, lng: r.lng };
      bounds.extend(position);
      const marker = new google.maps.Marker({ map: map.current, position, title: r.name, label: String(i + 1) });
      marker.addListener("click", () => onSelect(r));
      return marker;
    });
    if (restaurants.length) map.current.fitBounds(bounds, 45);
  }, [restaurants, ready, onSelect]);
  useEffect(() => {
    const selected = restaurants.find((r) => r.id === selectedId);
    if (selected && map.current) map.current.panTo({ lat: selected.lat, lng: selected.lng });
  }, [selectedId, restaurants]);
  return <div className="relative h-[420px] w-full overflow-hidden rounded-md border bg-muted" aria-label="Restaurant map">
    <div ref={container} className="h-full w-full" />
    {error && <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-muted p-6 text-center text-sm"><MapPin className="h-8 w-8 text-muted-foreground" />{error}</div>}
  </div>;
}