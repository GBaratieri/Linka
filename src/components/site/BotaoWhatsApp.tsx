import type { EmpresaNormalizada } from '@/lib/schemas/empresa';
import { linkWhatsApp, mensagemWhatsApp, statusAtendimento } from '@/lib/site/whatsapp';

// Botão de WhatsApp contextual (seção "Fase 3" do CLAUDE.md): quando o
// número é inválido, não renderiza nada (nunca um botão morto). Fora do
// horário de funcionamento, mostra o aviso mas continua permitindo enviar.
export function BotaoWhatsApp({
  numero,
  nomeEmpresa,
  nomeServico,
  horarios,
  className,
}: {
  numero: string | null;
  nomeEmpresa: string;
  nomeServico?: string;
  horarios: EmpresaNormalizada['horarios'];
  className?: string;
}) {
  if (!numero) return null;

  const link = linkWhatsApp(numero, mensagemWhatsApp(nomeEmpresa, nomeServico));
  if (!link) return null;

  const status = horarios.length ? statusAtendimento(horarios) : null;

  return (
    <div className="flex flex-col items-start gap-1">
      <a
        href={link}
        target="_blank"
        rel="noopener noreferrer"
        className={className ?? 'botao-whatsapp'}
      >
        {nomeServico ? `Peça "${nomeServico}" pelo WhatsApp` : 'Fale pelo WhatsApp'}
      </a>
      {status && !status.aberto && status.proximaAberturaHoje ? (
        <span className="texto-auxiliar">Respondemos a partir de {status.proximaAberturaHoje}</span>
      ) : null}
    </div>
  );
}
