import net from 'node:net';
import { promises as dns } from 'node:dns';

const TIMEOUT_PADRAO_MS = 8000;
const MAX_REDIRECIONAMENTOS_PADRAO = 5;

// Únicos hosts que o servidor tem permissão de acessar a partir de uma URL
// fornecida pelo usuário (Instagram e Google Maps, incluindo encurtadores).
const HOSTS_PERMITIDOS = new Set([
  'instagram.com',
  'www.instagram.com',
  'm.instagram.com',
  'google.com',
  'www.google.com',
  'maps.google.com',
  'maps.app.goo.gl',
  'g.page',
  'share.google',
]);

export class ErroSsrf extends Error {}

function normalizarHost(host: string): string {
  return host.toLowerCase().replace(/\.$/, '');
}

export function hostPermitido(host: string): boolean {
  return HOSTS_PERMITIDOS.has(normalizarHost(host));
}

// google.com/www.google.com só são um link de Maps quando o caminho começa
// com "/maps" (mesma regra de lib/conectores/roteador.ts — precisa ficar em
// sincronia com HOSTS_GOOGLE_COM de lá).
const HOSTS_CAMINHO_OBRIGATORIO: Record<string, string> = {
  'google.com': '/maps',
  'www.google.com': '/maps',
};

export function caminhoPermitidoParaHost(host: string, pathname: string): boolean {
  const caminhoExigido = HOSTS_CAMINHO_OBRIGATORIO[normalizarHost(host)];
  return !caminhoExigido || pathname.startsWith(caminhoExigido);
}

function ipv4EhPrivadoOuReservado(ip: string): boolean {
  const partes = ip.split('.').map(Number);
  if (partes.length !== 4 || partes.some((p) => Number.isNaN(p))) {
    return true;
  }
  const [a, b, c] = partes;

  if (a === 0) return true; // "esta rede"
  if (a === 10) return true; // 10.0.0.0/8
  if (a === 127) return true; // loopback
  if (a === 169 && b === 254) return true; // link-local (inclui metadata 169.254.169.254)
  if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12
  if (a === 192 && b === 168) return true; // 192.168.0.0/16
  if (a === 192 && b === 0 && c === 0) return true; // reservado (IETF)
  if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT 100.64.0.0/10
  if (a === 198 && (b === 18 || b === 19)) return true; // benchmarking
  if (a >= 224) return true; // multicast (224+) e reservado (240+)/broadcast

  return false;
}

function ipv6EhPrivadoOuReservado(ipOriginal: string): boolean {
  const ip = ipOriginal.toLowerCase();

  if (ip === '::1' || ip === '::') return true;
  if (ip.startsWith('fc') || ip.startsWith('fd')) return true; // fc00::/7 (unique local)
  if (/^fe[89ab]/.test(ip)) return true; // fe80::/10 (link-local)

  const mapeado = ip.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mapeado) return ipv4EhPrivadoOuReservado(mapeado[1]);

  return false;
}

export function ipEhPrivadoOuReservado(ip: string): boolean {
  const versao = net.isIP(ip);
  if (versao === 4) return ipv4EhPrivadoOuReservado(ip);
  if (versao === 6) return ipv6EhPrivadoOuReservado(ip);
  return true; // não é um IP válido — trata como não permitido
}

async function validarHost(hostname: string, pathname: string): Promise<void> {
  if (net.isIP(hostname)) {
    throw new ErroSsrf(`Host não permitido: ${hostname}`);
  }

  if (!hostPermitido(hostname)) {
    throw new ErroSsrf(`Host não permitido: ${hostname}`);
  }

  if (!caminhoPermitidoParaHost(hostname, pathname)) {
    throw new ErroSsrf(`Caminho não permitido para "${hostname}": ${pathname}`);
  }

  const enderecos = await dns.lookup(hostname, { all: true });
  if (enderecos.some(({ address }) => ipEhPrivadoOuReservado(address))) {
    throw new ErroSsrf(`Host "${hostname}" resolve para um IP privado/reservado`);
  }
}

export interface OpcoesBuscaSegura {
  timeoutMs?: number;
  maxRedirecionamentos?: number;
  init?: RequestInit;
}

// Busca uma URL fornecida pelo usuário protegida contra SSRF: lista de hosts
// permitidos, bloqueio de IPs privados/reservados (inclusive via DNS),
// timeout e limite de redirecionamentos — cada salto é revalidado.
export async function buscarComSeguranca(
  urlEntrada: string,
  opcoes: OpcoesBuscaSegura = {},
): Promise<Response> {
  const timeoutMs = opcoes.timeoutMs ?? TIMEOUT_PADRAO_MS;
  const maxRedirecionamentos = opcoes.maxRedirecionamentos ?? MAX_REDIRECIONAMENTOS_PADRAO;

  let urlAtual: URL;
  try {
    urlAtual = new URL(urlEntrada);
  } catch {
    throw new ErroSsrf(`URL inválida: ${urlEntrada}`);
  }

  for (let redirecionamentos = 0; ; redirecionamentos++) {
    if (urlAtual.protocol !== 'http:' && urlAtual.protocol !== 'https:') {
      throw new ErroSsrf(`Protocolo não permitido: ${urlAtual.protocol}`);
    }

    await validarHost(urlAtual.hostname, urlAtual.pathname);

    const controlador = new AbortController();
    const timeout = setTimeout(() => controlador.abort(), timeoutMs);

    let resposta: Response;
    try {
      resposta = await fetch(urlAtual, {
        ...opcoes.init,
        redirect: 'manual',
        signal: controlador.signal,
      });
    } finally {
      clearTimeout(timeout);
    }

    const local = resposta.headers.get('location');
    const ehRedirecionamento = resposta.status >= 300 && resposta.status < 400;

    if (!ehRedirecionamento || !local) {
      return resposta;
    }

    if (redirecionamentos >= maxRedirecionamentos) {
      throw new ErroSsrf('Número máximo de redirecionamentos excedido');
    }

    urlAtual = new URL(local, urlAtual);
  }
}
