const MENSAGEM_ERRO_PADRAO =
  'Link inválido. Cole um link do Instagram ou do Google Maps da sua empresa.';

const TAMANHO_MAXIMO_ENTRADA = 2048;

const HOSTS_INSTAGRAM = new Set(['instagram.com', 'www.instagram.com', 'm.instagram.com']);

// Hosts do Google que já identificam uma localização por si só, sem exigir
// um caminho específico (ex.: link curto ou "g.page/...").
const HOSTS_GOOGLE_DIRETO = new Set([
  'maps.google.com',
  'maps.app.goo.gl',
  'g.page',
  'share.google',
]);

// google.com/www.google.com só conta como link do Maps se o caminho começar
// com "/maps" (evita aceitar qualquer busca do Google como se fosse a
// empresa).
const HOSTS_GOOGLE_COM = new Set(['google.com', 'www.google.com']);

export type ResultadoRoteador =
  { tipo: 'instagram' | 'google'; url: string } | { tipo: null; erro: string };

function normalizarHost(host: string): string {
  return host.toLowerCase().replace(/\.$/, '');
}

function normalizarEntrada(texto: string): string {
  if (/^https?:\/\//i.test(texto)) {
    return texto;
  }

  // Aceita links colados sem protocolo ("instagram.com/empresa") e links
  // relativos ao protocolo ("//instagram.com/empresa").
  const semBarrasIniciais = texto.replace(/^\/+/, '');
  return `https://${semBarrasIniciais}`;
}

// Classificação só por hostname/protocolo, sem requisição de rede; links
// curtos do Google são resolvidos de fato na Fase 2, via lib/seguranca/ssrf.ts.
export function detectarFonte(entrada: string): ResultadoRoteador {
  const texto = entrada.trim();

  if (!texto || texto.length > TAMANHO_MAXIMO_ENTRADA) {
    return { tipo: null, erro: MENSAGEM_ERRO_PADRAO };
  }

  let url: URL;
  try {
    url = new URL(normalizarEntrada(texto));
  } catch {
    return { tipo: null, erro: MENSAGEM_ERRO_PADRAO };
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return { tipo: null, erro: MENSAGEM_ERRO_PADRAO };
  }

  const host = normalizarHost(url.hostname);

  if (HOSTS_INSTAGRAM.has(host)) {
    return { tipo: 'instagram', url: url.toString() };
  }

  if (HOSTS_GOOGLE_DIRETO.has(host)) {
    return { tipo: 'google', url: url.toString() };
  }

  if (HOSTS_GOOGLE_COM.has(host) && url.pathname.startsWith('/maps')) {
    return { tipo: 'google', url: url.toString() };
  }

  return { tipo: null, erro: MENSAGEM_ERRO_PADRAO };
}
