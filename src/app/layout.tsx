import React from 'react';
import './globals.css';

export const metadata = {
  title: 'B2B Project Management System',
  description: 'Enterprise B2B PM System built with Next.js, TypeScript, Tailwind CSS and Firebase',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-TW">
      <body>{children}</body>
    </html>
  );
}
