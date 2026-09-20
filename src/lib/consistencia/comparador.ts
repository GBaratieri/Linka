import type { TipoFonteDados } from '@/lib/conectores/tipos';
import type { LinhaCampoExtraido } from '@/lib/conectores/normalizador';

// Campos que vale a pena comparar entre fontes (seção "Fase 2" do CLAUDE.md
// v2: "compara telefone, endereço, horário e nome entre as fontes"). Fora
// dessa lista, um campo só existir numa fonte e não noutra é normal (ex.:
// descrição/fotos), não uma divergência a resolver.
const CAMPOS_COMPARAVEIS = new Set(['nome', 'contato.telefone', 'endereco.texto', 'horarios']);

export interface ValorPorOrigem {
  origem: TipoFonteDados;
  valor: unknown;
}

export interface Divergencia {
  campo: string;
  valores: ValorPorOrigem[];
}

// Compara o valor de um mesmo campo entre origens diferentes (ex.: Google
// x Instagram) e devolve os campos onde os valores não batem. Uma edição do
// usuário na revisão (editado_pelo_usuario=true) não entra na comparação —
// nesse ponto o usuário já escolheu o que vale, não é mais uma divergência
// em aberto entre fontes externas.
export function encontrarDivergencias(linhas: LinhaCampoExtraido[]): Divergencia[] {
  const porCampo = new Map<string, LinhaCampoExtraido[]>();

  for (const linha of linhas) {
    if (!CAMPOS_COMPARAVEIS.has(linha.campo) || linha.editado_pelo_usuario) continue;
    const lista = porCampo.get(linha.campo) ?? [];
    lista.push(linha);
    porCampo.set(linha.campo, lista);
  }

  const divergencias: Divergencia[] = [];

  for (const [campo, candidatas] of porCampo) {
    const valoresUnicos = new Set(candidatas.map((linha) => JSON.stringify(linha.valor)));
    if (candidatas.length < 2 || valoresUnicos.size < 2) continue;

    divergencias.push({
      campo,
      valores: candidatas.map((linha) => ({ origem: linha.origem, valor: linha.valor })),
    });
  }

  return divergencias;
}
