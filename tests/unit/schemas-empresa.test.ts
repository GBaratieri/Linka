import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { empresaNormalizadaSchema, resultadoEstruturadorSchema } from '@/lib/schemas/empresa';

const EMPRESA_VALIDA = {
  nome: 'Padaria Pão Quente',
  segmento: 'alimentacao',
  descricao_curta: null,
  servicos: [],
  contato: { whatsapp: null, telefone: '(11) 3456-7890', email: null, instagram: null, site: null },
  endereco: { texto: 'Rua das Flores, 123', lat: -23.55, lng: -46.63 },
  horarios: [{ dia: 'seg', abre: '06:00', fecha: '20:00' }],
  midia: { logo: null, fotos: [] },
  prova_social: { nota: 4.6, total_avaliacoes: 128, avaliacoes: [] },
};

describe('empresaNormalizadaSchema', () => {
  it('aceita uma empresa válida', () => {
    expect(empresaNormalizadaSchema.safeParse(EMPRESA_VALIDA).success).toBe(true);
  });

  it('rejeita um segmento fora da lista permitida', () => {
    const resultado = empresaNormalizadaSchema.safeParse({ ...EMPRESA_VALIDA, segmento: 'saude' });
    expect(resultado.success).toBe(false);
  });

  it('rejeita quando falta um campo obrigatório', () => {
    const semNome: Partial<typeof EMPRESA_VALIDA> = { ...EMPRESA_VALIDA };
    delete semNome.nome;
    expect(empresaNormalizadaSchema.safeParse(semNome).success).toBe(false);
  });
});

describe('resultadoEstruturadorSchema', () => {
  it('aceita empresa + origem_e_confianca', () => {
    const resultado = resultadoEstruturadorSchema.safeParse({
      empresa: EMPRESA_VALIDA,
      origem_e_confianca: {
        nome: { fonte: 'google', confianca: 'alta' },
        'contato.telefone': { fonte: 'google', confianca: 'alta' },
      },
    });
    expect(resultado.success).toBe(true);
  });

  it('rejeita uma fonte ou confiança fora do enum', () => {
    const resultado = resultadoEstruturadorSchema.safeParse({
      empresa: EMPRESA_VALIDA,
      origem_e_confianca: { nome: { fonte: 'facebook', confianca: 'alta' } },
    });
    expect(resultado.success).toBe(false);
  });

  it('gera um JSON Schema utilizável como ferramenta da Anthropic', () => {
    const schemaJson = z.toJSONSchema(resultadoEstruturadorSchema) as Record<string, unknown>;

    expect(schemaJson.type).toBe('object');
    expect(schemaJson.properties).toHaveProperty('empresa');
    expect(schemaJson.properties).toHaveProperty('origem_e_confianca');
    expect(schemaJson.required).toEqual(expect.arrayContaining(['empresa', 'origem_e_confianca']));
  });
});
