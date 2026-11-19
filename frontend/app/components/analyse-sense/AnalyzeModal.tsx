"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { StepScan } from "./StepScan";
import { StepResults } from "./StepResults";
import { AnalyzeModalProps } from "./lusense";
import { cn } from "@/lib/utils";
import type { ScanResult } from "@/lib/lusense-api";
import { useCallback } from "react";

type Step = "scan" | "results";

export function AnalyzeModal({ open, onOpenChange, item }: AnalyzeModalProps) {
  const [step, setStep] = useState<Step>("scan");
  const [budget, setBudget] = useState<number>(0);
  const [scan, setScan] = useState<ScanResult | null>(null);
  const onScan = useCallback((result: ScanResult) => setScan(result), []);

  // Reset to step 1 every time the modal opens
  useEffect(() => {
    if (open) {
      setStep("scan");
      setBudget(0);
      setScan(null);
    }
  }, [open]);

  const handleNext = (userBudget: number) => {
    setBudget(userBudget);
    setStep("results");
  };

  const handleBack = () => {
    setStep("scan");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[70vh] overflow-y-auto z-200">
        {/* Accessible title (visually hidden — heading is inside each step) */}
        <DialogTitle asChild>
          <VisuallyHidden>Analyze Sense — {item.title}</VisuallyHidden>
        </DialogTitle>

        <div>
          {/* Step indicator dots */}
          <div className="absolute top-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 z-10">
            {(["scan", "results"] as Step[]).map((s) => (
              <span
                key={s}
                className={cn(
                  "block rounded-full transition-all duration-300",
                  step === s
                    ? "w-4 h-1.5 bg-violet-500"
                    : "w-1.5 h-1.5 bg-zinc-300 dark:bg-zinc-600",
                )}
              />
            ))}
          </div>

          {/* Step content with slide transition */}
          <div className="relative overflow-hidden">
            {/* Step 1 */}
            <div
              className={cn(
                "transition-all duration-400 ease-in-out",
                step === "scan"
                  ? "translate-x-0 opacity-100"
                  : "-translate-x-full opacity-0 absolute inset-0 pointer-events-none",
              )}
            >
              <StepScan item={item} onNext={handleNext} onScan={onScan} />
            </div>

            {/* Step 2 */}
            <div
              className={cn(
                "transition-all duration-400 ease-in-out",
                step === "results"
                  ? "translate-x-0 opacity-100"
                  : "translate-x-full opacity-0 absolute inset-0 pointer-events-none",
              )}
            >
              {step === "results" && scan && (
                <StepResults
                  item={item}
                  budget={budget}
                  scan={scan}
                  onBack={handleBack}
                />
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
