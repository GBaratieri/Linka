import { describe, expect, it } from 'vitest';
import { deveSubstituirCampo } from '@/lib/conectores/normalizador';

describe('deveSubstituirCampo', () => {
  it('mantém o valor do Google em endereco.texto mesmo com confiança menor que a nova fonte', () => {
    const substituir = deveSubstituirCampo(
      'endereco.texto',
      { fonte: 'google', confianca: 'media' },
      { fonte: 'manual', confianca: 'alta' },
    );
    expect(substituir).toBe(false);
  });

  it('permite o Google substituir um valor de endereco.texto vindo de outra fonte', () => {
    const substituir = deveSubstituirCampo(
      'endereco.texto',
      { fonte: 'instagram', confianca: 'alta' },
      { fonte: 'google', confianca: 'baixa' },
    );
    expect(substituir).toBe(true);
  });

  it('mantém a bio do Instagram em descricao_curta mesmo com o Google chegando depois', () => {
    const substituir = deveSubstituirCampo(
      'descricao_curta',
      { fonte: 'instagram', confianca: 'media' },
      { fonte: 'google', confianca: 'alta' },
    );
    expect(substituir).toBe(false);
  });

  it('permite manual substituir midia.fotos vindo do Google', () => {
    const substituir = deveSubstituirCampo(
      'midia.fotos',
      { fonte: 'google', confianca: 'alta' },
      { fonte: 'manual', confianca: 'baixa' },
    );
    expect(substituir).toBe(true);
  });

  it('em campos sem preferência de fonte, usa a confiança para decidir', () => {
    expect(
      deveSubstituirCampo(
        'nome',
        { fonte: 'google', confianca: 'baixa' },
        { fonte: 'manual', confianca: 'alta' },
      ),
    ).toBe(true);

    expect(
      deveSubstituirCampo(
        'nome',
        { fonte: 'google', confianca: 'alta' },
        { fonte: 'manual', confianca: 'baixa' },
      ),
    ).toBe(false);
  });

  it('em empate de confiança e sem preferência de fonte, a mais nova vence', () => {
    expect(
      deveSubstituirCampo(
        'nome',
        { fonte: 'manual', confianca: 'alta' },
        { fonte: 'google', confianca: 'alta' },
      ),
    ).toBe(true);
  });
});
