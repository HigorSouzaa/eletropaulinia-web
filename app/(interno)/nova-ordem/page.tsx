import Link from 'next/link';
export default function Pending() { return <main className="p-8"><h1 className="text-2xl font-bold">Cadastro temporariamente indisponível</h1><p className="my-4">Esta funcionalidade estará disponível após a atualização do cadastro de equipamentos.</p><Link href="/ordens" className="text-orange-700 underline">Voltar às ordens</Link></main>; }
