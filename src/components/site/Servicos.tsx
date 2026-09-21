import type { DadosSite } from '@/lib/site/tipos';
import { BotaoWhatsApp } from './BotaoWhatsApp';

// Serviço ausente = seção inteira omitida (nunca um placeholder falso).
export function Servicos({ empresa, conteudo }: DadosSite) {
  if (conteudo.servicos.length === 0) return null;

  return (
    <section className="site-secao">
      <h2 className="mb-6 text-center text-2xl font-bold sm:text-3xl">Serviços</h2>
      <div className="mx-auto grid max-w-4xl gap-6 sm:grid-cols-2">
        {conteudo.servicos.map((servico) => (
          <div
            key={servico.nome}
            className="flex flex-col gap-2 rounded-[var(--raio-borda)] border border-current/10 p-5"
          >
            <h3 className="font-semibold">{servico.nome}</h3>
            {servico.descricao ? <p className="text-sm opacity-80">{servico.descricao}</p> : null}
            <BotaoWhatsApp
              numero={empresa.contato.whatsapp ?? empresa.contato.telefone}
              nomeEmpresa={empresa.nome}
              nomeServico={servico.nome}
              horarios={empresa.horarios}
            />
          </div>
        ))}
      </div>
    </section>
  );
}
