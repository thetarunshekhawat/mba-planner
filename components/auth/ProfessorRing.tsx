'use client';

import { useRef, useCallback, useEffect, useState, ReactNode } from 'react';
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

interface Props {
  professors: Professor[];
  onActiveChange: (index: number) => void;
  onAngleChange: (angle: number) => void;
  onDragChange: (dragging: boolean) => void;
  children: ReactNode;
}

export function ProfessorRing({
  professors,
  onActiveChange,
  onAngleChange,
  onDragChange,
  children,
}: Props) {
  const N = professors.length;
  const ANGLE_PER = 360 / N;

  const [rotation, setRotation] = useState(INITIAL_ROT);
  const [imgErrors, setImgErrors] = useState<Record<string, boolean>>({});

  const rotRef = useRef(INITIAL_ROT);
  const rafRef = useRef<number>(0);
  const startXRef = useRef(0);
  const startRotRef = useRef(INITIAL_ROT);
  const lastXRef = useRef(0);
  const pxVelRef = useRef(0);
  const angVelRef = useRef(0);
  const totalDragRef = useRef(0);
  const clickedIdxRef = useRef(-1); // professor index nearest to pointer-down

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
        setRotation(next);
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

  useEffect(() => {
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [tick]);

  useEffect(() => {
    onAngleChange(rotation);
    onActiveChange(getActiveIndex(rotation));
  }, [rotation, onAngleChange, onActiveChange, getActiveIndex]);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
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
    [N, ANGLE_PER, onDragChange],
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

  return (
    <div
      className="relative"
      style={{
        width: 360,
        height: 280,
        touchAction: 'none',
        userSelect: 'none',
        cursor: 'grab',
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
        const depth = (yNorm + 1) / 2; // 0 (back/top) → 1 (front/bottom)
        const isActive = getActiveIndex(rotation) === i;

        // Higher floor so back-of-ring items are always visible
        const opacity = 0.55 + depth * 0.45;
        const baseScale = 0.62 + depth * 0.38;
        const itemScale = isActive ? baseScale * 1.18 : baseScale;
        const zIndex = Math.round(depth * 90) + 1;
        const showInitials = !prof.imagePath || imgErrors[prof.id];

        return (
          <div
            key={prof.id}
            style={{
              position: 'absolute',
              width: ITEM_SIZE,
              height: ITEM_SIZE,
              // Fixed center anchor; translate does the orbiting (sub-pixel smooth)
              left: '50%',
              top: '50%',
              borderRadius: '50%',
              overflow: 'hidden',
              opacity,
              transform: `translate(${x - ITEM_SIZE / 2}px, ${y - ITEM_SIZE / 2}px) scale(${itemScale})`,
              transformOrigin: 'center center',
              willChange: 'transform, opacity',
              zIndex,
              boxShadow: isActive
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
        }}
        onPointerDown={e => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}
