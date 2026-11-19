"use client";
import { useEffect, useRef, useState } from "react";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScanOverlay } from "./ScanOverlay";
import { formatNaira } from "./furniture-data";
import { PinItem } from "./lusense";
import { scanFeedImage, type ScanResult } from "@/lib/lusense-api";

export function StepScan({
  item,
  onNext,
  onScan,
}: {
  item: PinItem;
  onNext: (budget: number) => void;
  onScan: (result: ScanResult) => void;
}) {
  const [budget, setBudget] = useState("");
  const [result, setResult] = useState<ScanResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [budgetError, setBudgetError] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    setResult(null);
    scanFeedImage(item.src)
      .then((r) => {
        if (active) {
          setResult(r);
          onScan(r);
        }
      })
      .catch((e) => {
        if (active)
          setError(e instanceof Error ? e.message : "Image analysis failed");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [item.src, onScan]);
  const submit = () => {
    const val = Number(budget);
    if (!Number.isFinite(val) || val <= 0) {
      setBudgetError(true);
      inputRef.current?.focus();
      return;
    }
    setBudgetError(false);
    onNext(val);
  };
  const size = result?.image_size;
  return (
    <div className="flex flex-col">
      <div className="relative w-full overflow-hidden bg-zinc-900 rounded-t-2xl mt-3">
        <img
          src={item.src}
          alt={item.title}
          className="block w-full h-auto opacity-90"
        />
        <ScanOverlay isScanning={loading} />
        {result && size && (
          <svg
            className="absolute inset-0 w-full h-full pointer-events-none"
            viewBox={`0 0 ${size.width} ${size.height}`}
            preserveAspectRatio="none"
            aria-label="Detected furniture bounding boxes"
          >
            {result.detections.map((d, i) => (
              <g key={i}>
                <rect
                  x={d.box.x1}
                  y={d.box.y1}
                  width={Math.max(0, d.box.x2 - d.box.x1)}
                  height={Math.max(0, d.box.y2 - d.box.y1)}
                  fill="rgba(139,92,246,.08)"
                  stroke="#a78bfa"
                  strokeWidth={Math.max(2, size.width / 300)}
                />
                <text
                  x={d.box.x1}
                  y={Math.max(18, d.box.y1 - 6)}
                  fill="white"
                  stroke="#4c1d95"
                  paintOrder="stroke"
                  strokeWidth={Math.max(3, size.width / 160)}
                  fontSize={Math.max(14, size.width / 45)}
                  fontWeight="bold"
                >
                  {d.object_name}
                  {/* {Math.round(d.confidence * 100)}% */}
                </text>
              </g>
            ))}
          </svg>
        )}
      </div>
      <div className="p-5 space-y-4">
        <Badge
          variant="outline"
          className="border-violet-300 text-violet-700 bg-violet-50"
        >
          {loading ? "Scanning…" : error ? "Scan failed" : "Scan complete"}
        </Badge>
        {result && (
          <div className="space-y-1 pt-1">
            <p className="text-xs font-semibold text-violet-600 dark:text-violet-400">
              AI-detected furniture · Beta
            </p>
            <p className="text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
              Results are estimates. Some furniture may be missed or incorrectly
              identified.
            </p>
          </div>
        )}
        <div>
          <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
            {item.title}
          </h2>
          <p className="text-sm text-zinc-500">
            {loading
              ? "Identifying furniture in this image…"
              : result
                ? `Detected ${result.detections.length} furniture object(s)`
                : "Unable to analyze image"}
          </p>
        </div>
        {error && (
          <p role="alert" className="text-sm text-red-600 wrap-break-word">
            {error}
          </p>
        )}
        {result && result.items.length === 0 && (
          <p className="text-sm text-zinc-500">
            No supported furniture detected. Try another feed image.
          </p>
        )}
        <div className="space-y-2">
          {result?.items.map((fi, i) => (
            <div
              key={`${fi.object_name}-${i}`}
              className="flex items-center justify-between rounded-xl px-3.5 py-2.5 bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-100 dark:border-zinc-700/50"
            >
              <div>
                <p className="text-sm font-medium">{fi.object_name}</p>
                <p className="text-xs text-zinc-400">×{fi.quantity}</p>
              </div>
              <span className="text-sm font-semibold text-violet-700 dark:text-violet-400">
                {fi.price
                  ? formatNaira(fi.price.typical * fi.quantity)
                  : "Price unavailable"}
              </span>
            </div>
          ))}
        </div>
        <Separator className="bg-zinc-100 dark:bg-zinc-800" />
        <div className="flex justify-between">
          <span className="text-sm text-zinc-500">
            Estimated total{" "}
            {result && !result.pricing_complete ? "(priced items only)" : ""}
          </span>
          <span className="text-lg font-bold">
            {result ? formatNaira(result.estimated_total.typical) : "—"}
          </span>
        </div>
        <p className="text-xs text-zinc-400">
          Catalog estimates, not verified retailer offers.
        </p>
        <div className="space-y-2">
          <label htmlFor="sense-budget" className="text-sm font-medium">
            What&apos;s your target budget?
          </label>
          <div className="relative mt-2">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-semibold text-zinc-400">
              ₦
            </span>
            <Input
              id="sense-budget"
              ref={inputRef}
              type="number"
              min={1}
              placeholder="e.g. 500000"
              value={budget}
              onChange={(e) => {
                setBudget(e.target.value);
                setBudgetError(false);
              }}
              className="pl-8 h-11 text-sm rounded-xl"
            />
          </div>
          {budgetError && (
            <p className="text-xs text-red-500">Please enter a valid budget</p>
          )}
        </div>
        <Button
          onClick={submit}
          disabled={loading || !result || result.items.length === 0}
          className="w-full h-11 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-medium text-sm gap-2"
        >
          <Sparkles className="w-4 h-4" />
          Find My Alternatives
        </Button>
      </div>
    </div>
  );
}
