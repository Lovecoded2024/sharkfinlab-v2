import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'SharkFin Lab - AI Trading Arena',
  description: 'AI智能交易员擂台赛 - 巴菲特、索罗斯、西蒙斯三大交易风格对决',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN" className="dark">
      <body className="min-h-screen bg-gray-900 text-white">
        {children}
      </body>
    </html>
  );
}
