import type { DadosSite } from '@/lib/site/tipos';

// Sempre presente (não é uma das "secoes" que o estilo escolhe) — com link
// para o perfil de origem quando existir (seção "Fase 3" do CLAUDE.md).
export function Rodape({ empresa, linkOrigem }: DadosSite) {
  return (
    <footer className="site-secao flex flex-col items-center gap-1 text-center text-xs opacity-60">
      <p>
        © {new Date().getFullYear()} {empresa.nome}
      </p>
      {linkOrigem ? (
        <a href={linkOrigem} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">
          Ver perfil de origem
        </a>
      ) : null}
      <p>Site gerado com Linka</p>
    </footer>
  );
}
