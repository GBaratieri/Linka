import { buscarComSeguranca } from '@/lib/seguranca/ssrf';

export interface AvaliacaoGoogle {
  autor: string;
  texto: string;
}

export interface DadosBrutosGoogle {
  id: string;
  nome: string | null;
  endereco: string | null;
  telefone: string | null;
  site: string | null;
  // Uma linha por dia, no formato devolvido pela Places API (New) em pt-BR,
  // ex.: "segunda-feira: 08:00 – 18:00". Convertido para {dia, abre, fecha}
  // pelo estruturador (lib/ia/estruturador.ts).
  horarios: string[] | null;
  categoriaPrincipal: string | null;
  nota: number | null;
  totalAvaliacoes: number | null;
  lat: number | null;
  lng: number | null;
  avaliacoes: AvaliacaoGoogle[] | null;
  // Fotos do Google não são baixadas/armazenadas nesta fase — ver
  // docs/decisoes.md ("Fotos do Google adiadas"). Sempre null enquanto
  // GOOGLE_SHOW_PHOTOS não tiver uma implementação de download + Storage.
  fotos: string[] | null;
}

interface PlaceApiResultado {
  id: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  nationalPhoneNumber?: string;
  websiteUri?: string;
  regularOpeningHours?: { weekdayDescriptions?: string[] };
  primaryTypeDisplayName?: { text?: string };
  rating?: number;
  userRatingCount?: number;
  location?: { latitude?: number; longitude?: number };
  reviews?: { authorAttribution?: { displayName?: string }; text?: { text?: string } }[];
}

const usarMocks = () => process.env.USE_MOCKS !== 'false';

const HOSTS_LINK_CURTO = new Set(['maps.app.goo.gl', 'g.page', 'share.google']);

const CAMPO_MASCARA_BASE = [
  'places.id',
  'places.displayName',
  'places.formattedAddress',
  'places.nationalPhoneNumber',
  'places.websiteUri',
  'places.regularOpeningHours.weekdayDescriptions',
  'places.primaryTypeDisplayName',
  'places.rating',
  'places.userRatingCount',
  'places.location',
].join(',');

async function resolverUrl(url: string): Promise<string> {
  const analisada = new URL(url);
  if (!HOSTS_LINK_CURTO.has(analisada.hostname.replace(/^www\./, ''))) {
    return url;
  }

  const resposta = await buscarComSeguranca(url, { init: { method: 'HEAD' } });
  return resposta.url || url;
}

export function extrairConsulta(url: string): string | null {
  const analisada = new URL(url);

  const doCaminho = analisada.pathname.match(/\/place\/([^/]+)/);
  if (doCaminho) {
    return decodeURIComponent(doCaminho[1].replace(/\+/g, ' '));
  }

  const doParametro = analisada.searchParams.get('q');
  return doParametro ? decodeURIComponent(doParametro.replace(/\+/g, ' ')) : null;
}

function mapearLugar(
  lugar: PlaceApiResultado,
  opcoes: { mostrarAvaliacoes: boolean },
): DadosBrutosGoogle {
  return {
    id: lugar.id,
    nome: lugar.displayName?.text ?? null,
    endereco: lugar.formattedAddress ?? null,
    telefone: lugar.nationalPhoneNumber ?? null,
    site: lugar.websiteUri ?? null,
    horarios: lugar.regularOpeningHours?.weekdayDescriptions ?? null,
    categoriaPrincipal: lugar.primaryTypeDisplayName?.text ?? null,
    nota: lugar.rating ?? null,
    totalAvaliacoes: lugar.userRatingCount ?? null,
    lat: lugar.location?.latitude ?? null,
    lng: lugar.location?.longitude ?? null,
    avaliacoes: opcoes.mostrarAvaliacoes
      ? (lugar.reviews ?? []).map((avaliacao) => ({
          autor: avaliacao.authorAttribution?.displayName ?? 'Anônimo',
          texto: avaliacao.text?.text ?? '',
        }))
      : null,
    fotos: null,
  };
}

// Busca os dados de uma empresa a partir de um link do Google Maps (incluindo
// links curtos, resolvidos via lib/seguranca/ssrf.ts). Usa a Places API (New)
// com o menor X-Goog-FieldMask necessário (seção 3 do CLAUDE.md). Reviews só
// são pedidas quando GOOGLE_SHOW_REVIEWS=true.
export async function buscarDadosGoogle(url: string): Promise<DadosBrutosGoogle | null> {
  if (usarMocks()) {
    return buscarFixturePorUrl(url);
  }

  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    throw new Error('GOOGLE_PLACES_API_KEY não configurado.');
  }

  const urlResolvida = await resolverUrl(url);
  const consulta = extrairConsulta(urlResolvida);
  if (!consulta) {
    return null;
  }

  const mostrarAvaliacoes = process.env.GOOGLE_SHOW_REVIEWS === 'true';
  const mascara = mostrarAvaliacoes ? `${CAMPO_MASCARA_BASE},places.reviews` : CAMPO_MASCARA_BASE;

  const resposta = await fetch('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask': mascara,
    },
    body: JSON.stringify({ textQuery: consulta, languageCode: 'pt-BR', maxResultCount: 1 }),
  });

  if (!resposta.ok) {
    throw new Error(`Places API respondeu ${resposta.status}`);
  }

  const corpo = (await resposta.json()) as { places?: PlaceApiResultado[] };
  const lugar = corpo.places?.[0];
  if (!lugar) {
    return null;
  }

  return mapearLugar(lugar, { mostrarAvaliacoes });
}

// --- Fixtures (USE_MOCKS=true) ---------------------------------------------

const FIXTURES: DadosBrutosGoogle[] = [
  {
    id: 'fixture-padaria',
    nome: 'Padaria Pão Quente',
    endereco: 'Rua das Flores, 123 - Centro, São Paulo - SP',
    telefone: '(11) 3456-7890',
    site: null,
    horarios: [
      'segunda-feira: 06:00 – 20:00',
      'terça-feira: 06:00 – 20:00',
      'quarta-feira: 06:00 – 20:00',
      'quinta-feira: 06:00 – 20:00',
      'sexta-feira: 06:00 – 20:00',
      'sábado: 06:00 – 14:00',
    ],
    categoriaPrincipal: 'Padaria',
    nota: 4.6,
    totalAvaliacoes: 128,
    lat: -23.55052,
    lng: -46.633308,
    avaliacoes: null,
    fotos: null,
  },
  {
    id: 'fixture-oficina',
    nome: 'Oficina Mecânica Silva',
    endereco: 'Av. Industrial, 900 - Vila Velha, Curitiba - PR',
    telefone: '(41) 3222-1100',
    site: 'https://oficinasilva.exemplo.com.br',
    horarios: [
      'segunda-feira: 08:00 – 18:00',
      'terça-feira: 08:00 – 18:00',
      'quarta-feira: 08:00 – 18:00',
      'quinta-feira: 08:00 – 18:00',
      'sexta-feira: 08:00 – 18:00',
    ],
    categoriaPrincipal: 'Oficina mecânica',
    nota: 4.2,
    totalAvaliacoes: 47,
    lat: -25.429596,
    lng: -49.271272,
    avaliacoes: null,
    fotos: null,
  },
  {
    id: 'fixture-moveis',
    nome: 'Center Móveis e Decorações',
    endereco: 'Rua Sete de Setembro, 500 - Centro, Porto Alegre - RS',
    telefone: '(51) 3200-4455',
    site: null,
    horarios: [
      'segunda-feira: 09:00 – 19:00',
      'terça-feira: 09:00 – 19:00',
      'quarta-feira: 09:00 – 19:00',
      'quinta-feira: 09:00 – 19:00',
      'sexta-feira: 09:00 – 19:00',
      'sábado: 09:00 – 13:00',
    ],
    categoriaPrincipal: 'Loja de móveis',
    nota: 4.4,
    totalAvaliacoes: 63,
    lat: -30.03465,
    lng: -51.21766,
    avaliacoes: null,
    fotos: null,
  },
];

function buscarFixturePorUrl(url: string): DadosBrutosGoogle {
  let soma = 0;
  for (let i = 0; i < url.length; i++) {
    soma += url.charCodeAt(i);
  }
  return FIXTURES[soma % FIXTURES.length];
}
