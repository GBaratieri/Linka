import type { EmpresaNormalizada } from '@/lib/schemas/empresa';
import type { ConteudoSite, EstiloConfig } from '@/lib/schemas/estilo';

// Pacote de dados que todo componente de seção do site recebe — reúne os
// fatos da empresa (nunca inventados), os textos já gerados e aprovados
// pela guarda, o estilo visual e o link de volta para o perfil de origem
// (rodapé). Ver docs/decisoes.md sobre a Fase 3.
export interface DadosSite {
  empresa: EmpresaNormalizada;
  conteudo: ConteudoSite;
  estilo: EstiloConfig;
  linkOrigem: string | null;
}
