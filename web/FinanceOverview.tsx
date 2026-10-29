type CategoryTotal = { category: string; amountCentavos: number };
type Props = {
  receivedCentavos: number;
  expensesCentavos: number;
  resultCentavos: number;
  expensesByCategory: CategoryTotal[];
  forecastCentavos: number;
  readyCentavos: number;
  withdrawnPendingCentavos: number;
};

const money = (cents: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);
const labels: Record<string, string> = { aluguel: 'Aluguel', internet: 'Internet', agua: 'Água', energia: 'Energia', peca: 'Peças', outra: 'Outras' };
const colors = ['#ea580c', '#0f766e', '#4338ca', '#ca8a04', '#be185d', '#475569'];

function Indicator({ label, value, explanation, emphasis = false }: { label: string; value: number; explanation: string; emphasis?: boolean }) {
  return <article className={`rounded-xl border p-4 ${emphasis ? 'border-orange-200 bg-orange-50' : 'bg-white'}`}>
    <h3 className="font-medium text-slate-700">{label}</h3>
    <p className="mt-2 text-2xl font-bold tabular-nums text-slate-950">{money(value)}</p>
    <p className="mt-2 text-sm text-slate-600">{explanation}</p>
  </article>;
}

export function FinanceOverview(props: Props) {
  const categories = props.expensesByCategory.filter(row => row.amountCentavos > 0);
  let position = 0;
  const stops = categories.map((row, index) => {
    const start = position;
    position += row.amountCentavos / props.expensesCentavos * 100;
    return `${colors[index % colors.length]} ${start}% ${position}%`;
  });

  return <section aria-label="Indicadores" className="mt-6 space-y-6">
    <section aria-labelledby="money-heading">
      <div className="mb-3"><h2 id="money-heading" className="text-xl font-semibold">Dinheiro movimentado</h2><p className="text-sm text-slate-600">Somente lançamentos efetivos no período selecionado.</p></div>
      <div className="grid gap-3 md:grid-cols-3">
        <Indicator label="Recebido" value={props.receivedCentavos} explanation="Pagamentos confirmados, descontando estornos do período." />
        <Indicator label="Despesas pagas" value={props.expensesCentavos} explanation="Saídas registradas como pagas no período." />
        <Indicator label="Saldo do período" value={props.resultCentavos} explanation="Recebido menos despesas pagas. Não é lucro contábil." emphasis />
      </div>
    </section>
    <section aria-labelledby="forecast-heading">
      <div className="mb-3"><h2 id="forecast-heading" className="text-xl font-semibold">Valores previstos</h2><p className="text-sm text-slate-600">Orçamentos ainda sem recebimento confirmado. Não são dinheiro em caixa.</p></div>
      <div className="grid gap-3 md:grid-cols-3">
        <Indicator label="Orçamentos em aberto" value={props.forecastCentavos} explanation="Total proposto nas ordens selecionadas, ainda sem pagamento confirmado." emphasis />
        <Indicator label="Prontos aguardando retirada" value={props.readyCentavos} explanation="Parte dos orçamentos em aberto. O equipamento ainda está na loja." />
        <Indicator label="Retirados sem pagamento registrado" value={props.withdrawnPendingCentavos} explanation="Parte dos orçamentos em aberto. Confira o caso; isso não comprova dívida." />
      </div>
      <p className="mt-2 text-sm text-slate-600">Os dois últimos valores já estão incluídos em “Orçamentos em aberto”.</p>
    </section>
    <section aria-labelledby="category-heading" className="rounded-xl border bg-white p-4">
      <h2 id="category-heading" className="text-lg font-semibold">Despesas pagas por categoria</h2>
      <p className="mt-1 text-sm text-slate-600">Distribuição das despesas efetivamente pagas no período.</p>
      {categories.length ? <div className="mt-4 grid items-center gap-6 sm:grid-cols-[minmax(0,14rem)_1fr]">
        <div role="img" aria-label={`Gráfico de rosca de despesas pagas, total ${money(props.expensesCentavos)}`} className="mx-auto grid aspect-square w-full max-w-56 place-items-center rounded-full" style={{ background: `conic-gradient(${stops.join(', ')})` }}>
          <div className="grid h-[62%] w-[62%] place-content-center rounded-full bg-white text-center"><span className="text-xs text-slate-600">Total pago</span><strong className="text-lg tabular-nums">{money(props.expensesCentavos)}</strong></div>
        </div>
        <table className="w-full text-left text-sm"><caption className="sr-only">Valores de despesas pagas por categoria</caption><thead><tr><th className="pb-2">Categoria</th><th className="pb-2 text-right">Valor</th></tr></thead><tbody>{categories.map((row, index) => <tr key={row.category} className="border-t"><td className="py-2"><span aria-hidden="true" className="mr-2 inline-block size-3 rounded-sm" style={{ backgroundColor: colors[index % colors.length] }} />{labels[row.category] ?? row.category}</td><td className="py-2 text-right tabular-nums">{money(row.amountCentavos)}</td></tr>)}</tbody></table>
      </div> : <p className="mt-4 rounded-lg bg-slate-50 p-4 text-sm text-slate-700">Nenhuma despesa paga neste período. Registros previstos não entram no gráfico.</p>}
    </section>
  </section>;
}
