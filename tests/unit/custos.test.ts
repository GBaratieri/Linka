import { afterEach, describe, expect, it, vi } from 'vitest';
import { custoEstimadoEmReais, payloadComUso } from '@/lib/metricas/custos';

describe('custoEstimadoEmReais', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('calcula o custo em reais a partir dos tokens e do câmbio configurado', () => {
    vi.stubEnv('USD_BRL', '5');

    const custo = custoEstimadoEmReais({
      modelo: 'claude-sonnet-5',
      tokensEntrada: 1_000_000,
      tokensSaida: 1_000_000,
    });

    // (1 * 3 + 1 * 15) USD * 5 = 90 BRL
    expect(custo).toBe(90);
  });

  it('usa 5.5 como câmbio padrão quando USD_BRL não está configurado', () => {
    vi.stubEnv('USD_BRL', '');

    const custo = custoEstimadoEmReais({
      modelo: 'claude-sonnet-5',
      tokensEntrada: 1_000_000,
      tokensSaida: 0,
    });

    expect(custo).toBe(3 * 5.5);
  });

  it('usa o preço do Sonnet como estimativa para um modelo desconhecido', () => {
    vi.stubEnv('USD_BRL', '5');

    const custoConhecido = custoEstimadoEmReais({
      modelo: 'claude-sonnet-5',
      tokensEntrada: 500_000,
      tokensSaida: 0,
    });
    const custoDesconhecido = custoEstimadoEmReais({
      modelo: 'modelo-futuro-ainda-nao-cadastrado',
      tokensEntrada: 500_000,
      tokensSaida: 0,
    });

    expect(custoDesconhecido).toBe(custoConhecido);
  });

  it('diferencia o preço de um modelo mais barato (leve)', () => {
    vi.stubEnv('USD_BRL', '5');

    const custoSonnet = custoEstimadoEmReais({
      modelo: 'claude-sonnet-5',
      tokensEntrada: 1_000_000,
      tokensSaida: 0,
    });
    const custoHaiku = custoEstimadoEmReais({
      modelo: 'claude-haiku-4-5-20251001',
      tokensEntrada: 1_000_000,
      tokensSaida: 0,
    });

    expect(custoHaiku).toBeLessThan(custoSonnet);
  });
});

describe('payloadComUso', () => {
  it('combina os dados base com o uso de tokens e o custo estimado', () => {
    vi.stubEnv('USD_BRL', '5');

    const payload = payloadComUso(
      { fonte: 'google' },
      { modelo: 'claude-sonnet-5', tokensEntrada: 100, tokensSaida: 50 },
    );

    expect(payload).toMatchObject({
      fonte: 'google',
      modelo: 'claude-sonnet-5',
      tokensEntrada: 100,
      tokensSaida: 50,
    });
    expect(payload.custoEstimadoReais).toBeGreaterThan(0);

    vi.unstubAllEnvs();
  });
});
