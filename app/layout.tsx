import type { Metadata, Viewport } from 'next';
import { Geist } from 'next/font/google';
import './globals.css';

const geist = Geist({ subsets: ['latin'], variable: '--font-sans' });

export const metadata: Metadata = {
  title: 'MBA Planner — BITSoM Co\'27',
  description: 'Plan your Year 2 electives for Terms 4–6',
  manifest: '/manifest.json',
  // Safari grants web push only to a PWA that has been added to the home
  // screen, so these are not decoration — without them the Alerts tab cannot
  // deliver a notification to an iPhone at all.
  appleWebApp: {
    capable: true,
    title: 'MBA Planner',
    statusBarStyle: 'black-translucent',
  },
};

export const viewport: Viewport = {
  themeColor: '#0F172A',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geist.variable} h-full`}>
      <body className="min-h-full flex flex-col antialiased">{children}</body>
    </html>
  );
}
