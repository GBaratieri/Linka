import type { DadosSite } from '@/lib/site/tipos';
import { BotaoWhatsApp } from './BotaoWhatsApp';

// Sem nenhum contato nos dados = seção omitida.
export function Contato({ empresa }: DadosSite) {
  const { whatsapp, telefone, email, instagram, site } = empresa.contato;
  const temAlgumContato = Boolean(whatsapp || telefone || email || instagram || site);
  if (!temAlgumContato) return null;

  return (
    <section className="site-secao">
      <div className="mx-auto flex max-w-xl flex-col items-center gap-4 text-center">
        <h2 className="text-2xl font-bold sm:text-3xl">Contato</h2>
        <div className="flex flex-col items-center gap-2 text-sm">
          {telefone ? (
            <a href={`tel:${telefone}`} className="underline underline-offset-2">
              {telefone}
            </a>
          ) : null}
          {email ? (
            <a href={`mailto:${email}`} className="underline underline-offset-2">
              {email}
            </a>
          ) : null}
          {instagram ? (
            <a
              href={`https://instagram.com/${instagram.replace(/^@/, '')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2"
            >
              @{instagram.replace(/^@/, '')}
            </a>
          ) : null}
          {site ? (
            <a href={site} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">
              {site}
            </a>
          ) : null}
        </div>
        {whatsapp || telefone ? (
          <BotaoWhatsApp
            numero={whatsapp ?? telefone}
            nomeEmpresa={empresa.nome}
            horarios={empresa.horarios}
            className="botao-primario"
          />
        ) : null}
      </div>
    </section>
  );
}
