import type { DadosSite } from '@/lib/site/tipos';

// Sem nota nem avaliações nos dados = seção omitida.
export function ProvaSocial({ empresa }: DadosSite) {
  const { nota, total_avaliacoes: totalAvaliacoes, avaliacoes } = empresa.prova_social;
  if (nota === null && avaliacoes.length === 0) return null;

  return (
    <section className="site-secao">
      <div className="mx-auto flex max-w-4xl flex-col items-center gap-6 text-center">
        {nota !== null ? (
          <div>
            <p className="text-4xl font-bold">{nota.toFixed(1)}</p>
            <p className="text-sm opacity-70">
              {totalAvaliacoes ?? 0} avaliaç{totalAvaliacoes === 1 ? 'ão' : 'ões'}
            </p>
          </div>
        ) : null}
        {avaliacoes.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {avaliacoes.slice(0, 4).map((avaliacao, indice) => (
              <blockquote
                key={`${avaliacao.autor}-${indice}`}
                className="rounded-[var(--raio-borda)] border border-current/10 p-4 text-left text-sm"
              >
                <p className="opacity-90">&ldquo;{avaliacao.texto}&rdquo;</p>
                <footer className="mt-2 text-xs font-medium opacity-70">{avaliacao.autor}</footer>
              </blockquote>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}
