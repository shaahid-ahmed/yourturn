import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Unspoken',
  description: 'Plan hangouts with your pod.',
  viewport: 'width=device-width, initial-scale=1, viewport-fit=cover',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <div className="phone-shell">{children}</div>
      </body>
    </html>
  );
}
