import type { EstiloConfig, Paleta } from '@/lib/schemas/estilo';

// Contraste mínimo AA do WCAG 2.1 para texto normal (seção 8.2 do
// CLAUDE.md: "valida contraste WCAG AA entre texto/fundo e primária/fundo").
const CONTRASTE_MINIMO_AA = 4.5;

function hexParaRgb(hex: string): [number, number, number] {
  const limpo = hex.replace('#', '');
  return [
    parseInt(limpo.slice(0, 2), 16),
    parseInt(limpo.slice(2, 4), 16),
    parseInt(limpo.slice(4, 6), 16),
  ];
}

function rgbParaHex([r, g, b]: [number, number, number]): string {
  const canal = (c: number) =>
    Math.round(Math.min(255, Math.max(0, c)))
      .toString(16)
      .padStart(2, '0');
  return `#${canal(r)}${canal(g)}${canal(b)}`.toUpperCase();
}

// Fórmula de luminância relativa do WCAG 2.1.
function luminanciaRelativa(hex: string): number {
  const [r, g, b] = hexParaRgb(hex).map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function razaoDeContraste(corA: string, corB: string): number {
  const lA = luminanciaRelativa(corA);
  const lB = luminanciaRelativa(corB);
  const [maisClara, maisEscura] = lA > lB ? [lA, lB] : [lB, lA];
  return (maisClara + 0.05) / (maisEscura + 0.05);
}

// Escurece (fator negativo) ou clareia (fator positivo) uma cor, misturando
// proporcionalmente com preto/branco.
function ajustarCor(hex: string, fator: number): string {
  const [r, g, b] = hexParaRgb(hex);
  const alvo = fator > 0 ? 255 : 0;
  const intensidade = Math.abs(fator);
  const ajustarCanal = (canal: number) => canal + (alvo - canal) * intensidade;
  return rgbParaHex([ajustarCanal(r), ajustarCanal(g), ajustarCanal(b)]);
}

// Ajusta `corAjustavel` escurecendo ou clareando (na mesma direção que ela
// já está em relação a `corFixa`, nunca invertendo) até atingir o contraste
// mínimo AA. Se nem no extremo (preto/branco puro) for suficiente — só
// acontece com `corFixa` num cinza médio quase equidistante — devolve o
// extremo mesmo assim, que é sempre o melhor contraste possível.
export function corComContrasteMinimo(corAjustavel: string, corFixa: string): string {
  if (razaoDeContraste(corAjustavel, corFixa) >= CONTRASTE_MINIMO_AA) {
    return corAjustavel;
  }

  const escurecendo = luminanciaRelativa(corAjustavel) <= luminanciaRelativa(corFixa);
  let melhorCor = escurecendo ? '#000000' : '#FFFFFF';

  for (let passo = 1; passo <= 20; passo++) {
    const cor = ajustarCor(corAjustavel, escurecendo ? -(passo / 20) : passo / 20);
    if (razaoDeContraste(cor, corFixa) >= CONTRASTE_MINIMO_AA) {
      melhorCor = cor;
      break;
    }
  }

  return melhorCor;
}

// Corrige a paleta de um estilo para atender ao contraste mínimo AA entre
// texto/fundo e primária/fundo, escurecendo ou clareando quando necessário
// — nunca troca a cor de lugar, só ajusta a intensidade.
export function corrigirContraste(paleta: Paleta): Paleta {
  return {
    ...paleta,
    texto: corComContrasteMinimo(paleta.texto, paleta.fundo),
    primaria: corComContrasteMinimo(paleta.primaria, paleta.fundo),
  };
}

const RAIO_BORDA_PX: Record<EstiloConfig['raio_borda'], string> = {
  nenhum: '0px',
  pequeno: '6px',
  medio: '12px',
  grande: '24px',
};

const DENSIDADE_ESPACAMENTO: Record<EstiloConfig['densidade'], string> = {
  compacta: '1rem',
  media: '1.5rem',
  espacada: '2.5rem',
};

// Nome da fonte (schema/seção 7 do CLAUDE.md) → variável CSS que o
// next/font gera pra ela (lib/site/fontes.ts carrega as fontes de verdade
// e declara essas mesmas variáveis — mantidas em sincronia por convenção,
// checado pelo teste de fontes.ts). Fica como uma tabela de dados pura
// aqui (sem importar next/font/google) porque este módulo precisa
// continuar importável por um teste comum do Vitest — next/font só
// funciona processado pelo compilador do Next.js.
const VARIAVEL_CSS_POR_FONTE: Record<string, string> = {
  Inter: 'var(--font-inter)',
  Poppins: 'var(--font-poppins)',
  Montserrat: 'var(--font-montserrat)',
  'DM Sans': 'var(--font-dm-sans)',
  'Playfair Display': 'var(--font-playfair-display)',
  Lora: 'var(--font-lora)',
  Merriweather: 'var(--font-merriweather)',
  Nunito: 'var(--font-nunito)',
};

// Converte o estilo (já com contraste corrigido) em variáveis CSS
// consumidas pelos componentes do site — seção "Fase 3" do CLAUDE.md ("Tema
// por CSS variables"). As fontes em si carregam via next/font
// (lib/site/fontes.ts); aqui só referencia a variável CSS que aquele
// módulo declara para cada uma.
export function estiloParaVariaveisCss(estilo: EstiloConfig): Record<string, string> {
  return {
    '--cor-primaria': estilo.paleta.primaria,
    '--cor-secundaria': estilo.paleta.secundaria,
    '--cor-fundo': estilo.paleta.fundo,
    '--cor-texto': estilo.paleta.texto,
    '--fonte-titulos': VARIAVEL_CSS_POR_FONTE[estilo.tipografia.titulos],
    '--fonte-corpo': VARIAVEL_CSS_POR_FONTE[estilo.tipografia.corpo],
    '--raio-borda': RAIO_BORDA_PX[estilo.raio_borda],
    '--espacamento-secao': DENSIDADE_ESPACAMENTO[estilo.densidade],
  };
}
