import type { DadosSite } from '@/lib/site/tipos';

// Sem foto nenhuma nos dados = seção omitida.
export function Galeria({ empresa }: DadosSite) {
  if (empresa.midia.fotos.length === 0) return null;

  return (
    <section className="site-secao">
      <h2 className="mb-6 text-center text-2xl font-bold sm:text-3xl">Fotos</h2>
      <div className="mx-auto grid max-w-4xl grid-cols-2 gap-3 sm:grid-cols-3">
        {empresa.midia.fotos.map((foto) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={foto}
            src={foto}
            alt={`Foto de ${empresa.nome}`}
            className="aspect-square w-full rounded-[var(--raio-borda)] object-cover"
          />
        ))}
      </div>
    </section>
  );
}
