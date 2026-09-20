import { describe, expect, it } from 'vitest';
import {
  deveSubstituirCampo,
  calcularValoresEfetivos,
  type LinhaCampoExtraido,
} from '@/lib/conectores/normalizador';

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

describe('calcularValoresEfetivos', () => {
  const linha = (
    parcial: Partial<LinhaCampoExtraido> &
      Pick<LinhaCampoExtraido, 'campo' | 'valor' | 'origem'>,
  ): LinhaCampoExtraido => ({ confianca: 'alta', ...parcial });

  it('aplica a mesma regra de prioridade de deveSubstituirCampo entre as origens', () => {
    const efetivos = calcularValoresEfetivos([
      linha({ campo: 'endereco.texto', valor: 'Endereço do Instagram', origem: 'instagram' }),
      linha({ campo: 'endereco.texto', valor: 'Endereço do Google', origem: 'google' }),
    ]);

    expect(efetivos.get('endereco.texto')?.valor).toBe('Endereço do Google');
  });

  it('uma edição do usuário sempre vence, mesmo contra uma origem com prioridade', () => {
    const efetivos = calcularValoresEfetivos([
      linha({ campo: 'contato.telefone', valor: '11 3000-0000', origem: 'google' }),
      linha({
        campo: 'contato.telefone',
        valor: '11 90000-0000',
        origem: 'manual',
        editado_pelo_usuario: true,
      }),
    ]);

    expect(efetivos.get('contato.telefone')?.valor).toBe('11 90000-0000');
  });

  it('em empate de confiança e origem, processa na ordem recebida e a mais recente vence', () => {
    const efetivos = calcularValoresEfetivos([
      linha({ campo: 'descricao_curta', valor: 'Primeira versão', origem: 'instagram' }),
      linha({ campo: 'descricao_curta', valor: 'Segunda versão', origem: 'manual' }),
    ]);

    expect(efetivos.get('descricao_curta')?.valor).toBe('Segunda versão');
  });

  it('devolve um valor por campo mesmo com múltiplas origens diferentes', () => {
    const efetivos = calcularValoresEfetivos([
      linha({ campo: 'nome', valor: 'Nome do Google', origem: 'google' }),
      linha({ campo: 'contato.instagram', valor: 'empresa.oficial', origem: 'instagram' }),
    ]);

    expect(efetivos.size).toBe(2);
    expect(efetivos.get('nome')?.origem).toBe('google');
    expect(efetivos.get('contato.instagram')?.origem).toBe('instagram');
  });
});
