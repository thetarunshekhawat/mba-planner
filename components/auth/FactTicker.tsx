'use client';

import { useEffect, useState } from 'react';

interface Props {
  /** May briefly be empty while the professor ring is mid-rotation. */
  text: string;
}

export function FactTicker({ text }: Props) {
  const [displayed, setDisplayed] = useState('');
  const [done, setDone] = useState(false);

  useEffect(() => {
    setDisplayed('');
    setDone(false);
    if (!text) {
      setDone(true);
      return;
    }
    let i = 0;
    const id = setInterval(() => {
      i++;
      setDisplayed(text.slice(0, i));
      if (i >= text.length) {
        clearInterval(id);
        setDone(true);
      }
    }, 38);
    return () => clearInterval(id);
  }, [text]);

  return (
    <span className="text-white/40 text-[11px] leading-relaxed">
      {displayed}
      {!done && (
        <span className="animate-pulse opacity-70">|</span>
      )}
    </span>
  );
}
