"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import { X, FlipHorizontal2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { ResultsPanel } from "./ResultsPanel";
import { BoundingBoxes } from "./BoundingBoxes";
import { FrozenFrame } from "./FrozenFrame";
import { LiveFeed } from "./LiveFeed";
import { FocusFrame } from "./FocusFrame";
import { scanImage, type ScanResult } from "@/lib/lusense-api";
export function CameraModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [state, setState] = useState<"capture" | "analysis" | "results">(
    "capture",
  );
  const [facingMode, setFacingMode] = useState<"user" | "environment">(
    "environment",
  );
  const [frame, setFrame] = useState("");
  const [scan, setScan] = useState<ScanResult | null>(null);
  const [error, setError] = useState("");
  const videoRef = useRef<HTMLVideoElement>(null);
  const mounted = useRef(true);
  const requestId = useRef(0);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  useEffect(() => {
    if (open) {
      setState("capture");
      setFrame("");
      setScan(null);
      setError("");
    }
  }, [open]);
  const handleShutter = useCallback(async () => {
    const thisRequest = ++requestId.current;
    const video = videoRef.current;
    if (!video || !video.videoWidth || !video.videoHeight) {
      setError("Camera is not ready. Please allow access and try again.");
      return;
    }
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      setError("Could not capture the image");
      return;
    }
    if (facingMode === "user") {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, 0, 0);
    const image = canvas.toDataURL("image/jpeg", 0.88);
    setFrame(image);
    setError("");
    setScan(null);
    setState("analysis");
    try {
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/jpeg", 0.88),
      );
      if (!blob) throw new Error("Image capture failed");
      const result = await scanImage(
        new File([blob], "camera-capture.jpg", { type: "image/jpeg" }),
      );
      if (mounted.current && requestId.current === thisRequest) {
        setScan(result);
        setState("results");
      }
    } catch (e) {
      if (mounted.current && requestId.current === thisRequest) {
        setError(e instanceof Error ? e.message : "Scan failed");
        setState("results");
      }
    }
  }, [facingMode]);
  const retake = () => {
    requestId.current++;
    setState("capture");
    setFrame("");
    setScan(null);
    setError("");
  };
  if (!open) return null;
  const showPanel = state === "results";
  return (
    <div
      className="fixed inset-0 z-9999 flex items-center justify-center p4"
      style={{ backgroundColor: "rgba(0,0,0,.82)" }}
    >
      <div className="absolute inset-0" onClick={onClose} />
      <div
        className={cn(
          "relative z-10 flex overflow-hidden bg-black rounded-xl flex-col md:flex-row transition-all duration-500 w-[90%]",
          showPanel ? "md:w-200" : "md:w-105",
        )}
        style={{ height:"100dvh", maxHeight:"88dvh",}}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className={cn(
            "relative overflow-hidden bg-black shrink-0 w-full transition-all duration-500 md:w-105",
            showPanel ? "h-[28dvh] max-h-60 md:h-full md:max-h-none" : "h-full",
          )}
        >
          {state === "capture" ? (
            <LiveFeed ref={videoRef} facingMode={facingMode} />
          ) : (
            <FrozenFrame src={frame} />
          )}
          {state === "capture" && <FocusFrame />}
          {scan && <BoundingBoxes scan={scan} visible={showPanel} />}
          {state === "analysis" && (
            <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-3 bg-black/35">
              <div className="w-11 h-11 rounded-full border-2 border-white/20 border-t-white animate-spin" />
              <span className="text-white/75 text-sm font-medium">
                Analysing furniture…
              </span>
            </div>
          )}
          <div className="absolute top-0 left-0 right-0 z-40 flex items-center justify-between p-4">
            <button
              onClick={onClose}
              aria-label="Close camera"
              className="w-9 h-9 rounded-full bg-black/50 flex items-center justify-center text-white"
            >
              <X className="w-4 h-4" />
            </button>
            {state === "capture" ? (
              <span className="bg-black/50 rounded-full px-3 py-1.5 text-white text-xs">
                Ready
              </span>
            ) : (
              <button
                onClick={retake}
                className="bg-black/50 rounded-full px-3 py-1.5 text-white text-xs"
              >
                Retake
              </button>
            )}
            <button
              disabled={state !== "capture"}
              aria-label="Flip camera"
              onClick={() =>
                setFacingMode((f) =>
                  f === "environment" ? "user" : "environment",
                )
              }
              className="w-9 h-9 rounded-full bg-black/50 flex items-center justify-center text-white disabled:opacity-40"
            >
              <FlipHorizontal2 className="w-4 h-4" />
            </button>
          </div>
          {state === "capture" && (
            <div className="absolute bottom-0 left-0 right-0 z-40 flex flex-col items-center gap-2 pb-8 pt-6 bg-linear-to-t from-black/60 to-transparent">
              <button
                onClick={handleShutter}
                aria-label="Capture"
                className="relative group"
              >
                <span className="absolute -inset-2 rounded-full border-2 border-white/40" />
                <span className="block w-16 h-16 rounded-full bg-white" />
              </button>
              <span className="text-white/40 text-xs">Point at furniture</span>
              {error && (
                <p
                  role="alert"
                  className="text-red-300 text-xs text-center px-4"
                >
                  {error}
                </p>
              )}
            </div>
          )}
        </div>
        {showPanel && (
          <div className=" flex-1 min-h-0 overflow-hidden bg-[#0d0d0d] w-full md:w-95 md:h-full max-h-none">
            <ResultsPanel
              scan={scan}
              error={error}
              onClose={onClose}
              onRetake={retake}
            />
          </div>
        )}
      </div>
    </div>
  );
}
