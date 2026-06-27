"use client";

import { useEffect, useState, useRef, useCallback } from "react";

interface QuizTimerProps {
  seconds: number;
  onTimeout: () => void;
  paused?: boolean;
}

export default function QuizTimer({ seconds, onTimeout, paused = false }: QuizTimerProps) {
  const [remaining, setRemaining] = useState(seconds);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const onTimeoutRef = useRef(onTimeout);
  onTimeoutRef.current = onTimeout;

  const resetTimer = useCallback(() => {
    setRemaining(seconds);
  }, [seconds]);

  useEffect(() => {
    resetTimer();
  }, [resetTimer]);

  useEffect(() => {
    if (paused) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }

    intervalRef.current = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          onTimeoutRef.current();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [paused, seconds]);

  // Color based on remaining time
  const ratio = remaining / seconds;
  const color =
    ratio > 0.5
      ? "var(--energy-400)"
      : ratio > 0.2
        ? "var(--gold-400)"
        : "var(--blood-400)";

  const circumference = 2 * Math.PI * 36;
  const dashoffset = circumference - ratio * circumference;

  return (
    <div className="relative flex items-center justify-center" style={{ width: 80, height: 80 }}>
      <svg width="80" height="80" viewBox="0 0 80 80" style={{ transform: "rotate(-90deg)" }}>
        {/* Track */}
        <circle
          cx="40" cy="40" r="36"
          fill="none"
          stroke="var(--steel-800)"
          strokeWidth="4"
        />
        {/* Progress */}
        <circle
          cx="40" cy="40" r="36"
          fill="none"
          stroke={color}
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashoffset}
          style={{
            transition: "stroke-dashoffset 1s linear, stroke 0.3s ease",
            filter: ratio <= 0.2 ? `drop-shadow(0 0 6px var(--blood-glow))` : "none",
          }}
        />
      </svg>
      <span
        className="absolute text-xl font-bold tabular-nums"
        style={{ color, transition: "color 0.3s ease" }}
      >
        {remaining}
      </span>
    </div>
  );
}
