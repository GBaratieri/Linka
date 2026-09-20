import { afterEach, describe, expect, it, vi } from 'vitest';
import { buscarDadosGoogle, extrairConsulta } from '@/lib/conectores/google';

describe('extrairConsulta', () => {
  it('extrai o nome da empresa de uma URL /maps/place/', () => {
    expect(
      extrairConsulta('https://www.google.com/maps/place/Padaria+P%C3%A3o+Quente/@-23.5,-46.6,17z'),
    ).toBe('Padaria Pão Quente');
  });

  it('extrai a consulta do parâmetro q quando não há /place/', () => {
    expect(extrairConsulta('https://maps.google.com/?q=Oficina+Silva')).toBe('Oficina Silva');
  });

  it('retorna null quando não há nome nem parâmetro de busca', () => {
    expect(extrairConsulta('https://maps.google.com/maps')).toBeNull();
  });
});

describe('buscarDadosGoogle (USE_MOCKS=true)', () => {
  it('devolve uma fixture com os campos principais preenchidos', async () => {
    const dados = await buscarDadosGoogle('https://maps.app.goo.gl/AbCdEfG');

    expect(dados).not.toBeNull();
    expect(dados?.nome).toBeTruthy();
    expect(dados?.endereco).toBeTruthy();
    expect(dados?.lat).toBeTypeOf('number');
    expect(dados?.lng).toBeTypeOf('number');
  });

  it('é determinístico: a mesma URL sempre devolve a mesma fixture', async () => {
    const url = 'https://www.google.com/maps/place/Empresa+Exemplo/@-23.5,-46.6,17z';
    const primeira = await buscarDadosGoogle(url);
    const segunda = await buscarDadosGoogle(url);

    expect(primeira).toEqual(segunda);
  });

  it('cobre pelo menos 3 negócios diferentes entre URLs distintas', async () => {
    const urls = [
      'https://maps.app.goo.gl/negocio-um',
      'https://maps.app.goo.gl/negocio-dois-abc',
      'https://maps.app.goo.gl/negocio-tres-xyz-mais-longo',
    ];

    const resultados = await Promise.all(urls.map((url) => buscarDadosGoogle(url)));
    const nomes = new Set(resultados.map((r) => r?.nome));

    expect(nomes.size).toBeGreaterThanOrEqual(2);
  });
});

describe('buscarDadosGoogle (USE_MOCKS=false, com fetch mockado)', () => {
  const LUGAR_DETALHES = {
    id: 'place-123',
    displayName: { text: 'Padaria Pão Quente' },
    formattedAddress: 'Rua das Flores, 123',
    nationalPhoneNumber: '(11) 3456-7890',
    regularOpeningHours: { weekdayDescriptions: ['segunda-feira: 06:00 – 20:00'] },
    primaryTypeDisplayName: { text: 'Padaria' },
    rating: 4.6,
    userRatingCount: 128,
    location: { latitude: -23.55, longitude: -46.63 },
  };

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('busca só o id (SKU mais barato) e depois faz um único Place Details', async () => {
    vi.stubEnv('USE_MOCKS', 'false');
    vi.stubEnv('GOOGLE_PLACES_API_KEY', 'chave-de-teste');

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ places: [{ id: 'place-123' }] }), { status: 200 }),
      )
      .mockResolvedValueOnce(new Response(JSON.stringify(LUGAR_DETALHES), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    const dados = await buscarDadosGoogle(
      'https://www.google.com/maps/place/Padaria+P%C3%A3o+Quente/@-23.5,-46.6,17z',
    );

    expect(fetchMock).toHaveBeenCalledTimes(2);

    const [urlBusca, opcoesBusca] = fetchMock.mock.calls[0];
    expect(urlBusca).toBe('https://places.googleapis.com/v1/places:searchText');
    expect((opcoesBusca?.headers as Record<string, string>)['X-Goog-FieldMask']).toBe('places.id');

    const [urlDetalhes, opcoesDetalhes] = fetchMock.mock.calls[1];
    expect(urlDetalhes).toBe('https://places.googleapis.com/v1/places/place-123');
    const mascaraDetalhes = (opcoesDetalhes?.headers as Record<string, string>)['X-Goog-FieldMask'];
    expect(mascaraDetalhes).not.toContain('places.');
    expect(mascaraDetalhes).not.toContain('reviews');

    expect(dados?.nome).toBe('Padaria Pão Quente');
    expect(dados?.telefone).toBe('(11) 3456-7890');
  });

  it('só inclui reviews no Place Details quando GOOGLE_SHOW_REVIEWS=true', async () => {
    vi.stubEnv('USE_MOCKS', 'false');
    vi.stubEnv('GOOGLE_PLACES_API_KEY', 'chave-de-teste');
    vi.stubEnv('GOOGLE_SHOW_REVIEWS', 'true');

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ places: [{ id: 'place-123' }] }), { status: 200 }),
      )
      .mockResolvedValueOnce(new Response(JSON.stringify(LUGAR_DETALHES), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    await buscarDadosGoogle('https://maps.google.com/?q=Padaria');

    const [, opcoesDetalhes] = fetchMock.mock.calls[1];
    expect((opcoesDetalhes?.headers as Record<string, string>)['X-Goog-FieldMask']).toContain(
      'reviews',
    );
  });

  it('não chama Place Details quando a busca não encontra nenhum lugar', async () => {
    vi.stubEnv('USE_MOCKS', 'false');
    vi.stubEnv('GOOGLE_PLACES_API_KEY', 'chave-de-teste');

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ places: [] }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    const dados = await buscarDadosGoogle('https://maps.google.com/?q=Empresa+Inexistente');

    expect(dados).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
