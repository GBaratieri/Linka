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

  it('está aberto dentro de um dos intervalos do dia', () => {
    const segundaAs10 = new Date('2026-09-21T10:00:00'); // uma segunda-feira
    expect(statusAtendimento(horarios, segundaAs10)).toEqual({
      aberto: true,
      proximaAberturaHoje: null,
    });
  });

  it('está fechado no intervalo do almoço e mostra a próxima abertura', () => {
    const segundaAs13 = new Date('2026-09-21T13:00:00');
    expect(statusAtendimento(horarios, segundaAs13)).toEqual({
      aberto: false,
      proximaAberturaHoje: '14:00',
    });
  });

  it('está fechado depois do último horário do dia', () => {
    const segundaAs20 = new Date('2026-09-21T20:00:00');
    expect(statusAtendimento(horarios, segundaAs20).aberto).toBe(false);
  });

  it('está fechado num dia sem nenhum horário cadastrado', () => {
    const domingo = new Date('2026-09-20T10:00:00'); // domingo
    expect(statusAtendimento(horarios, domingo)).toEqual({
      aberto: false,
      proximaAberturaHoje: null,
    });
  });
});
