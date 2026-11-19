"use client";

import { useMemo, useState } from "react";
import { X, RotateCcw, Info, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ScanResult } from "@/lib/lusense-api";

const money = (n: number) => `₦${Math.round(n).toLocaleString("en-NG")}`;
const marketUrl = "https://www.google.com/maps/search/?api=1&query=Balogun+Market%2C+Lagos+Island%2C+Lagos";

type Option = {
  variant?: unknown;
  typical_price?: unknown;
  source?: unknown;
  market_location?: unknown;
  shop_name?: unknown;
};

export function ResultsPanel({
  scan,
  error,
  onClose,
  onRetake,
}: {
  scan: ScanResult | null;
  error: string;
  onClose: () => void;
  onRetake: () => void;
}) {
  const [budget, setBudget] = useState("");
  const items = scan?.items ?? [];
  const estimated = scan?.estimated_total.typical ?? 0;
  const priced = Boolean(scan?.pricing_complete && items.length > 0);
  const target = Number(budget);
  const validBudget = budget.trim() !== "" && Number.isFinite(target) && target > 0;
  const needsAlternatives = priced && validBudget && target < estimated;

  const groups = useMemo(() => items.map((item) => {
    const original = item.price ? item.price.typical * item.quantity : Infinity;
    const options = (item.catalog_options as Option[])
      .filter((o) => o.source !== "lusense_demo_sample" && Number.isFinite(Number(o.typical_price)) && Number(o.typical_price) > 0)
      .filter((o) => Number(o.typical_price) * item.quantity < original)
      .sort((a, b) => Number(b.typical_price) - Number(a.typical_price));
    return { item, options, original };
  }), [items]);

  // A choice is budget-compatible only if the remaining items can also fit.
  // Other items may stay at their original estimate or use a cheaper catalog option.
  const minimumSet = groups.reduce((sum, group) => {
    const cheapestOption = group.options.reduce(
      (min, option) => Math.min(min, Number(option.typical_price) * group.item.quantity),
      Infinity,
    );
    return sum + Math.min(group.original, cheapestOption);
  }, 0);
  const optimizedFits = needsAlternatives && Number.isFinite(minimumSet) && minimumSet <= target;

  const fitsWithRest = (groupIndex: number, option: Option) => {
    const remainingMinimum = groups.reduce((sum, group, index) => {
      if (index === groupIndex) return sum;
      const cheapest = group.options.reduce(
        (min, entry) => Math.min(min, Number(entry.typical_price) * group.item.quantity),
        Infinity,
      );
      return sum + Math.min(group.original, cheapest);
    }, 0);
    return Number(option.typical_price) * groups[groupIndex].item.quantity + remainingMinimum <= target;
  };

  return (
    <div className="h-full flex flex-col min-h-0 bg-[#0d0d0d] text-white border-t md:border-t-0 md:border-l border-white/10 shadow-2xl">
      <div className="shrink-0 px-4 pt-3 pb-3 md:px-6 md:pt-8 md:pb-6 border-b border-white/5 bg-linear-to-b from-white/5 to-transparent">
        <div className="flex items-start justify-between mb-3 md:mb-6">
          <div>
            <p className="text-violet-400 text-[10px] font-bold uppercase tracking-[.2em]">Scan Result | AI-detected furniture · Beta</p>
            <h2 className="md:text-2xl text-xl font-bold tracking-tight">Market Value</h2>
          </div>
          <div className="flex gap-2">
            <button onClick={onRetake} aria-label="Retake" className="p-2.5 rounded-full bg-white/5 text-white/50"><RotateCcw size={18} /></button>
            <button onClick={onClose} aria-label="Close" className="p-2.5 rounded-full bg-white/5 text-white/50"><X size={18} /></button>
          </div>
        </div>
        <span className="lg:text-3xl md:text-2xl text-xl font-black">{scan ? money(estimated) : "—"}</span>
        <p className="text-white/40 text-xs mt-2">
          {priced ? "Estimated typical total · not a verified shop offer" : "Partial estimate · some items have no catalog price"}
        </p>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 md:px-6 md:py-6 space-y-5 md:space-y-7 custom-scrollbar">
        {error && <p role="alert" className="text-red-300 text-sm wrap-break-word">{error}</p>}
        {/* {scan && <p className="text-white/60 text-xs">{scan.detections.length} object(s) identified by the model. Labels and boxes reflect actual detection results.</p>} */}
        {scan && (
          <div className="space-y-1">
            <p className="text-white/70 text-xs">
              {scan.detections.length} furniture object(s) identified.
            </p>
            <p className="text-white/40 text-xs leading-relaxed">
              Beta results may miss or incorrectly identify furniture.
              Prices are estimates.
            </p>
          </div>
        )}
        {scan && items.length === 0 && <p className="text-white/60 text-sm">No supported furniture detected. Try another angle or better lighting.</p>}
        <section className="space-y-4">
          <p className="text-white/40 text-[11px] font-bold uppercase tracking-wider">Component Breakdown</p>
          {items.map((item, i) => (
            <div key={i} className="p-4 rounded-2xl border bg-white/3 border-white/5">
              <div className="flex justify-between gap-3">
                <div>
                  <p className="text-white font-semibold text-sm">{item.object_name} × {item.quantity}</p>
                  <p className="text-white/40 text-xs mt-1">{item.price ? `${money(item.price.min * item.quantity)}–${money(item.price.max * item.quantity)} range` : "Pricing unavailable"}</p>
                </div>
                <strong className="text-sm whitespace-nowrap">{item.price ? money(item.price.typical * item.quantity) : "—"}</strong>
              </div>
            </div>
          ))}
        </section>
        <section className="space-y-3">
          <label htmlFor="camera-budget" className="text-white/50 text-[11px] font-bold uppercase tracking-wider flex gap-1 items-center">Adjust Your Budget <Info size={12} /></label>
          <div className="flex items-center rounded-xl bg-white/5 border border-white/10 px-3">
            <span className="text-white/50">₦</span>
            <input id="camera-budget" inputMode="numeric" type="number" min="1" value={budget} onChange={(e) => setBudget(e.target.value)} placeholder="Enter your target budget" className="w-full bg-transparent text-white px-2 py-3 outline-none text-sm" />
          </div>
          {validBudget && priced && (
            <p className={cn("text-sm font-medium", target >= estimated ? "text-emerald-400" : "text-amber-300")}>
              {target >= estimated
                ? target === estimated ? "This look fits your budget exactly." : `This look fits your budget · ${money(target - estimated)} remaining`
                : `${money(estimated - target)} above your budget`}
            </p>
          )}
          {validBudget && !priced && <p className="text-xs text-amber-300">Some detected items lack pricing. Budget fit cannot be confirmed.</p>}
        </section>
        {needsAlternatives && (
          <section className="space-y-3">
            <p className="text-white/40 text-[11px] font-bold uppercase tracking-wider">Budget Bridge · Lower-cost catalog options</p>
            <p className="text-xs text-white/60">
              {optimizedFits
                ? "A lower-cost combination may fit your budget. Compare the options below and choose what works for you."
                : "No complete combination in the current catalog is confirmed to fit your budget. You can still compare the lower-cost options below."}
            </p>
            {groups.map(({ item, options }, groupIndex) => (
              <div key={`${item.object_name}-${groupIndex}`} className="p-4 rounded-2xl border bg-violet-600/10 border-violet-500/20 space-y-3">
                <p className="text-sm font-semibold">{item.object_name} × {item.quantity}</p>
                {options.length ? options.map((choice, index) => {
                  const total = Number(choice.typical_price) * item.quantity;
                  const compatible = fitsWithRest(groupIndex, choice);
                  return (
                    <div key={index} className="border-t border-white/10 pt-3">
                      <p className="text-violet-300 text-sm">{String(choice.variant || item.object_name)} · {money(total)}</p>
                      <p className={cn("text-xs mt-1", compatible ? "text-emerald-400" : "text-amber-300")}>
                        {compatible ? "Can fit as part of a lower-cost set" : "Does not fit the full-set budget with current catalog options"}
                      </p>
                      <p className="text-white/40 text-xs mt-1">{String(choice.market_location || "Location unspecified")} · {choice.shop_name ? String(choice.shop_name) : "No verified seller"}</p>
                    </div>
                  );
                }) : <p className="text-white/40 text-xs">No lower-cost catalog option available</p>}
              </div>
            ))}
          </section>
        )}
        <p className="text-white/30 text-xs">Prices are catalog estimates and may vary by seller, location, and availability. Detection accuracy depends on the trained model and image quality.</p>
      </div>
      <div className="shrink-0 border-t border-white/5 bg-[#0d0d0d] px-4 pt-2 pb-[calc(env(safe-area-inset-bottom)+0.5rem)] md:p-6">

        <a href={marketUrl} target="_blank" rel="noopener noreferrer" className="w-full h-10 md:h-12 rounded-xl md:rounded-2xl bg-white text-black hover:bg-zinc-200 active:scale-[0.98]  font-semibold text-sm md:text-base gap-2 transition-all flex items-center justify-center">
          <MapPin size={18} />
          {optimizedFits ? "Source Optimized Look" : needsAlternatives ? "Explore Markets" : "Shop This Set"}
        </a>
      </div>
    </div>
  );
}
