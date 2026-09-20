import { describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/supabase/tipos-banco';
import { gravarDadosManual } from '@/lib/conectores/manual';
import type { FormularioManualInput } from '@/lib/schemas/manual';

const HORARIOS_VAZIOS: FormularioManualInput['horarios'] = [
  { dia: 'seg', abre: null, fecha: null },
  { dia: 'ter', abre: null, fecha: null },
  { dia: 'qua', abre: null, fecha: null },
  { dia: 'qui', abre: null, fecha: null },
  { dia: 'sex', abre: null, fecha: null },
  { dia: 'sab', abre: null, fecha: null },
  { dia: 'dom', abre: null, fecha: null },
];

function criarClienteMock() {
  const linhas: Array<{
    id: string;
    campo: string;
    valor: unknown;
    origem: string;
    confianca: string;
  }> = [];
  const chamadasEmpresaUpdate: unknown[] = [];
  const chamadasFonteUpdate: unknown[] = [];
  let proximoId = 1;

  const from = vi.fn((tabela: string) => {
    if (tabela === 'campo_extraido') {
      return {
        upsert: vi.fn(
          async (valores: { campo: string; valor: unknown; origem: string; confianca: string }) => {
            linhas.push({ id: String(proximoId++), ...valores });
            return { data: null, error: null };
          },
        ),
        update: vi.fn((valores: { valor: unknown; origem: string; confianca: string }) => ({
          eq: vi.fn(async (_coluna: string, id: string) => {
            const linha = linhas.find((l) => l.id === id);
            if (linha) Object.assign(linha, valores);
            return { data: null, error: null };
          }),
        })),
        select: vi.fn(() => ({
          eq: vi.fn(() => {
            const promessa = Promise.resolve({ data: [...linhas], error: null });
            return Object.assign(promessa, {
              in: vi.fn(async () => ({
                data: linhas
                  .filter((l) => l.campo === 'nome' || l.campo === 'segmento')
                  .map((l) => ({ campo: l.campo, valor: l.valor })),
                error: null,
              })),
            });
          }),
        })),
      };
    }

    if (tabela === 'empresa') {
      return {
        update: vi.fn((valores: unknown) => ({
          eq: vi.fn(async () => {
            chamadasEmpresaUpdate.push(valores);
            return { data: null, error: null };
          }),
        })),
      };
    }

    if (tabela === 'fonte_dados') {
      return {
        update: vi.fn((valores: unknown) => ({
          eq: vi.fn(async () => {
            chamadasFonteUpdate.push(valores);
            return { data: null, error: null };
          }),
        })),
      };
    }

    throw new Error(`Tabela não mockada neste teste: ${tabela}`);
  });

  return {
    cliente: { from } as unknown as SupabaseClient<Database>,
    linhas,
    chamadasEmpresaUpdate,
    chamadasFonteUpdate,
  };
}

describe('gravarDadosManual', () => {
  it('grava só os campos preenchidos, com origem manual e confiança alta', async () => {
    const { cliente, linhas, chamadasEmpresaUpdate, chamadasFonteUpdate } = criarClienteMock();

    const dados: FormularioManualInput = {
      nome: 'Loja Center Móveis',
      segmento: 'comercio',
      descricao: 'Móveis planejados e decoração',
      telefone: null,
      whatsapp: '5551999998888',
      email: null,
      instagram: null,
      site: null,
      endereco: 'Rua Sete de Setembro, 500',
      servicos: 'Móveis planejados\nDecoração\nConsultoria',
      horarios: HORARIOS_VAZIOS.map((h, i) =>
        i === 0 ? { dia: 'seg', abre: '09:00', fecha: '19:00' } : h,
      ),
    };

    await gravarDadosManual(cliente, 'empresa-1', 'fonte-1', dados, [
      'https://exemplo.com/foto1.jpg',
    ]);

    const camposPorNome = Object.fromEntries(linhas.map((c) => [c.campo, c.valor]));

    expect(camposPorNome.nome).toBe('Loja Center Móveis');
    expect(camposPorNome.segmento).toBe('comercio');
    expect(camposPorNome['contato.whatsapp']).toBe('5551999998888');
    expect(camposPorNome['contato.telefone']).toBeUndefined();
    expect(camposPorNome.servicos).toEqual([
      { nome: 'Móveis planejados', descricao: null },
      { nome: 'Decoração', descricao: null },
      { nome: 'Consultoria', descricao: null },
    ]);
    expect(camposPorNome.horarios).toEqual([{ dia: 'seg', abre: '09:00', fecha: '19:00' }]);
    expect(camposPorNome['midia.fotos']).toEqual(['https://exemplo.com/foto1.jpg']);

    expect(chamadasEmpresaUpdate[0]).toEqual({ nome: 'Loja Center Móveis', segmento: 'comercio' });
    expect(chamadasFonteUpdate[0]).toMatchObject({ status: 'ok' });
  });

  it('não grava campo_extraido para campos deixados em branco', async () => {
    const { cliente, linhas } = criarClienteMock();

    const dados: FormularioManualInput = {
      nome: 'Empresa Simples',
      segmento: 'outro',
      descricao: null,
      telefone: null,
      whatsapp: null,
      email: null,
      instagram: null,
      site: null,
      endereco: null,
      servicos: null,
      horarios: HORARIOS_VAZIOS,
    };

    await gravarDadosManual(cliente, 'empresa-2', 'fonte-2', dados, []);

    const camposGravados = linhas.map((c) => c.campo);
    expect(camposGravados).toEqual(['nome', 'segmento']);
  });

  it('não duplica linhas em campo_extraido ao reenviar o mesmo formulário', async () => {
    const { cliente, linhas } = criarClienteMock();

    const dados: FormularioManualInput = {
      nome: 'Salão da Ana',
      segmento: 'servicos',
      descricao: null,
      telefone: '5551988887777',
      whatsapp: null,
      email: null,
      instagram: null,
      site: null,
      endereco: null,
      servicos: null,
      horarios: HORARIOS_VAZIOS,
    };

    // Simula um reenvio (duplo clique, "voltar" do navegador etc.).
    await gravarDadosManual(cliente, 'empresa-3', 'fonte-3', dados, []);
    await gravarDadosManual(cliente, 'empresa-3', 'fonte-3', dados, []);

    const camposGravados = linhas.map((c) => c.campo).sort();
    expect(camposGravados).toEqual(['contato.telefone', 'nome', 'segmento']);
  });
});
