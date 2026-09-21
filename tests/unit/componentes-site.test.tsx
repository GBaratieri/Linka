import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Sobre } from '@/components/site/Sobre';
import { Galeria } from '@/components/site/Galeria';
import { ProvaSocial } from '@/components/site/ProvaSocial';
import { Localizacao } from '@/components/site/Localizacao';
import { Contato } from '@/components/site/Contato';
import { Rodape } from '@/components/site/Rodape';
import { Hero } from '@/components/site/Hero';
import { Servicos } from '@/components/site/Servicos';
import { COMPONENTE_POR_SECAO } from '@/components/site/registro';
import { secaoSchema, type EstiloConfig } from '@/lib/schemas/estilo';
import type { EmpresaNormalizada } from '@/lib/schemas/empresa';
import type { ConteudoSite } from '@/lib/schemas/estilo';
import type { DadosSite } from '@/lib/site/tipos';

const EMPRESA_VAZIA: EmpresaNormalizada = {
  nome: 'Empresa Teste',
  segmento: 'servicos',
  descricao_curta: null,
  servicos: [],
  contato: { whatsapp: null, telefone: null, email: null, instagram: null, site: null },
  endereco: { texto: null, lat: null, lng: null },
  horarios: [],
  midia: { logo: null, fotos: [] },
  prova_social: { nota: null, total_avaliacoes: null, avaliacoes: [] },
};

const CONTEUDO_VAZIO: ConteudoSite = {
  hero: { titulo: '', subtitulo: '' },
  sobre: null,
  servicos: [],
  cta_principal: '',
  seo: { titulo_pagina: '', descricao_pagina: '', h1: '' },
};

const ESTILO_BASE: EstiloConfig = {
  tema: 'claro',
  paleta: { primaria: '#111111', secundaria: '#222222', fundo: '#FFFFFF', texto: '#000000' },
  tipografia: { titulos: 'Inter', corpo: 'Inter' },
  tom_de_voz: 'formal',
  densidade: 'media',
  raio_borda: 'medio',
  secoes: ['hero', 'contato'],
  destaque_cta: 'whatsapp',
};

function dados(sobrescritas: Partial<DadosSite> = {}): DadosSite {
  return {
    empresa: EMPRESA_VAZIA,
    conteudo: CONTEUDO_VAZIO,
    estilo: ESTILO_BASE,
    linkOrigem: null,
    ...sobrescritas,
  };
}

describe('Hero — sempre tem uma chamada para ação quando há algum contato', () => {
  it('não renderiza um parágrafo de subtítulo vazio (ex.: depois de sanitizarConteudo)', () => {
    const conteudo = { ...CONTEUDO_VAZIO, hero: { titulo: 'Empresa Teste', subtitulo: '' } };
    render(<Hero {...dados({ conteudo })} />);
    expect(screen.queryByText('', { selector: 'p' })).not.toBeInTheDocument();
  });

  it('usa o WhatsApp como fallback quando o destaque é "telefone" mas a empresa não tem telefone', () => {
    const empresa = { ...EMPRESA_VAZIA, contato: { ...EMPRESA_VAZIA.contato, whatsapp: '11987654321' } };
    const estilo = { ...ESTILO_BASE, destaque_cta: 'telefone' as const };
    render(<Hero {...dados({ empresa, estilo })} />);
    expect(screen.getByText('Fale pelo WhatsApp')).toBeInTheDocument();
  });

  it('usa o WhatsApp como fallback quando o destaque é "mapa" mas a empresa não tem endereço', () => {
    const empresa = { ...EMPRESA_VAZIA, contato: { ...EMPRESA_VAZIA.contato, whatsapp: '11987654321' } };
    const estilo = { ...ESTILO_BASE, destaque_cta: 'mapa' as const };
    render(<Hero {...dados({ empresa, estilo })} />);
    expect(screen.getByText('Fale pelo WhatsApp')).toBeInTheDocument();
  });

  it('usa o link de telefone quando o destaque é "telefone" e a empresa tem telefone', () => {
    const empresa = { ...EMPRESA_VAZIA, contato: { ...EMPRESA_VAZIA.contato, telefone: '1133334444' } };
    const estilo = { ...ESTILO_BASE, destaque_cta: 'telefone' as const };
    const conteudo = { ...CONTEUDO_VAZIO, cta_principal: 'Ligue agora' };
    render(<Hero {...dados({ empresa, estilo, conteudo })} />);
    const link = screen.getByText('Ligue agora');
    expect(link.getAttribute('href')).toBe('tel:1133334444');
  });

  it('não renderiza nenhum botão quando não há contato nenhum', () => {
    render(<Hero {...dados()} />);
    expect(screen.queryByText('Fale pelo WhatsApp')).not.toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });
});

describe('Servicos — chave de lista não colide com nomes repetidos', () => {
  it('renderiza dois serviços com o mesmo nome sem gerar aviso de chave duplicada', () => {
    const conteudo = {
      ...CONTEUDO_VAZIO,
      servicos: [
        { nome: 'Corte', descricao: 'Corte simples' },
        { nome: 'Corte', descricao: 'Corte + barba' },
      ],
    };
    render(<Servicos {...dados({ conteudo })} />);
    expect(screen.getAllByText('Corte')).toHaveLength(2);
    expect(screen.getByText('Corte simples')).toBeInTheDocument();
    expect(screen.getByText('Corte + barba')).toBeInTheDocument();
  });
});

describe('Sobre — omite sem dado essencial', () => {
  it('não renderiza nada sem descrição', () => {
    const { container } = render(<Sobre {...dados()} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renderiza a descrição real quando presente', () => {
    render(<Sobre {...dados({ conteudo: { ...CONTEUDO_VAZIO, sobre: 'Uma padaria de bairro.' } })} />);
    expect(screen.getByText('Uma padaria de bairro.')).toBeInTheDocument();
  });
});

describe('Galeria — omite sem foto nenhuma', () => {
  it('não renderiza nada sem fotos', () => {
    const { container } = render(<Galeria {...dados()} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renderiza cada foto quando existem', () => {
    const empresa = { ...EMPRESA_VAZIA, midia: { logo: null, fotos: ['https://x.com/a.jpg', 'https://x.com/b.jpg'] } };
    render(<Galeria {...dados({ empresa })} />);
    expect(screen.getAllByRole('img')).toHaveLength(2);
  });
});

describe('ProvaSocial — omite só quando não há nota NEM avaliação', () => {
  it('não renderiza nada sem nota e sem avaliações', () => {
    const { container } = render(<ProvaSocial {...dados()} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renderiza quando há nota mesmo sem nenhuma avaliação de texto', () => {
    const empresa = { ...EMPRESA_VAZIA, prova_social: { nota: 4.8, total_avaliacoes: 12, avaliacoes: [] } };
    render(<ProvaSocial {...dados({ empresa })} />);
    expect(screen.getByText('4.8')).toBeInTheDocument();
  });

  it('renderiza quando há avaliação de texto mesmo sem nota numérica', () => {
    const empresa = {
      ...EMPRESA_VAZIA,
      prova_social: {
        nota: null,
        total_avaliacoes: null,
        avaliacoes: [{ autor: 'Maria', texto: 'Ótimo atendimento!', origem: 'google' }],
      },
    };
    render(<ProvaSocial {...dados({ empresa })} />);
    expect(screen.getByText('Maria')).toBeInTheDocument();
  });

  it('nunca inventa um total de avaliações quando ele não veio nos dados', () => {
    const empresa = { ...EMPRESA_VAZIA, prova_social: { nota: 4.0, total_avaliacoes: null, avaliacoes: [] } };
    render(<ProvaSocial {...dados({ empresa })} />);
    expect(screen.getByText('0 avaliações')).toBeInTheDocument();
  });
});

describe('Localizacao — omite sem endereço e sem horário', () => {
  it('não renderiza nada sem endereço e sem horário', () => {
    const { container } = render(<Localizacao {...dados()} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renderiza só o horário quando não há endereço', () => {
    const empresa = { ...EMPRESA_VAZIA, horarios: [{ dia: 'seg' as const, abre: '08:00', fecha: '18:00' }] };
    render(<Localizacao {...dados({ empresa })} />);
    expect(screen.getByText(/Segunda/)).toBeInTheDocument();
    expect(screen.queryByText('Ver no mapa')).not.toBeInTheDocument();
  });

  it('renderiza só o endereço quando não há horário', () => {
    const empresa = { ...EMPRESA_VAZIA, endereco: { texto: 'Rua das Flores, 123', lat: null, lng: null } };
    render(<Localizacao {...dados({ empresa })} />);
    expect(screen.getByText('Rua das Flores, 123')).toBeInTheDocument();
    expect(screen.getByText('Ver no mapa')).toBeInTheDocument();
  });
});

describe('Contato — omite sem nenhum meio de contato', () => {
  it('não renderiza nada sem nenhum contato', () => {
    const { container } = render(<Contato {...dados()} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renderiza a seção com só um e-mail, mas sem botão de WhatsApp (nem telefone nem whatsapp)', () => {
    const empresa = { ...EMPRESA_VAZIA, contato: { ...EMPRESA_VAZIA.contato, email: 'contato@padaria.com' } };
    render(<Contato {...dados({ empresa })} />);
    expect(screen.getByText('contato@padaria.com')).toBeInTheDocument();
    expect(screen.queryByText(/WhatsApp/)).not.toBeInTheDocument();
  });

  it('mostra o botão de WhatsApp quando há telefone, mesmo sem whatsapp explícito', () => {
    const empresa = { ...EMPRESA_VAZIA, contato: { ...EMPRESA_VAZIA.contato, telefone: '11987654321' } };
    render(<Contato {...dados({ empresa })} />);
    expect(screen.getByText('Fale pelo WhatsApp')).toBeInTheDocument();
  });
});

describe('Rodapé — nunca omitido', () => {
  it('sempre mostra o nome da empresa e a marca Linka, mesmo sem nenhum dado', () => {
    render(<Rodape {...dados()} />);
    expect(screen.getByText(/Empresa Teste/)).toBeInTheDocument();
    expect(screen.getByText('Site gerado com Linka')).toBeInTheDocument();
  });

  it('só mostra o link para o perfil de origem quando ele existe', () => {
    const { rerender } = render(<Rodape {...dados()} />);
    expect(screen.queryByText('Ver perfil de origem')).not.toBeInTheDocument();

    rerender(<Rodape {...dados({ linkOrigem: 'https://instagram.com/empresa' })} />);
    expect(screen.getByText('Ver perfil de origem')).toBeInTheDocument();
  });
});

describe('registro de componentes por seção', () => {
  it('cobre exatamente as mesmas seções que o schema Zod permite (nenhuma seção fica sem componente)', () => {
    const secoesDoSchema = secaoSchema.options;
    const secoesRegistradas = Object.keys(COMPONENTE_POR_SECAO).sort();

    expect(secoesRegistradas).toEqual([...secoesDoSchema].sort());
  });
});
