import type { ConteudoSite } from '@/lib/schemas/estilo';
import type { EmpresaNormalizada } from '@/lib/schemas/empresa';

// Guarda anti-alucinação (seção 8.4 do CLAUDE.md): depois de gerar os
// textos, confere que todo telefone, endereço, horário e valor monetário
// que aparece neles existe de verdade nos dados de entrada. Função pura,
// sem chamar IA nem banco — só compara texto contra os fatos conhecidos.

const REGEX_TELEFONE = /(?:\+?55\s?)?\(?\d{2}\)?[\s.-]?\d{4,5}[\s.-]?\d{4}/g;
const REGEX_VALOR_MONETARIO = /R\$\s?\d{1,3}(?:\.\d{3})*(?:,\d{2})?/gi;
const REGEX_HORARIO = /\b([01]?\d|2[0-3])[:h]([0-5]\d)\b/gi;
const REGEX_ENDERECO = /\b(rua|av\.?|avenida|alameda|travessa|rodovia|estrada)\s+\S+/i;

function normalizarTelefone(valor: string): string {
  return valor.replace(/\D/g, '');
}

function normalizarValorMonetario(valor: string): string {
  return valor.replace(/\D/g, '');
}

function normalizarHorario(valor: string): string {
  const m = valor.match(/([01]?\d|2[0-3])[:h]([0-5]\d)/i);
  if (!m) return valor;
  return `${m[1].padStart(2, '0')}:${m[2]}`;
}

interface FatosPermitidos {
  telefones: Set<string>;
  horarios: Set<string>;
  valoresMonetarios: Set<string>;
  temEndereco: boolean;
}

function extrairFatosPermitidos(empresa: EmpresaNormalizada): FatosPermitidos {
  const telefones = new Set<string>();
  if (empresa.contato.telefone) telefones.add(normalizarTelefone(empresa.contato.telefone));
  if (empresa.contato.whatsapp) telefones.add(normalizarTelefone(empresa.contato.whatsapp));

  const horarios = new Set<string>();
  for (const horario of empresa.horarios) {
    horarios.add(horario.abre);
    horarios.add(horario.fecha);
  }

  const textosFonte = [empresa.descricao_curta, ...empresa.servicos.map((s) => s.descricao)].filter(
    (texto): texto is string => Boolean(texto),
  );
  const valoresMonetarios = new Set<string>();
  for (const texto of textosFonte) {
    for (const match of texto.matchAll(REGEX_VALOR_MONETARIO)) {
      valoresMonetarios.add(normalizarValorMonetario(match[0]));
    }
  }

  return {
    telefones,
    horarios,
    valoresMonetarios,
    temEndereco: Boolean(empresa.endereco.texto),
  };
}

function encontrarViolacoes(campo: string, texto: string, fatos: FatosPermitidos): string[] {
  const problemas: string[] = [];

  for (const match of texto.matchAll(REGEX_TELEFONE)) {
    const normalizado = normalizarTelefone(match[0]);
    if (normalizado.length >= 10 && !fatos.telefones.has(normalizado)) {
      problemas.push(`${campo}: telefone "${match[0]}" não está nos dados de entrada.`);
    }
  }

  for (const match of texto.matchAll(REGEX_VALOR_MONETARIO)) {
    const normalizado = normalizarValorMonetario(match[0]);
    if (!fatos.valoresMonetarios.has(normalizado)) {
      problemas.push(`${campo}: valor "${match[0]}" não está nos dados de entrada.`);
    }
  }

  for (const match of texto.matchAll(REGEX_HORARIO)) {
    if (!fatos.horarios.has(normalizarHorario(match[0]))) {
      problemas.push(`${campo}: horário "${match[0]}" não está nos dados de entrada.`);
    }
  }

  if (!fatos.temEndereco && REGEX_ENDERECO.test(texto)) {
    problemas.push(`${campo}: menciona um endereço que não está nos dados de entrada.`);
  }

  return problemas;
}

function blocosDeTexto(conteudo: ConteudoSite): Array<[string, string]> {
  const blocos: Array<[string, string]> = [
    ['hero.titulo', conteudo.hero.titulo],
    ['hero.subtitulo', conteudo.hero.subtitulo],
    ['cta_principal', conteudo.cta_principal],
    ['seo.titulo_pagina', conteudo.seo.titulo_pagina],
    ['seo.descricao_pagina', conteudo.seo.descricao_pagina],
    ['seo.h1', conteudo.seo.h1],
  ];
  if (conteudo.sobre) blocos.push(['sobre', conteudo.sobre]);
  conteudo.servicos.forEach((servico, indice) => {
    if (servico.descricao) blocos.push([`servicos.${indice}.descricao`, servico.descricao]);
  });
  return blocos;
}

export interface ResultadoGuarda {
  aprovado: boolean;
  problemas: string[];
}

export function verificarConteudo(
  conteudo: ConteudoSite,
  empresa: EmpresaNormalizada,
): ResultadoGuarda {
  const fatos = extrairFatosPermitidos(empresa);
  const problemas = blocosDeTexto(conteudo).flatMap(([campo, texto]) =>
    encontrarViolacoes(campo, texto, fatos),
  );
  return { aprovado: problemas.length === 0, problemas };
}

// Aplicado quando uma nova tentativa (chamar ia/textos.ts de novo) ainda
// falha a guarda: em vez de publicar texto com dado inventado, remove só os
// trechos problemáticos (campo por campo), preservando o resto do
// conteúdo — nunca um placeholder falso no lugar, ou volta ao nome real da
// empresa (fato já verificado) nos campos que não podem ficar vazios.
export function sanitizarConteudo(
  conteudo: ConteudoSite,
  empresa: EmpresaNormalizada,
): ConteudoSite {
  const fatos = extrairFatosPermitidos(empresa);
  const temViolacao = (texto: string) => encontrarViolacoes('', texto, fatos).length > 0;
  const manterOuFallback = (texto: string, fallback: string) => (temViolacao(texto) ? fallback : texto);

  return {
    hero: {
      titulo: manterOuFallback(conteudo.hero.titulo, empresa.nome),
      subtitulo: manterOuFallback(conteudo.hero.subtitulo, ''),
    },
    sobre: conteudo.sobre && !temViolacao(conteudo.sobre) ? conteudo.sobre : null,
    servicos: conteudo.servicos.map((servico) => ({
      nome: servico.nome,
      descricao: servico.descricao && !temViolacao(servico.descricao) ? servico.descricao : null,
    })),
    cta_principal: manterOuFallback(conteudo.cta_principal, 'Entre em contato'),
    seo: {
      titulo_pagina: manterOuFallback(conteudo.seo.titulo_pagina, empresa.nome),
      descricao_pagina: manterOuFallback(conteudo.seo.descricao_pagina, empresa.nome),
      h1: manterOuFallback(conteudo.seo.h1, empresa.nome),
    },
  };
}
