import { Orders } from '../../../web/Orders';
const statuses = ['Aguardando', 'Em andamento', 'Pronto', 'Entregue'];
export default async function OrdersPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const status = (await searchParams).status;
  return <Orders initialStatus={statuses.includes(status || '') ? status : ''} />;
}
