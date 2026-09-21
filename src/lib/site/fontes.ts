import {
  Inter,
  Poppins,
  Montserrat,
  DM_Sans,
  Playfair_Display,
  Lora,
  Merriweather,
  Nunito,
} from 'next/font/google';

// Carrega as 8 fontes permitidas pelo schema de estilo (seção 7 do
// CLAUDE.md) via next/font (seção "Fase 3": "fontes via next/font") — cada
// uma como uma variável CSS que lib/site/tema.ts referencia pelo nome
// (VARIAVEL_CSS_POR_FONTE), já que o estilo escolhido só é conhecido em
// tempo de execução (não dá pra `next/font` carregar uma fonte "dinâmica").
const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' });
const poppins = Poppins({
  subsets: ['latin'],
  weight: ['400', '600', '700'],
  variable: '--font-poppins',
  display: 'swap',
});
const montserrat = Montserrat({ subsets: ['latin'], variable: '--font-montserrat', display: 'swap' });
const dmSans = DM_Sans({ subsets: ['latin'], variable: '--font-dm-sans', display: 'swap' });
const playfairDisplay = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-playfair-display',
  display: 'swap',
});
const lora = Lora({ subsets: ['latin'], variable: '--font-lora', display: 'swap' });
const merriweather = Merriweather({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-merriweather',
  display: 'swap',
});
const nunito = Nunito({ subsets: ['latin'], variable: '--font-nunito', display: 'swap' });

// Aplicado no wrapper de qualquer página que renderize um site gerado
// (prévia agora; o subdomínio publicado na Fase 4) — carrega todas de uma
// vez porque o estilo de cada empresa só é resolvido em tempo de execução.
export const CLASSE_FONTES_DO_SITE = [
  inter.variable,
  poppins.variable,
  montserrat.variable,
  dmSans.variable,
  playfairDisplay.variable,
  lora.variable,
  merriweather.variable,
  nunito.variable,
].join(' ');
