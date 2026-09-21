import type { EmpresaNormalizada } from '@/lib/schemas/empresa';
import { momentoNoFusoDoNegocio } from './fuso';

type HorarioFuncionamento = EmpresaNormalizada['horarios'][number];

// Normaliza um número brasileiro (com ou sem código do país, com ou sem
// pontuação) para o formato E.164 que o wa.me espera: só dígitos, sempre
// com o "55" na frente. Devolve null quando não parece um número válido
// (nem DDD+número de 10/11 dígitos, nem já vindo com 55 na frente).
export function normalizarNumeroBrasileiro(numero: string): string | null {
  const digitos = numero.replace(/\D/g, '');

  if (digitos.startsWith('55') && (digitos.length === 12 || digitos.length === 13)) {
    return digitos;
  }
  if (digitos.length === 10 || digitos.length === 11) {
    return `55${digitos}`;
  }
  return null;
}

// Monta o link do wa.me com a mensagem pré-preenchida (seção "Fase 3" do
// CLAUDE.md). Devolve null quando o número não é válido — quem chama
// decide se omite o botão ou mostra outro contato.
export function linkWhatsApp(numero: string, mensagem: string): string | null {
  const normalizado = normalizarNumeroBrasileiro(numero);
  if (!normalizado) return null;
  return `https://wa.me/${normalizado}?text=${encodeURIComponent(mensagem)}`;
}

export function mensagemWhatsApp(nomeEmpresa: string, nomeServico?: string): string {
  return nomeServico
    ? `Olá! Vim pelo site e gostaria de saber mais sobre "${nomeServico}" da ${nomeEmpresa}.`
    : `Olá! Vim pelo site da ${nomeEmpresa} e gostaria de mais informações.`;
}

export interface StatusAtendimento {
  aberto: boolean;
  // "HH:MM" do próximo horário de abertura hoje — só quando aberto=false e
  // a empresa tem algum horário cadastrado para hoje. Se o dia já não tem
  // mais nenhuma abertura pela frente, cai no primeiro horário do dia (uma
  // simplificação: não calcula o próximo dia útil).
  proximaAberturaHoje: string | null;
}

function paraMinutos(horaFormatada: string): number {
  const [hora, minuto] = horaFormatada.split(':').map(Number);
  return hora * 60 + minuto;
}

// Compara o horário atual (sempre no fuso do negócio, nunca no fuso do
// servidor — ver lib/site/fuso.ts) contra os horários de funcionamento do
// dia (seção "Fase 3": "fora do horário, mostrar 'Respondemos a partir de
// {abertura}' e ainda permitir enviar"). `agora` é injetável pra facilitar
// teste.
export function statusAtendimento(
  horarios: HorarioFuncionamento[],
  agora: Date = new Date(),
): StatusAtendimento {
  const { diaSemana: diaAtual, minutosDesdeMeiaNoite: minutosAgora } = momentoNoFusoDoNegocio(agora);
  const horariosHoje = horarios.filter((h) => h.dia === diaAtual);

  if (horariosHoje.length === 0) {
    return { aberto: false, proximaAberturaHoje: null };
  }

  for (const horario of horariosHoje) {
    if (minutosAgora >= paraMinutos(horario.abre) && minutosAgora < paraMinutos(horario.fecha)) {
      return { aberto: true, proximaAberturaHoje: null };
    }
  }

  const aberturasOrdenadas = [...horariosHoje].sort((a, b) => paraMinutos(a.abre) - paraMinutos(b.abre));
  const proxima = aberturasOrdenadas.find((h) => paraMinutos(h.abre) > minutosAgora);

  return { aberto: false, proximaAberturaHoje: (proxima ?? aberturasOrdenadas[0]).abre };
}
