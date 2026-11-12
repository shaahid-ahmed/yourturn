import type { Metadata, Viewport } from 'next';
import './globals.css';

// No metadata title here: each screen names itself with useDocumentTitle
// (WCAG 2.4.2), and a metadata title would overwrite it after hydration.
export const metadata: Metadata = {
  description: 'Plan hangouts with your pod.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <title>Unspoken</title>
      </head>
      <body>
        <div className="phone-shell">{children}</div>
      </body>
    </html>
  );
}
