import type { DadosSite } from '@/lib/site/tipos';
import { BotaoWhatsApp } from './BotaoWhatsApp';

export function Hero({ empresa, conteudo, estilo }: DadosSite) {
  return (
    <section className="flex flex-col items-center gap-4 px-6 py-16 text-center sm:py-24">
      {empresa.midia.logo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={empresa.midia.logo}
          alt={`Logo de ${empresa.nome}`}
          className="h-16 w-16 rounded-[var(--raio-borda)] object-cover"
        />
      ) : null}
      <h1
        className="text-3xl font-bold sm:text-5xl"
        style={{ fontFamily: 'var(--fonte-titulos)' }}
      >
        {conteudo.hero.titulo}
      </h1>
      {conteudo.hero.subtitulo ? (
        <p className="max-w-xl text-lg opacity-80">{conteudo.hero.subtitulo}</p>
      ) : null}
      {estilo.destaque_cta === 'telefone' && empresa.contato.telefone ? (
        <a href={`tel:${empresa.contato.telefone}`} className="botao-primario">
          {conteudo.cta_principal}
        </a>
      ) : estilo.destaque_cta === 'mapa' && empresa.endereco.texto ? (
        <a
          href={`https://www.google.com/maps/search/${encodeURIComponent(empresa.endereco.texto)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="botao-primario"
        >
          {conteudo.cta_principal}
        </a>
      ) : (
        // Destaque explícito no WhatsApp, ou o destaque escolhido ('telefone'
        // ou 'mapa') não tem o dado que precisa — o WhatsApp é o canal
        // principal do produto (seção 1 do CLAUDE.md), então é o fallback
        // padrão em vez de deixar o hero sem nenhuma chamada para ação.
        <BotaoWhatsApp
          numero={empresa.contato.whatsapp ?? empresa.contato.telefone}
          nomeEmpresa={empresa.nome}
          horarios={empresa.horarios}
          className="botao-primario"
        />
      )}
    </section>
  );
}
