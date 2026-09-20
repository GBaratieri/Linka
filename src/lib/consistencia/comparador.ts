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

// JSON.stringify sozinho é sensível à ordem dos itens dentro de um array —
// "horarios" do Google sempre vem na ordem dos dias da semana, mas um
// horário extraído por IA a partir de texto livre (Instagram) não tem essa
// garantia. Ordena os itens antes de comparar para que a mesma lista de
// horários em ordem diferente não seja tratada como uma divergência falsa.
function normalizarValor(valor: unknown): string {
  if (Array.isArray(valor)) {
    const copia = [...valor]
      .map((item) => JSON.stringify(item))
      .sort();
    return JSON.stringify(copia);
  }
  return JSON.stringify(valor);
}

// Compara o valor de um mesmo campo entre origens diferentes (ex.: Google
// x Instagram) e devolve os campos onde os valores não batem. Um campo cuja
// diverção já foi resolvida pelo usuário (qualquer linha com
// editado_pelo_usuario=true) sai inteiro da comparação — nesse ponto o
// usuário já escolheu o que vale, mesmo que as fontes originais ainda
// discordem entre si; não teria sentido continuar reportando a mesma
// divergência já resolvida a cada carregamento da tela.
export function encontrarDivergencias(linhas: LinhaCampoExtraido[]): Divergencia[] {
  const porCampo = new Map<string, LinhaCampoExtraido[]>();

  for (const linha of linhas) {
    if (!CAMPOS_COMPARAVEIS.has(linha.campo)) continue;
    const lista = porCampo.get(linha.campo) ?? [];
    lista.push(linha);
    porCampo.set(linha.campo, lista);
  }

  const divergencias: Divergencia[] = [];

  for (const [campo, candidatas] of porCampo) {
    if (candidatas.some((linha) => linha.editado_pelo_usuario)) continue;

    const valoresUnicos = new Set(candidatas.map((linha) => normalizarValor(linha.valor)));
    if (candidatas.length < 2 || valoresUnicos.size < 2) continue;

    divergencias.push({
      campo,
      valores: candidatas.map((linha) => ({ origem: linha.origem, valor: linha.valor })),
    });
  }

  return divergencias;
}
