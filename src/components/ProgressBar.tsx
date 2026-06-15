"use client";

import type { OperationProgress } from "@/types";

interface ProgressBarProps {
  progress: OperationProgress | null;
  active: boolean;
}

export function ProgressBar({ progress, active }: ProgressBarProps) {
  if (!progress || progress.total === 0) return null;

  const pct = Math.min(100, Math.max(0, progress.percent));
  const isComplete = progress.current >= progress.total && !active;
  const statusText = isComplete
    ? `Complete — ${progress.total} ${progress.unit} ${progress.verb}`
    : `${progress.current} / ${progress.total} ${progress.unit} ${progress.verb}`;

  return (
    <div className={`progress-widget${active ? " progress-widget--active" : ""}${isComplete ? " progress-widget--done" : ""}`}>
      <div className="progress-header">
        <span className="progress-status">{statusText}</span>
        <span className="progress-percent">{pct}%</span>
      </div>
      <div className="progress-track" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
        <div className="progress-fill" style={{ width: `${pct}%` }}>
          {active && <div className="progress-shimmer" />}
        </div>
      </div>
      {progress.label && active && (
        <p className="progress-label">{progress.label}</p>
      )}
    </div>
  );
}
