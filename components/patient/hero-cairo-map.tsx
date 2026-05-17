"use client";

import dynamic from "next/dynamic";
import { MapPin } from "lucide-react";

const HeroCairoMapTiles = dynamic(() => import("./hero-cairo-map-tiles"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-[#fbfaf5] animate-pulse" />
  ),
});

export function HeroCairoMap() {
  return (
    <div className="hidden xl:block relative animate-rise" aria-hidden>
      <div className="relative aspect-[360/460] w-full overflow-hidden rounded-3xl border border-ink-100 shadow-search bg-[#fbfaf5] isolate">
        <HeroCairoMapTiles />

        {/* Cream wash to soften map colors */}
        <div className="pointer-events-none absolute inset-0 z-[400] bg-gradient-to-b from-white/10 via-transparent to-white/20" />

        {/* Top-left live chip */}
        <div className="absolute top-4 left-4 z-[1000] inline-flex items-center gap-2 rounded-full bg-white/95 backdrop-blur border border-ink-100 px-3 py-1.5 shadow-card">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75 animate-ping" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-teal-500" />
          </span>
          <span className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-ink-700">
            Greater Cairo · 50+ clinics
          </span>
        </div>

        {/* Popup card anchored above the active Maadi pin */}
        <div
          className="absolute z-[1000] pointer-events-none"
          style={{ left: "46%", top: "74%" }}
        >
          <div className="relative -translate-x-1/2 -translate-y-full -mt-3 rounded-xl bg-white border border-ink-100 shadow-card-hover px-3.5 py-2.5 w-[168px]">
            <div className="flex items-center justify-between">
              <div className="font-display font-bold text-[14px] text-ink-900">
                Maadi
              </div>
              <span className="text-[10px] uppercase tracking-[0.12em] font-bold text-teal-600">
                Live
              </span>
            </div>
            <div className="mt-1 flex items-center gap-1.5 text-[11.5px] text-ink-500">
              <span className="inline-flex h-1.5 w-1.5 rounded-full bg-teal-500" />
              12 dentists · 3 open today
            </div>
            <div className="absolute left-1/2 -bottom-1.5 -translate-x-1/2 w-3 h-3 rotate-45 bg-white border-r border-b border-ink-100" />
          </div>
        </div>

        {/* Bottom-right live-map chip */}
        <div className="absolute bottom-4 right-4 z-[1000] inline-flex items-center gap-2 rounded-full bg-ink-900/90 backdrop-blur text-white px-3 py-1.5 shadow-card">
          <MapPin className="w-3 h-3 text-teal-300" />
          <span className="text-[10.5px] font-bold uppercase tracking-[0.14em]">
            Live map
          </span>
        </div>
      </div>
    </div>
  );
}
