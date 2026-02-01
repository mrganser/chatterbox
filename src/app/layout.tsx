import type { Metadata } from 'next';
import { Header } from '@/components/layout/Header';
import { ToastProvider } from '@/contexts/ToastContext';
import { SocketProvider } from '@/contexts/SocketContext';
import './globals.css';

export const metadata: Metadata = {
  title: 'ChatterBox - Video Chat Made Simple',
  description: 'Free, secure, peer-to-peer video conferencing.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark" data-scroll-behavior="smooth">
      <body>
        <SocketProvider>
          <ToastProvider>
            <div className="min-h-screen flex flex-col bg-background text-foreground">
              <Header />
              <main className="flex-1">{children}</main>
            </div>
          </ToastProvider>
        </SocketProvider>
      </body>
    </html>
  );
}
