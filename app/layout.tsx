import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = { title: 'Eletro Paulínia', description: 'Ordens de serviço' };
export default function RootLayout({ children }: {
    children: React.ReactNode;
}) { return <html lang="pt-BR"><body>{children}</body></html>; }
