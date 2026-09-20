import { describe, expect, it } from 'vitest';
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
