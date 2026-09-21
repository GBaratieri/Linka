import type { Secao } from '@/lib/schemas/estilo';

// Resolve a ordem final de seções a renderizar: a ORDEM vem do template (a
// "ordem e seções padrão" do segmento — tabela `template`, seção "Fase 3"
// do CLAUDE.md); o estilo do usuário AJUSTA filtrando quais delas de fato
// aparecem (uma seção fora de `secoesEstilo` não some do template, mas o
// contrário — uma seção que o estilo pediria mas o template do segmento não
// prevê — também não é adicionada: o template é quem define o que é
// razoável para aquele tipo de negócio). Decisão registrada em
// docs/decisoes.md.
export function resolverSecoes(componentesTemplate: Secao[], secoesEstilo: Secao[]): Secao[] {
  const secoesEstiloSet = new Set(secoesEstilo);
  return componentesTemplate.filter((secao) => secoesEstiloSet.has(secao));
}
