import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('node:dns', () => {
  const lookup = vi.fn();
  return {
    default: { promises: { lookup } },
    promises: { lookup },
  };
});

import { promises as dns } from 'node:dns';
import {
  buscarComSeguranca,
  ErroSsrf,
  hostPermitido,
  ipEhPrivadoOuReservado,
} from '@/lib/seguranca/ssrf';

interface DnsLookupMock {
  mockReset: () => void;
  mockResolvedValue: (valor: Array<{ address: string; family: number }>) => void;
}

// O tipo real de dns.promises.lookup tem sobrecargas incompatíveis com o
// retorno em lista usado aqui (opção `{ all: true }`); o cast evita lutar
// contra essas sobrecargas só para o mock de teste.
const lookupMock = dns.lookup as unknown as DnsLookupMock;

describe('hostPermitido', () => {
  it.each([
    ['instagram.com'],
    ['www.instagram.com'],
    ['google.com'],
    ['maps.app.goo.gl'],
    ['g.page'],
    ['share.google'],
    ['INSTAGRAM.COM'],
    ['instagram.com.'],
  ])('permite "%s"', (host) => {
    expect(hostPermitido(host)).toBe(true);
  });

  it.each([['evil.com'], ['instagram.com.evil.com'], ['facebook.com'], ['localhost']])(
    'rejeita "%s"',
    (host) => {
      expect(hostPermitido(host)).toBe(false);
    },
  );
});

describe('ipEhPrivadoOuReservado', () => {
  it.each([
    ['10.0.0.1'],
    ['127.0.0.1'],
    ['192.168.1.1'],
    ['172.16.0.5'],
    ['169.254.169.254'], // metadata de nuvem
    ['0.0.0.0'],
    ['100.64.0.1'],
    ['::1'],
    ['fd00::1'],
    ['fe80::1'],
    ['::ffff:127.0.0.1'],
  ])('classifica "%s" como privado/reservado', (ip) => {
    expect(ipEhPrivadoOuReservado(ip)).toBe(true);
  });

  it.each([['8.8.8.8'], ['142.250.0.1'], ['2001:4860:4860::8888']])(
    'classifica "%s" como público',
    (ip) => {
      expect(ipEhPrivadoOuReservado(ip)).toBe(false);
    },
  );

  it('trata uma string que não é IP como não permitida', () => {
    expect(ipEhPrivadoOuReservado('não-e-um-ip')).toBe(true);
  });
});

describe('buscarComSeguranca', () => {
  beforeEach(() => {
    lookupMock.mockReset();
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('rejeita hosts fora da lista de permissão sem chamar fetch', async () => {
    await expect(buscarComSeguranca('https://evil.com/')).rejects.toThrow(ErroSsrf);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('rejeita protocolos que não sejam http/https', async () => {
    await expect(buscarComSeguranca('ftp://instagram.com/')).rejects.toThrow(ErroSsrf);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('rejeita quando o host resolve para um IP privado (DNS rebinding)', async () => {
    lookupMock.mockResolvedValue([{ address: '127.0.0.1', family: 4 }]);

    await expect(buscarComSeguranca('https://instagram.com/empresa')).rejects.toThrow(ErroSsrf);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('faz a requisição quando o host é permitido e resolve para IP público', async () => {
    lookupMock.mockResolvedValue([{ address: '157.240.0.1', family: 4 }]);
    const respostaFinal = new Response('ok', { status: 200 });
    vi.mocked(fetch).mockResolvedValue(respostaFinal);

    const resposta = await buscarComSeguranca('https://instagram.com/empresa');

    expect(resposta.status).toBe(200);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('segue um redirecionamento para um host também permitido', async () => {
    lookupMock.mockResolvedValue([{ address: '157.240.0.1', family: 4 }]);

    const redirecionamento = new Response(null, {
      status: 302,
      headers: { location: 'https://maps.app.goo.gl/AbCdEfG' },
    });
    const respostaFinal = new Response('ok', { status: 200 });

    vi.mocked(fetch).mockResolvedValueOnce(redirecionamento).mockResolvedValueOnce(respostaFinal);

    const resposta = await buscarComSeguranca('https://g.page/empresa');

    expect(resposta.status).toBe(200);
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('rejeita um redirecionamento para um host fora da lista de permissão', async () => {
    lookupMock.mockResolvedValue([{ address: '157.240.0.1', family: 4 }]);

    const redirecionamento = new Response(null, {
      status: 302,
      headers: { location: 'https://evil.com/roubar-sessao' },
    });
    vi.mocked(fetch).mockResolvedValue(redirecionamento);

    await expect(buscarComSeguranca('https://g.page/empresa')).rejects.toThrow(ErroSsrf);
  });

  it('desiste após exceder o número máximo de redirecionamentos', async () => {
    lookupMock.mockResolvedValue([{ address: '157.240.0.1', family: 4 }]);

    const redirecionamentoInfinito = new Response(null, {
      status: 302,
      headers: { location: 'https://g.page/proximo' },
    });
    vi.mocked(fetch).mockResolvedValue(redirecionamentoInfinito);

    await expect(
      buscarComSeguranca('https://g.page/empresa', { maxRedirecionamentos: 2 }),
    ).rejects.toThrow(ErroSsrf);
    expect(fetch).toHaveBeenCalledTimes(3);
  });
});
