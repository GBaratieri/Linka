import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { criarUsuarioDeTeste, removerUsuarioDeTeste, type UsuarioDeTeste } from './helpers';

// Testes de RLS de verdade (seção 11 do CLAUDE.md: "RLS ativo e testado: um
// usuário não lê nem altera dados de outro"). Rodam contra um Postgres real
// (supabase start), não um cliente mockado — RLS é aplicado pelo próprio
// Postgres, então não há como testar isso com mocks. Ver
// supabase/README.md para como rodar.
describe('RLS: isolamento entre usuários (empresa A x usuária B)', () => {
  let usuarioA: UsuarioDeTeste;
  let usuarioB: UsuarioDeTeste;
  let empresaIdA: string;

  beforeAll(async () => {
    usuarioA = await criarUsuarioDeTeste('usuario-a');
    usuarioB = await criarUsuarioDeTeste('usuario-b');

    const { data: empresa, error } = await usuarioA.cliente
      .from('empresa')
      .insert({ usuario_id: usuarioA.id })
      .select('id')
      .single();
    if (error || !empresa) {
      throw new Error(`Falha ao preparar o cenário do teste: ${error?.message}`);
    }
    empresaIdA = empresa.id;

    await usuarioA.cliente.from('fonte_dados').insert({
      empresa_id: empresaIdA,
      tipo: 'manual',
      url: null,
      status: 'pendente',
    });
    await usuarioA.cliente.from('campo_extraido').insert({
      empresa_id: empresaIdA,
      campo: 'nome',
      valor: 'Empresa da usuária A',
      origem: 'manual',
      confianca: 'alta',
    });
    await usuarioA.cliente
      .from('evento_produto')
      .insert({ empresa_id: empresaIdA, tipo: 'link_colado', payload: {} });
  }, 20_000);

  afterAll(async () => {
    await removerUsuarioDeTeste(usuarioA.id);
    await removerUsuarioDeTeste(usuarioB.id);
  }, 20_000);

  it('usuária B não vê a empresa da usuária A', async () => {
    const { data, error } = await usuarioB.cliente
      .from('empresa')
      .select('id')
      .eq('id', empresaIdA);
    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  it('usuária B não vê fonte_dados da empresa da usuária A', async () => {
    const { data } = await usuarioB.cliente
      .from('fonte_dados')
      .select('id')
      .eq('empresa_id', empresaIdA);
    expect(data).toEqual([]);
  });

  it('usuária B não vê campo_extraido da empresa da usuária A', async () => {
    const { data } = await usuarioB.cliente
      .from('campo_extraido')
      .select('id')
      .eq('empresa_id', empresaIdA);
    expect(data).toEqual([]);
  });

  it('usuária B não vê evento_produto da empresa da usuária A', async () => {
    const { data } = await usuarioB.cliente
      .from('evento_produto')
      .select('id')
      .eq('empresa_id', empresaIdA);
    expect(data).toEqual([]);
  });

  it('usuária B não vê a linha de usuario da usuária A', async () => {
    const { data } = await usuarioB.cliente.from('usuario').select('id').eq('id', usuarioA.id);
    expect(data).toEqual([]);
  });

  it('usuária B não consegue atualizar a empresa da usuária A', async () => {
    const { data, error } = await usuarioB.cliente
      .from('empresa')
      .update({ nome: 'Sequestrada' })
      .eq('id', empresaIdA)
      .select();
    // RLS bloqueia silenciosamente pela cláusula USING: zero linhas
    // afetadas, sem erro.
    expect(error).toBeNull();
    expect(data).toEqual([]);

    const { data: confirmacao } = await usuarioA.cliente
      .from('empresa')
      .select('nome')
      .eq('id', empresaIdA)
      .single();
    expect(confirmacao?.nome).not.toBe('Sequestrada');
  });

  it('usuária B não consegue apagar a empresa da usuária A', async () => {
    const { error } = await usuarioB.cliente.from('empresa').delete().eq('id', empresaIdA);
    expect(error).toBeNull();

    const { data } = await usuarioA.cliente.from('empresa').select('id').eq('id', empresaIdA);
    expect(data).toHaveLength(1);
  });

  it('usuária B não consegue inserir campo_extraido na empresa da usuária A', async () => {
    const { error } = await usuarioB.cliente.from('campo_extraido').insert({
      empresa_id: empresaIdA,
      campo: 'nome',
      valor: 'Invasão',
      origem: 'manual',
      confianca: 'alta',
    });
    // Aqui a política WITH CHECK rejeita o insert com erro (diferente do
    // update/delete acima, que só filtram silenciosamente as linhas).
    expect(error).not.toBeNull();
  });

  it('usuária A continua vendo e editando os próprios dados normalmente', async () => {
    const { data } = await usuarioA.cliente.from('empresa').select('id').eq('id', empresaIdA);
    expect(data).toHaveLength(1);

    const { error } = await usuarioA.cliente
      .from('empresa')
      .update({ cidade: 'Curitiba' })
      .eq('id', empresaIdA);
    expect(error).toBeNull();
  });
});
