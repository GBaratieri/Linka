import { describe, expect, it } from 'vitest';
import { encontrarDivergencias } from '@/lib/consistencia/comparador';
import type { LinhaCampoExtraido } from '@/lib/conectores/normalizador';

function linha(parcial: Partial<LinhaCampoExtraido> & Pick<LinhaCampoExtraido, 'campo' | 'valor' | 'origem'>): LinhaCampoExtraido {
  return { confianca: 'alta', ...parcial };
}

describe('encontrarDivergencias', () => {
  it('não aponta divergência quando só uma fonte tem o campo', () => {
    const divergencias = encontrarDivergencias([
      linha({ campo: 'contato.telefone', valor: '11999998888', origem: 'google' }),
    ]);
    expect(divergencias).toEqual([]);
  });

  it('não aponta divergência quando as fontes concordam', () => {
    const divergencias = encontrarDivergencias([
      linha({ campo: 'contato.telefone', valor: '11999998888', origem: 'google' }),
      linha({ campo: 'contato.telefone', valor: '11999998888', origem: 'instagram' }),
    ]);
    expect(divergencias).toEqual([]);
  });

  it('aponta divergência quando o horário do Google e do Instagram não batem', () => {
    const divergencias = encontrarDivergencias([
      linha({
        campo: 'horarios',
        valor: [{ dia: 'seg', abre: '08:00', fecha: '18:00' }],
        origem: 'google',
      }),
      linha({
        campo: 'horarios',
        valor: [{ dia: 'seg', abre: '09:00', fecha: '19:00' }],
        origem: 'instagram',
      }),
    ]);

    expect(divergencias).toHaveLength(1);
    expect(divergencias[0].campo).toBe('horarios');
    expect(divergencias[0].valores.map((v) => v.origem).sort()).toEqual(['google', 'instagram']);
  });

  it('ignora campos fora da lista de comparáveis (ex.: descricao_curta)', () => {
    const divergencias = encontrarDivergencias([
      linha({ campo: 'descricao_curta', valor: 'Texto A', origem: 'google' }),
      linha({ campo: 'descricao_curta', valor: 'Texto B', origem: 'instagram' }),
    ]);
    expect(divergencias).toEqual([]);
  });

  it('não conta uma edição do usuário como divergência com a fonte original', () => {
    const divergencias = encontrarDivergencias([
      linha({ campo: 'nome', valor: 'Nome do Google', origem: 'google' }),
      linha({ campo: 'nome', valor: 'Nome Corrigido', origem: 'manual', editado_pelo_usuario: true }),
    ]);
    expect(divergencias).toEqual([]);
  });

  it('para de apontar a divergência depois que o usuário resolve, mesmo com as duas fontes originais ainda discordando', () => {
    const divergencias = encontrarDivergencias([
      linha({ campo: 'contato.telefone', valor: 'A', origem: 'google' }),
      linha({ campo: 'contato.telefone', valor: 'B', origem: 'instagram' }),
      linha({ campo: 'contato.telefone', valor: 'C', origem: 'manual', editado_pelo_usuario: true }),
    ]);
    expect(divergencias).toEqual([]);
  });

  it('não aponta divergência quando o mesmo horário vem em ordem diferente entre as fontes', () => {
    const divergencias = encontrarDivergencias([
      linha({
        campo: 'horarios',
        valor: [
          { dia: 'seg', abre: '08:00', fecha: '18:00' },
          { dia: 'ter', abre: '08:00', fecha: '18:00' },
        ],
        origem: 'google',
      }),
      linha({
        campo: 'horarios',
        valor: [
          { dia: 'ter', abre: '08:00', fecha: '18:00' },
          { dia: 'seg', abre: '08:00', fecha: '18:00' },
        ],
        origem: 'instagram',
      }),
    ]);
    expect(divergencias).toEqual([]);
  });
});
