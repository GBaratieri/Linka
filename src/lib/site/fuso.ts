// Horários de funcionamento e limites mensais são sempre no fuso do negócio
// (o produto é só para o Brasil) — nunca no fuso do servidor, que em
// produção (Vercel) roda em UTC por padrão. O Brasil não tem mais horário de
// verão desde 2019, então America/Sao_Paulo é sempre UTC-3 (sem variação
// sazonal a considerar aqui).
const FUSO_HORARIO_NEGOCIO = 'America/Sao_Paulo';

const DIA_SEMANA_POR_ABREVIACAO_INTL: Record<string, 'dom' | 'seg' | 'ter' | 'qua' | 'qui' | 'sex' | 'sab'> = {
  Sun: 'dom',
  Mon: 'seg',
  Tue: 'ter',
  Wed: 'qua',
  Thu: 'qui',
  Fri: 'sex',
  Sat: 'sab',
};

export interface MomentoNoFusoDoNegocio {
  diaSemana: 'dom' | 'seg' | 'ter' | 'qua' | 'qui' | 'sex' | 'sab';
  minutosDesdeMeiaNoite: number;
}

// Extrai dia da semana e hora local do negócio a partir de um instante,
// independentemente do fuso horário configurado no processo do servidor.
export function momentoNoFusoDoNegocio(data: Date): MomentoNoFusoDoNegocio {
  const partes = new Intl.DateTimeFormat('en-US', {
    timeZone: FUSO_HORARIO_NEGOCIO,
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(data);

  const valorPorTipo = Object.fromEntries(partes.map((parte) => [parte.type, parte.value]));
  const diaSemana = DIA_SEMANA_POR_ABREVIACAO_INTL[valorPorTipo.weekday];
  const horas = Number(valorPorTipo.hour);
  const minutos = Number(valorPorTipo.minute);

  return { diaSemana, minutosDesdeMeiaNoite: horas * 60 + minutos };
}

// Início do mês corrente no fuso do negócio, como instante UTC — para
// comparar contra colunas timestamptz (ex.: `criado_em`) sem depender do
// fuso horário do servidor. Como o Brasil não tem horário de verão, o
// deslocamento é sempre -03:00.
export function inicioDoMesNoFusoDoNegocio(data: Date = new Date()): Date {
  const { ano, mes } = (() => {
    const partes = new Intl.DateTimeFormat('en-US', {
      timeZone: FUSO_HORARIO_NEGOCIO,
      year: 'numeric',
      month: '2-digit',
    }).formatToParts(data);
    const valorPorTipo = Object.fromEntries(partes.map((parte) => [parte.type, parte.value]));
    return { ano: Number(valorPorTipo.year), mes: Number(valorPorTipo.month) };
  })();

  return new Date(`${ano}-${String(mes).padStart(2, '0')}-01T00:00:00-03:00`);
}
