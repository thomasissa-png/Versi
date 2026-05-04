/**
 * AngleController — Étape 4 v2 / s30 Vague 3a
 *
 * Contrôleur d'angle de prise de vue (orientation photographe).
 * Affiché APRÈS placement réussi d'une photo. 0° = nord, sens horaire.
 *
 * Deux modes d'interaction (a11y mobile + clavier OK) :
 *  - Cercle pivotable (drag rotation, desktop principalement)
 *  - Slider 0-360° (fallback mobile + clavier)
 *
 * Commit : appelle onCommit(angle_degrees) quand l'utilisateur relâche
 * (pattern dual-callback s27.2 — pas un PATCH par micro-rotation).
 */

"use client";

import { useState, useCallback, useRef } from "react";

export interface AngleControllerProps {
  /** Angle initial (0-359, ou null si non encore défini). */
  initialAngle: number | null;
  /** Callback live (drag visuel sans commit) — pattern dual-callback. */
  onAngleChange?: (angle: number) => void;
  /** Callback final (mouseup / blur slider) — 1 PATCH API. */
  onCommit: (angle: number) => void;
  /** True pendant un commit en vol. */
  isCommitting?: boolean;
  /** Désactive les interactions. */
  disabled?: boolean;
}

const CIRCLE_SIZE = 96; // px
const CIRCLE_RADIUS = CIRCLE_SIZE / 2 - 6;

export default function AngleController({
  initialAngle,
  onAngleChange,
  onCommit,
  isCommitting = false,
  disabled = false,
}: AngleControllerProps) {
  // Resync via prop : utiliser `key` côté parent pour remount sur changement
  // de photo (cf. VisualPlacementView `key={focusedPhoto.id}`). Évite le pattern
  // setState-in-effect signalé par react-hooks/set-state-in-effect (React 19).
  const [angle, setAngle] = useState<number>(initialAngle ?? 0);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const lastEmittedRef = useRef<number>(angle);

  const computeAngleFromPointer = useCallback(
    (clientX: number, clientY: number): number => {
      const el = containerRef.current;
      if (!el) return angle;
      const rect = el.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      // 0° = nord (haut), sens horaire
      const rad = Math.atan2(clientX - cx, -(clientY - cy));
      let deg = (rad * 180) / Math.PI;
      if (deg < 0) deg += 360;
      return Math.round(deg) % 360;
    },
    [angle]
  );

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (disabled || isCommitting) return;
      e.currentTarget.setPointerCapture(e.pointerId);
      setIsDragging(true);
      const a = computeAngleFromPointer(e.clientX, e.clientY);
      setAngle(a);
      onAngleChange?.(a);
      lastEmittedRef.current = a;
    },
    [disabled, isCommitting, computeAngleFromPointer, onAngleChange]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!isDragging) return;
      const a = computeAngleFromPointer(e.clientX, e.clientY);
      setAngle(a);
      // Throttle natif : émet seulement si delta > 1°
      if (Math.abs(a - lastEmittedRef.current) >= 1) {
        onAngleChange?.(a);
        lastEmittedRef.current = a;
      }
    },
    [isDragging, computeAngleFromPointer, onAngleChange]
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!isDragging) return;
      e.currentTarget.releasePointerCapture(e.pointerId);
      setIsDragging(false);
      onCommit(angle);
    },
    [isDragging, angle, onCommit]
  );

  const handleSliderChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const a = Number.parseInt(e.target.value, 10);
      setAngle(a);
      onAngleChange?.(a);
    },
    [onAngleChange]
  );

  const handleSliderCommit = useCallback(() => {
    onCommit(angle);
  }, [angle, onCommit]);

  // Indicateur visuel : pointe à l'angle courant
  const rad = ((angle - 90) * Math.PI) / 180;
  const indicatorX = CIRCLE_SIZE / 2 + Math.cos(rad) * CIRCLE_RADIUS;
  const indicatorY = CIRCLE_SIZE / 2 + Math.sin(rad) * CIRCLE_RADIUS;

  return (
    <div className="vs-angle-controller flex flex-col items-center gap-sm p-md bg-bg-card rounded-md border border-border-default">
      <p className="text-xs uppercase tracking-widest text-text-muted">
        Direction de la prise de vue
      </p>

      {/* Cercle pivotable */}
      <div
        ref={containerRef}
        className="relative select-none touch-none"
        style={{ width: CIRCLE_SIZE, height: CIRCLE_SIZE }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        role="img"
        aria-label={`Direction prise de vue ${angle}°`}
      >
        <svg
          width={CIRCLE_SIZE}
          height={CIRCLE_SIZE}
          viewBox={`0 0 ${CIRCLE_SIZE} ${CIRCLE_SIZE}`}
          aria-hidden="true"
          className={
            disabled || isCommitting
              ? "opacity-50 cursor-not-allowed"
              : "cursor-pointer"
          }
        >
          {/* Cercle de base — Round 3 s30 fix D4 : tokens design system. */}
          <circle
            cx={CIRCLE_SIZE / 2}
            cy={CIRCLE_SIZE / 2}
            r={CIRCLE_RADIUS}
            fill="var(--color-bg-canvas)"
            stroke="var(--color-border-default)"
            strokeWidth={1.5}
          />
          {/* Repère N (nord) */}
          <text
            x={CIRCLE_SIZE / 2}
            y={10}
            textAnchor="middle"
            fontSize="10"
            fill="var(--color-text-muted)"
          >
            N
          </text>
          {/* Trait direction */}
          <line
            x1={CIRCLE_SIZE / 2}
            y1={CIRCLE_SIZE / 2}
            x2={indicatorX}
            y2={indicatorY}
            stroke="var(--color-text-default)"
            strokeWidth={2.5}
            strokeLinecap="round"
          />
          {/* Pointe — `interactive-primary` = noir-profond Versi (charte calcaire/minéral). */}
          <circle
            cx={indicatorX}
            cy={indicatorY}
            r={5}
            fill="var(--color-interactive-primary)"
            stroke="var(--color-bg-default)"
            strokeWidth={2}
          />
        </svg>
      </div>

      {/* Slider fallback / mobile / clavier */}
      <label htmlFor="angle-slider" className="sr-only">
        Angle (degrés)
      </label>
      <input
        id="angle-slider"
        type="range"
        min={0}
        max={359}
        step={1}
        value={angle}
        onChange={handleSliderChange}
        onMouseUp={handleSliderCommit}
        onTouchEnd={handleSliderCommit}
        onBlur={handleSliderCommit}
        disabled={disabled || isCommitting}
        className="w-full max-w-[180px] accent-interactive-primary"
        aria-label="Angle de prise de vue en degrés"
        aria-valuenow={angle}
        aria-valuemin={0}
        aria-valuemax={359}
      />
      <span className="text-sm font-medium text-text-default tabular-nums">
        {angle}°
      </span>
    </div>
  );
}
