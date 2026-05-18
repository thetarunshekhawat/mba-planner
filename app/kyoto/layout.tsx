import type { ReactNode } from 'react';

const KYOTO_CSS = `
  :root {
    --bg: #f6f2ea;
    --surface: #ede7db;
    --raised: #e3ddd0;
    --card: #faf7f2;
    --dim: #d8d0c0;
    --mid: #b4a890;
    --accent: #bf3028;
    --accent-dim: rgba(191,48,40,0.08);
    --glow: rgba(191,48,40,0.05);
    --cream: #1a1008;
    --sand: #5a4838;
    --ash: #9a8a78;
    --font-display: "Libre Baskerville", Georgia, serif;
    --font-body: "Mulish", system-ui, sans-serif;
    --font-mono: "JetBrains Mono", monospace;
    --radius: 3px;
    --radius-sm: 2px;
    --radius-pill: 3px;
  }
`;

export default function KyotoLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link
        href="https://fonts.googleapis.com/css2?family=Libre+Baskerville:ital,wght@0,400;0,700;1,400&family=Mulish:wght@400;500;600;700&family=JetBrains+Mono:wght@400;600&display=swap"
        rel="stylesheet"
      />
      <style dangerouslySetInnerHTML={{ __html: KYOTO_CSS }} />
      {children}
    </>
  );
}
