"use client";

import { MapContainer, TileLayer, CircleMarker } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import type { LatLngExpression } from "leaflet";

const CAIRO_CENTER: LatLngExpression = [30.03, 31.27];

const pins: { pos: LatLngExpression; active?: boolean }[] = [
  { pos: [29.96, 31.258], active: true },
  { pos: [29.97, 31.265] },
  { pos: [29.955, 31.249] },
  { pos: [30.10, 31.32] },
  { pos: [30.115, 31.33] },
  { pos: [30.085, 31.31] },
  { pos: [30.06, 31.20] },
  { pos: [30.07, 31.205] },
  { pos: [30.045, 31.213] },
  { pos: [30.065, 31.225] },
  { pos: [30.04, 31.235] },
  { pos: [30.045, 31.247] },
  { pos: [30.06, 31.34] },
  { pos: [30.072, 31.33] },
  { pos: [30.03, 31.225] },
];

export default function HeroCairoMapTiles() {
  return (
    <MapContainer
      center={CAIRO_CENTER}
      zoom={11}
      className="w-full h-full"
      zoomControl={false}
      attributionControl={false}
      scrollWheelZoom={false}
      dragging={false}
      doubleClickZoom={false}
      touchZoom={false}
      keyboard={false}
      boxZoom={false}
    >
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        subdomains="abcd"
        maxZoom={19}
      />
      {pins.map((p, i) => (
        <CircleMarker
          key={i}
          center={p.pos}
          radius={p.active ? 7 : 4}
          pathOptions={{
            color: "white",
            weight: p.active ? 2.5 : 1.5,
            fillColor: "#0d9488",
            fillOpacity: p.active ? 1 : 0.9,
          }}
          interactive={false}
        />
      ))}
    </MapContainer>
  );
}
