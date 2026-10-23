import Link from 'next/link';
export default function NotFound() { return <main className="p-8"><h1 className="text-2xl font-bold">Página não encontrada</h1><Link className="text-orange-700 underline" href="/ordens">Voltar às ordens</Link></main>; }
