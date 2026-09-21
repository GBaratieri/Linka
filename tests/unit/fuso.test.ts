import { describe, expect, it } from 'vitest';
import { momentoNoFusoDoNegocio, inicioDoMesNoFusoDoNegocio } from '@/lib/site/fuso';

describe('momentoNoFusoDoNegocio', () => {
  it('converte um instante UTC para a hora local de São Paulo (UTC-3)', () => {
    // 13:00 UTC = 10:00 em São Paulo.
    const resultado = momentoNoFusoDoNegocio(new Date('2026-09-21T13:00:00Z'));
    expect(resultado.minutosDesdeMeiaNoite).toBe(10 * 60);
  });

  it('identifica o dia da semana certo mesmo quando UTC já virou o dia seguinte', () => {
    // 02:00 UTC de terça é 23:00 de segunda em São Paulo — em UTC já é
    // "terça", mas no fuso do negócio ainda é "segunda".
    const resultado = momentoNoFusoDoNegocio(new Date('2026-09-22T02:00:00Z'));
    expect(resultado.diaSemana).toBe('seg');
    expect(resultado.minutosDesdeMeiaNoite).toBe(23 * 60);
  });

  it('devolve o mesmo resultado para o mesmo instante independentemente de como ele foi escrito', () => {
    const comOffset = momentoNoFusoDoNegocio(new Date('2026-09-21T10:00:00-03:00'));
    const comZ = momentoNoFusoDoNegocio(new Date('2026-09-21T13:00:00Z'));
    expect(comOffset).toEqual(comZ);
  });
});

describe('inicioDoMesNoFusoDoNegocio', () => {
  it('devolve a meia-noite do dia 1 no fuso do negócio, como instante UTC', () => {
    const inicio = inicioDoMesNoFusoDoNegocio(new Date('2026-09-21T13:00:00Z'));
    expect(inicio.toISOString()).toBe('2026-09-01T03:00:00.000Z');
  });

  it('não vira o mês antes da hora certa: 23h do dia 31 em São Paulo ainda é o mês anterior', () => {
    // 31 de agosto às 23h em São Paulo = 1º de setembro às 02h UTC — um
    // cálculo baseado só em UTC acharia (erroneamente) que já é setembro.
    const instante = new Date('2026-09-01T02:00:00Z');
    const inicio = inicioDoMesNoFusoDoNegocio(instante);
    expect(inicio.toISOString()).toBe('2026-08-01T03:00:00.000Z');
  });
});
