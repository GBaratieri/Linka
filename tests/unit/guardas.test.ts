import { describe, expect, it } from 'vitest';
import { verificarConteudo, sanitizarConteudo } from '@/lib/ia/guardas';
import type { ConteudoSite } from '@/lib/schemas/estilo';
import type { EmpresaNormalizada } from '@/lib/schemas/empresa';

const EMPRESA_BASE: EmpresaNormalizada = {
  nome: 'Padaria Pão Quente',
  segmento: 'alimentacao',
  descricao_curta: 'Pães e doces frescos todos os dias.',
  servicos: [{ nome: 'Bolo de aniversário', descricao: null }],
  contato: {
    whatsapp: '(11) 99999-8888',
    telefone: '(11) 3333-4444',
    email: null,
    instagram: null,
    site: null,
  },
  endereco: { texto: null, lat: null, lng: null },
  horarios: [{ dia: 'seg', abre: '06:00', fecha: '20:00' }],
  midia: { logo: null, fotos: [] },
  prova_social: { nota: null, total_avaliacoes: null, avaliacoes: [] },
};

function conteudoBase(sobrescreve: Partial<ConteudoSite> = {}): ConteudoSite {
  return {
    hero: { titulo: 'Padaria Pão Quente', subtitulo: 'O melhor pão da cidade.' },
    sobre: 'Pães e doces frescos todos os dias.',
    servicos: [{ nome: 'Bolo de aniversário', descricao: 'Feito com carinho para sua festa.' }],
    cta_principal: 'Fale conosco',
    seo: {
      titulo_pagina: 'Padaria Pão Quente',
      descricao_pagina: 'Pães e doces frescos.',
      h1: 'Padaria Pão Quente',
    },
    ...sobrescreve,
  };
}

describe('verificarConteudo', () => {
  it('aprova um conteúdo que só usa fatos reais', () => {
    const resultado = verificarConteudo(conteudoBase(), EMPRESA_BASE);
    expect(resultado).toEqual({ aprovado: true, problemas: [] });
  });

  it('reprova um telefone inventado', () => {
    const conteudo = conteudoBase({
      sobre: 'Pães e doces frescos todos os dias. Ligue (11) 91234-5678.',
    });
    const resultado = verificarConteudo(conteudo, EMPRESA_BASE);
    expect(resultado.aprovado).toBe(false);
    expect(resultado.problemas.some((p) => p.includes('telefone'))).toBe(true);
  });

  it('aprova o telefone real da empresa mencionado no texto', () => {
    const conteudo = conteudoBase({
      sobre: 'Pães e doces frescos todos os dias. Ligue (11) 3333-4444.',
    });
    expect(verificarConteudo(conteudo, EMPRESA_BASE).aprovado).toBe(true);
  });

  it('reprova um endereço inventado quando a empresa não tem endereço nos dados', () => {
    const conteudo = conteudoBase({
      hero: { titulo: 'Padaria Pão Quente', subtitulo: 'Venha nos visitar na Rua das Flores, 123.' },
    });
    const resultado = verificarConteudo(conteudo, EMPRESA_BASE);
    expect(resultado.aprovado).toBe(false);
    expect(resultado.problemas.some((p) => p.includes('endereço'))).toBe(true);
  });

  it('não reprova menção a endereço quando a empresa realmente tem um endereço nos dados', () => {
    const empresaComEndereco: EmpresaNormalizada = {
      ...EMPRESA_BASE,
      endereco: { texto: 'Rua das Flores, 123', lat: null, lng: null },
    };
    const conteudo = conteudoBase({
      hero: { titulo: 'Padaria Pão Quente', subtitulo: 'Venha nos visitar na Rua das Flores, 123.' },
    });
    expect(verificarConteudo(conteudo, empresaComEndereco).aprovado).toBe(true);
  });

  it('reprova um preço inventado quando não há nenhum valor monetário nos dados', () => {
    const conteudo = conteudoBase({
      servicos: [{ nome: 'Bolo de aniversário', descricao: 'A partir de R$ 80,00.' }],
    });
    const resultado = verificarConteudo(conteudo, EMPRESA_BASE);
    expect(resultado.aprovado).toBe(false);
    expect(resultado.problemas.some((p) => p.includes('valor'))).toBe(true);
  });

  it('reprova um horário inventado que não bate com os horários reais', () => {
    const conteudo = conteudoBase({
      hero: { titulo: 'Padaria Pão Quente', subtitulo: 'Abrimos das 09:00 às 22:00.' },
    });
    const resultado = verificarConteudo(conteudo, EMPRESA_BASE);
    expect(resultado.aprovado).toBe(false);
    expect(resultado.problemas.some((p) => p.includes('horário'))).toBe(true);
  });

  it('aprova o horário real mencionado no texto', () => {
    const conteudo = conteudoBase({
      hero: { titulo: 'Padaria Pão Quente', subtitulo: 'Abertos das 06:00 às 20:00.' },
    });
    expect(verificarConteudo(conteudo, EMPRESA_BASE).aprovado).toBe(true);
  });
});

describe('sanitizarConteudo', () => {
  it('remove só o campo com violação, preservando o resto do conteúdo', () => {
    const conteudo = conteudoBase({
      sobre: 'Pães e doces frescos todos os dias. Ligue (11) 91234-5678.',
    });

    const limpo = sanitizarConteudo(conteudo, EMPRESA_BASE);

    expect(limpo.sobre).toBeNull();
    expect(limpo.hero).toEqual(conteudo.hero);
    expect(limpo.servicos).toEqual(conteudo.servicos);
    expect(verificarConteudo(limpo, EMPRESA_BASE).aprovado).toBe(true);
  });

  it('usa o nome real da empresa como fallback num campo que não pode ficar vazio', () => {
    const conteudo = conteudoBase({
      seo: {
        titulo_pagina: 'Venha na Rua das Flores, 123',
        descricao_pagina: 'Pães e doces frescos.',
        h1: 'Padaria Pão Quente',
      },
    });

    const limpo = sanitizarConteudo(conteudo, EMPRESA_BASE);

    expect(limpo.seo.titulo_pagina).toBe(EMPRESA_BASE.nome);
  });

  it('não mexe em conteúdo que já está limpo', () => {
    const conteudo = conteudoBase();
    expect(sanitizarConteudo(conteudo, EMPRESA_BASE)).toEqual(conteudo);
  });
});
