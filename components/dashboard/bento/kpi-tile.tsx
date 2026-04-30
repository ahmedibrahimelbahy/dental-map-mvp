import type { Kpi } from "@/lib/dashboard/data";
import { TrendingUp, TrendingDown } from "lucide-react";

export type KpiTone = "neutral" | "good-up" | "good-down";

export function KpiTile({
  label,
  kpi,
  format = "number",
  tone = "good-up",
  unit,
}: {
  label: string;
  kpi: Kpi;
  format?: "number" | "currency" | "percent";
  tone?: KpiTone;
  unit?: string;
}) {
  const formatted =
    format === "currency"
      ? formatCurrency(kpi.value)
      : format === "percent"
        ? `${kpi.value}%`
        : kpi.value.toString();

  const isUp = (kpi.deltaPct ?? 0) > 0;
  const isDown = (kpi.deltaPct ?? 0) < 0;
  const goodWhenUp = tone === "good-up";
  const isPositive = goodWhenUp ? isUp : isDown;
  const isNegative = goodWhenUp ? isDown : isUp;

  const deltaColor = isPositive
    ? "text-emerald-700"
    : isNegative
      ? "text-rose-700"
      : "text-ink-400";

  const Icon = isUp ? TrendingUp : isDown ? TrendingDown : null;

  return (
    <div className="rounded-2xl bg-white border border-ink-100 shadow-tile p-4 md:p-5 relative overflow-hidden">
      <div className="small-caps">{label}</div>
      <div className="font-display text-[26px] md:text-[30px] font-bold text-ink-900 leading-none mt-2 tracking-tight">
        {formatted}
        {unit && <span className="text-[13px] text-ink-400 font-medium ms-1">{unit}</span>}
      </div>
      {kpi.deltaPct !== null ? (
        <div className={`text-[11px] font-bold mt-2 flex items-center gap-1 ${deltaColor}`}>
          {Icon && <Icon className="w-3 h-3" aria-hidden />}
          {kpi.deltaPct > 0 ? "+" : ""}
          {kpi.deltaPct}%
          <span className="text-ink-400 font-medium">vs last week</span>
        </div>
      ) : (
        <div className="text-[11px] text-ink-400 mt-2 font-medium">— no prior data</div>
      )}
    </div>
  );
}

function formatCurrency(n: number): string {
  if (n >= 1000) {
    return `EGP ${(n / 1000).toFixed(1)}k`;
  }
  return `EGP ${n.toLocaleString()}`;
}
