import { describe, expect, it } from 'vitest';
import {
  normalizarNumeroBrasileiro,
  linkWhatsApp,
  mensagemWhatsApp,
  statusAtendimento,
} from '@/lib/site/whatsapp';

describe('normalizarNumeroBrasileiro', () => {
  it('normaliza um número com DDD e formatação (11) 99999-8888', () => {
    expect(normalizarNumeroBrasileiro('(11) 99999-8888')).toBe('5511999998888');
  });

  it('normaliza um número fixo de 10 dígitos', () => {
    expect(normalizarNumeroBrasileiro('11 3456-7890')).toBe('551134567890');
  });

  it('mantém um número que já vem com código do país', () => {
    expect(normalizarNumeroBrasileiro('+55 11 99999-8888')).toBe('5511999998888');
  });

  it('aceita um número já só em dígitos', () => {
    expect(normalizarNumeroBrasileiro('11999998888')).toBe('5511999998888');
  });

  it('devolve null para um número claramente inválido (poucos dígitos)', () => {
    expect(normalizarNumeroBrasileiro('12345')).toBeNull();
  });

  it('devolve null para uma string vazia', () => {
    expect(normalizarNumeroBrasileiro('')).toBeNull();
  });

  it('não confunde um DDD 55 (Santa Maria/RS) com o código do país já incluso', () => {
    // Um número local de 11 dígitos (DDD 55 + celular de 9 dígitos) não tem
    // código de país — mesmo começando com "55", o comprimento (11, não
    // 12/13) é o que decide, senão o código do país nunca seria prefixado
    // pra quem mora numa cidade com DDD 55.
    expect(normalizarNumeroBrasileiro('55991234567')).toBe('5555991234567');
  });

  it('devolve null para um número com dígitos demais', () => {
    expect(normalizarNumeroBrasileiro('551199999888877')).toBeNull();
  });
});

describe('linkWhatsApp', () => {
  it('monta o link do wa.me com a mensagem codificada', () => {
    const link = linkWhatsApp('(11) 99999-8888', 'Olá!');
    expect(link).toBe('https://wa.me/5511999998888?text=Ol%C3%A1!');
  });

  it('devolve null quando o número é inválido', () => {
    expect(linkWhatsApp('123', 'Olá!')).toBeNull();
  });
});

describe('mensagemWhatsApp', () => {
  it('menciona o serviço quando informado', () => {
    expect(mensagemWhatsApp('Padaria Pão Quente', 'Bolo de aniversário')).toContain(
      'Bolo de aniversário',
    );
  });

  it('usa uma mensagem genérica sem serviço', () => {
    expect(mensagemWhatsApp('Padaria Pão Quente')).toContain('Padaria Pão Quente');
  });
});

describe('statusAtendimento', () => {
  const horarios = [
    { dia: 'seg' as const, abre: '08:00', fecha: '12:00' },
    { dia: 'seg' as const, abre: '14:00', fecha: '18:00' },
  ];

  // Todos os horários abaixo usam o deslocamento explícito "-03:00" (fuso
  // do negócio, sem horário de verão) em vez de uma string sem fuso — uma
  // string sem fuso é interpretada no fuso da MÁQUINA que roda o teste, o
  // que mascarava o bug de fuso horário já corrigido em statusAtendimento
  // (o teste passava "por sorte" numa máquina já configurada em
  // America/Sao_Paulo, mas quebraria de verdade num servidor em UTC).

  it('está aberto dentro de um dos intervalos do dia', () => {
    const segundaAs10 = new Date('2026-09-21T10:00:00-03:00'); // uma segunda-feira
    expect(statusAtendimento(horarios, segundaAs10)).toEqual({
      aberto: true,
      proximaAberturaHoje: null,
    });
  });

  it('está fechado no intervalo do almoço e mostra a próxima abertura', () => {
    const segundaAs13 = new Date('2026-09-21T13:00:00-03:00');
    expect(statusAtendimento(horarios, segundaAs13)).toEqual({
      aberto: false,
      proximaAberturaHoje: '14:00',
    });
  });

  it('está fechado depois do último horário do dia', () => {
    const segundaAs20 = new Date('2026-09-21T20:00:00-03:00');
    expect(statusAtendimento(horarios, segundaAs20).aberto).toBe(false);
  });

  it('está fechado num dia sem nenhum horário cadastrado', () => {
    const domingo = new Date('2026-09-20T10:00:00-03:00'); // domingo
    expect(statusAtendimento(horarios, domingo)).toEqual({
      aberto: false,
      proximaAberturaHoje: null,
    });
  });

  it('usa o horário do negócio (America/Sao_Paulo), não o fuso do servidor — mesmo instante lido como UTC cai fora do expediente', () => {
    // 10:00 em São Paulo (UTC-3) é 13:00 em UTC. Um servidor rodando em UTC
    // (padrão da Vercel) que lesse a hora "crua" acharia que já são 13h — e
    // diria "fechado" (13h cai no intervalo de almoço), quando na verdade a
    // empresa está aberta às 10h no horário dela.
    const dezHorasEmSaoPauloComoInstanteUtc = new Date('2026-09-21T13:00:00Z');
    expect(statusAtendimento(horarios, dezHorasEmSaoPauloComoInstanteUtc)).toEqual({
      aberto: true,
      proximaAberturaHoje: null,
    });
  });

  it('está aberto exatamente no minuto de abertura (limite inclusivo)', () => {
    const segundaAsOito = new Date('2026-09-21T08:00:00-03:00');
    expect(statusAtendimento(horarios, segundaAsOito).aberto).toBe(true);
  });

  it('já está fechado exatamente no minuto de fechamento (limite exclusivo)', () => {
    const segundaAoMeioDia = new Date('2026-09-21T12:00:00-03:00');
    const status = statusAtendimento(horarios, segundaAoMeioDia);
    expect(status.aberto).toBe(false);
    expect(status.proximaAberturaHoje).toBe('14:00');
  });

  it('mostra o primeiro horário do dia como próxima abertura quando já passou de todos', () => {
    // Depois das 18h, não há mais nenhuma abertura hoje — cai no primeiro
    // horário do dia (simplificação documentada: não calcula o próximo dia).
    const segundaAs19 = new Date('2026-09-21T19:00:00-03:00');
    expect(statusAtendimento(horarios, segundaAs19)).toEqual({
      aberto: false,
      proximaAberturaHoje: '08:00',
    });
  });
});
