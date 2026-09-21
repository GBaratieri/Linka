import type { DadosSite } from '@/lib/site/tipos';

// Sem texto de "sobre" (extraído ou gerado) = seção omitida.
export function Sobre({ conteudo }: DadosSite) {
  if (!conteudo.sobre) return null;

  return (
    <section className="site-secao">
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="mb-4 text-2xl font-bold sm:text-3xl">Sobre</h2>
        <p className="opacity-80">{conteudo.sobre}</p>
      </div>
    </section>
  );
}
