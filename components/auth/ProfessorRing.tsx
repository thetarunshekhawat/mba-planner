'use client';

import { useRef, useCallback, useEffect, useState, useMemo, ReactNode } from 'react';
import Image from 'next/image';
import { type Professor } from '@/data/professors';

const RADIUS_X = 145;
const RADIUS_Y = 106;
const ITEM_SIZE = 64;
const INITIAL_ROT = 90;
const DRAG_SENSITIVITY = 0.36;  // px → degrees
const FRICTION = 0.93;           // velocity decay per frame
const SNAP_THRESHOLD = 0.35;     // deg/frame below which we snap
const CLICK_MAX_PX = 8;          // max movement to count as a click (not a drag)

type IntroPhase = 'hidden' | 'rising' | 'expanding' | 'done';

interface Props {
  professors: Professor[];
  onActiveChange: (index: number) => void;
  onAngleChange: (angle: number) => void;
  onDragChange: (dragging: boolean) => void;
  onIntroComplete?: () => void;
  dispersing?: boolean;
  children: ReactNode;
}

export function ProfessorRing({
  professors,
  onActiveChange,
  onAngleChange,
  onDragChange,
  onIntroComplete,
  dispersing = false,
  children,
}: Props) {
  const N = professors.length;
  const ANGLE_PER = 360 / N;

  const [rotation, setRotation] = useState(INITIAL_ROT);
  const [imgErrors, setImgErrors] = useState<Record<string, boolean>>({});
  const [introPhase, setIntroPhase] = useState<IntroPhase>('hidden');

  const rotRef = useRef(INITIAL_ROT);
  const rafRef = useRef<number>(0);
  const startXRef = useRef(0);
  const startRotRef = useRef(INITIAL_ROT);
  const lastXRef = useRef(0);
  const pxVelRef = useRef(0);
  const angVelRef = useRef(0);
  const totalDragRef = useRef(0);
  const clickedIdxRef = useRef(-1); // professor index nearest to pointer-down
  const prevActiveIdxRef = useRef(-1);

  // 'auto' | 'drag' | 'momentum' | 'snap'
  const modeRef = useRef<'auto' | 'drag' | 'momentum' | 'snap'>('auto');
  const snapStartRef = useRef(INITIAL_ROT);
  const snapTargetRef = useRef(INITIAL_ROT);
  const snapStartTimeRef = useRef(0);

  const getActiveIndex = useCallback(
    (rot: number) => {
      const raw = Math.round((INITIAL_ROT - rot) / ANGLE_PER);
      return ((raw % N) + N) % N;
    },
    [N, ANGLE_PER],
  );

  // Snap to nearest professor from a given rotation, choosing shortest arc
  const startSnap = useCallback(
    (fromRot: number) => {
      const rawIndex = (INITIAL_ROT - fromRot) / ANGLE_PER;
      const nearest = Math.round(rawIndex);
      let target = INITIAL_ROT - nearest * ANGLE_PER;
      // Ensure we travel the shortest arc
      while (target - fromRot > 180) target -= 360;
      while (target - fromRot < -180) target += 360;
      snapStartRef.current = fromRot;
      snapTargetRef.current = target;
      snapStartTimeRef.current = performance.now();
      modeRef.current = 'snap';
    },
    [ANGLE_PER],
  );

  // Snap a specific professor index to the front
  const snapToIndex = useCallback(
    (idx: number) => {
      const fromRot = rotRef.current;
      let target = INITIAL_ROT - idx * ANGLE_PER;
      while (target - fromRot > 180) target -= 360;
      while (target - fromRot < -180) target += 360;
      snapStartRef.current = fromRot;
      snapTargetRef.current = target;
      snapStartTimeRef.current = performance.now();
      modeRef.current = 'snap';
    },
    [ANGLE_PER],
  );

  const tick = useCallback(
    (now: number) => {
      if (modeRef.current === 'auto') {
        const next = rotRef.current + 0.018;
        rotRef.current = next;
        // Three incommensurable sine waves → organic micro-tremor, never repeats
        const vib =
          0.40 * Math.sin(now * 0.0019) +
          0.25 * Math.sin(now * 0.0043) +
          0.15 * Math.sin(now * 0.0089);
        setRotation(next + vib);
      } else if (modeRef.current === 'momentum') {
        angVelRef.current *= FRICTION;
        const next = rotRef.current + angVelRef.current;
        rotRef.current = next;
        setRotation(next);
        if (Math.abs(angVelRef.current) < SNAP_THRESHOLD) {
          startSnap(next);
        }
      } else if (modeRef.current === 'snap') {
        const elapsed = now - snapStartTimeRef.current;
        const t = Math.min(1, elapsed / 560);
        const eased = 1 - Math.pow(1 - t, 3);
        const r =
          snapStartRef.current +
          (snapTargetRef.current - snapStartRef.current) * eased;
        rotRef.current = r;
        setRotation(r);
        if (t >= 1) modeRef.current = 'auto';
      }
      rafRef.current = requestAnimationFrame(tick);
    },
    [startSnap],
  );

  // hidden → rising (after one paint)
  useEffect(() => {
    const id = requestAnimationFrame(() => setIntroPhase('rising'));
    return () => cancelAnimationFrame(id);
  }, []);

  // rising → expanding
  useEffect(() => {
    if (introPhase !== 'rising') return;
    const t = setTimeout(() => setIntroPhase('expanding'), 650);
    return () => clearTimeout(t);
  }, [introPhase]);

  // expanding → done
  useEffect(() => {
    if (introPhase !== 'expanding') return;
    const t = setTimeout(() => {
      setIntroPhase('done');
      onIntroComplete?.();
    }, (N - 1) * 40 + 800 + 60);
    return () => clearTimeout(t);
  }, [introPhase, N, onIntroComplete]);


  // RAF runs only when intro is done and not dispersing
  useEffect(() => {
    if (introPhase !== 'done' || dispersing) return;
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [introPhase, dispersing, tick]);

  useEffect(() => {
    onAngleChange(rotation);
    const newIdx = getActiveIndex(rotation);
    onActiveChange(newIdx);

    const professorChanged =
      introPhase === 'done' &&
      !dispersing &&
      prevActiveIdxRef.current !== -1 &&
      prevActiveIdxRef.current !== newIdx;

    if (professorChanged) {
      // Haptic: Android supports navigator.vibrate; iOS Safari does not (no web API exists)
      try { navigator.vibrate?.(8); } catch { /* ignore */ }
    }
    prevActiveIdxRef.current = newIdx;
  }, [rotation, onAngleChange, onActiveChange, getActiveIndex, introPhase, dispersing]);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (introPhase !== 'done' || dispersing) return;

      modeRef.current = 'drag';
      startXRef.current = e.clientX;
      startRotRef.current = rotRef.current;
      lastXRef.current = e.clientX;
      pxVelRef.current = 0;
      angVelRef.current = 0;
      totalDragRef.current = 0;

      // Find which professor is nearest to the click point (for click-to-focus)
      const rect = e.currentTarget.getBoundingClientRect();
      const cx = e.clientX - rect.left - rect.width / 2;
      const cy = e.clientY - rect.top - rect.height / 2;
      let nearestIdx = -1;
      let nearestDist = Infinity;
      for (let i = 0; i < N; i++) {
        const angle = ((rotRef.current + i * ANGLE_PER) * Math.PI) / 180;
        const px = Math.cos(angle) * RADIUS_X;
        const py = Math.sin(angle) * RADIUS_Y;
        const dist = Math.sqrt((cx - px) ** 2 + (cy - py) ** 2);
        if (dist < nearestDist) {
          nearestDist = dist;
          nearestIdx = i;
        }
      }
      // Only register if click was within ~1.5× item radius
      clickedIdxRef.current = nearestDist < ITEM_SIZE * 1.5 ? nearestIdx : -1;

      onDragChange(true);
      e.currentTarget.setPointerCapture(e.pointerId);
    },
    [N, ANGLE_PER, onDragChange, introPhase, dispersing],
  );

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (modeRef.current !== 'drag') return;
    const dx = e.clientX - startXRef.current;
    totalDragRef.current += Math.abs(e.clientX - lastXRef.current);
    pxVelRef.current = e.clientX - lastXRef.current;
    lastXRef.current = e.clientX;
    // Negate: drag right → ring rotates so items move right
    const next = startRotRef.current - dx * DRAG_SENSITIVITY;
    rotRef.current = next;
    setRotation(next);
  }, []);

  const handlePointerUp = useCallback(() => {
    if (modeRef.current !== 'drag') return;
    onDragChange(false);

    // Short tap → click-to-focus
    if (totalDragRef.current < CLICK_MAX_PX && clickedIdxRef.current >= 0) {
      snapToIndex(clickedIdxRef.current);
      return;
    }

    // Fast release → momentum coast then snap
    const degVel = -pxVelRef.current * DRAG_SENSITIVITY;
    if (Math.abs(degVel) > SNAP_THRESHOLD * 2) {
      angVelRef.current = degVel;
      modeRef.current = 'momentum';
    } else {
      startSnap(rotRef.current);
    }
  }, [onDragChange, snapToIndex, startSnap]);

  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const startPositions = useMemo(() =>
    professors.map((_, i) => ({
      x: (professors.length > 1 ? i / (professors.length - 1) : 0.5) * 480 - 240,
      y: 160 + (i % 2) * 25,
    })), [professors]);

  const isDone = introPhase === 'done';

  return (
    <div
      className="relative"
      style={{
        width: 360,
        height: 280,
        touchAction: 'none',
        userSelect: 'none',
        cursor: isDone && !dispersing ? 'grab' : 'default',
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onDragStart={e => e.preventDefault()}
    >
      {professors.map((prof, i) => {
        const angle = toRad(rotation + i * ANGLE_PER);
        const x = Math.cos(angle) * RADIUS_X;
        const y = Math.sin(angle) * RADIUS_Y;
        const yNorm = y / RADIUS_Y;
        const depth = (yNorm + 1) / 2;
        const isActive = getActiveIndex(rotation) === i;

        const opacity = 0.55 + depth * 0.45;
        const baseScale = 0.62 + depth * 0.38;
        const itemScale = isActive ? baseScale * 1.18 : baseScale;
        const zIndex = Math.round(depth * 90) + 1;
        const showInitials = !prof.imagePath || imgErrors[prof.id];
        const sp = startPositions[i];

        let itemTransform: string;
        let itemOpacity: number;
        let itemTransition: string;

        if (dispersing) {
          const len = Math.sqrt(x * x + y * y) || 1;
          const dX = (x / len) * 750;
          const dY = (y / len) * 750;
          itemTransform = `translate(${dX - ITEM_SIZE / 2}px, ${dY - ITEM_SIZE / 2}px) scale(0)`;
          itemOpacity = 0;
          itemTransition = `transform 0.75s cubic-bezier(0.55,0,1,1) ${i * 35}ms, opacity 0.5s ease ${i * 25}ms`;
        } else if (introPhase === 'hidden') {
          itemTransform = `translate(${sp.x - ITEM_SIZE / 2}px, ${sp.y - ITEM_SIZE / 2}px) scale(0.2)`;
          itemOpacity = 0;
          itemTransition = 'none';
        } else if (introPhase === 'rising') {
          itemTransform = `translate(${-ITEM_SIZE / 2}px, ${-ITEM_SIZE / 2}px) scale(0.45)`;
          itemOpacity = 0.75;
          itemTransition = 'transform 0.65s cubic-bezier(0.55,0,0.45,1), opacity 0.35s ease';
        } else if (introPhase === 'expanding') {
          itemTransform = `translate(${x - ITEM_SIZE / 2}px, ${y - ITEM_SIZE / 2}px) scale(${itemScale})`;
          itemOpacity = opacity;
          itemTransition = `transform 0.75s cubic-bezier(0.34,1.56,0.64,1) ${i * 40}ms, opacity 0.4s ease ${i * 40}ms`;
        } else {
          itemTransform = `translate(${x - ITEM_SIZE / 2}px, ${y - ITEM_SIZE / 2}px) scale(${itemScale})`;
          itemOpacity = opacity;
          itemTransition = 'none';
        }

        return (
          <div
            key={prof.id}
            style={{
              position: 'absolute',
              width: ITEM_SIZE,
              height: ITEM_SIZE,
              left: '50%',
              top: '50%',
              borderRadius: '50%',
              overflow: 'hidden',
              opacity: itemOpacity,
              transform: itemTransform,
              transition: itemTransition,
              transformOrigin: 'center center',
              willChange: 'transform, opacity',
              zIndex,
              boxShadow: isActive && isDone && !dispersing
                ? '0 0 0 2px rgba(255,255,255,0.88), 0 0 22px rgba(255,255,255,0.16)'
                : 'none',
            }}
          >
            {showInitials ? (
              <div
                className="w-full h-full flex items-center justify-center text-white font-bold"
                style={{ background: prof.color, fontSize: 12, letterSpacing: '0.04em' }}
              >
                {prof.initials}
              </div>
            ) : (
              <Image
                src={prof.imagePath}
                alt={prof.name}
                fill
                sizes={`${ITEM_SIZE}px`}
                className="object-cover object-top"
                draggable={false}
                style={{ pointerEvents: 'none' }}
                onError={() =>
                  setImgErrors(prev => ({ ...prev, [prof.id]: true }))
                }
              />
            )}
          </div>
        );
      })}

      {/* Center — login form */}
      <div
        className="absolute z-[100] flex items-center justify-center"
        style={{
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
          pointerEvents: 'auto',
          opacity: (introPhase === 'hidden' || introPhase === 'rising' || dispersing) ? 0 : 1,
          transition: 'opacity 0.5s ease',
          transitionDelay: introPhase === 'expanding' ? '400ms' : '0ms',
        }}
        onPointerDown={e => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}
