import type { Metadata, Viewport } from 'next';
import { DM_Sans } from 'next/font/google';
import './globals.css';

const dmSans = DM_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-dm-sans',
  display: 'swap',
});

// No metadata title here: each screen names itself with useDocumentTitle
// (WCAG 2.4.2), and a metadata title would overwrite it after hydration.
export const metadata: Metadata = {
  description: 'Plan hangouts with your pod.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: 'rgb(0 41 145)',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <title>HeyPal</title>
      </head>
      <body className={dmSans.variable}>
        <div className="phone-shell">{children}</div>
      </body>
    </html>
  );
}
