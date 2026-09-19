import { describe, expect, it } from 'vitest';
import { detectarFonte } from '@/lib/conectores/roteador';

describe('detectarFonte', () => {
  it.each([
    ['https://www.instagram.com/empresa.exemplo/', 'instagram'],
    ['https://instagram.com/empresa', 'instagram'],
    ['instagram.com/empresa', 'instagram'],
    ['http://m.instagram.com/empresa/', 'instagram'],
    ['HTTPS://INSTAGRAM.COM/Empresa', 'instagram'],
    ['  https://instagram.com/empresa  ', 'instagram'],
    ['//instagram.com/empresa', 'instagram'],
    ['https://instagram.com./empresa', 'instagram'],
    ['https://www.google.com/maps/place/Empresa+Exemplo/@-23.5,-46.6,15z', 'google'],
    ['https://maps.google.com/?q=empresa+exemplo', 'google'],
    ['https://maps.app.goo.gl/AbCdEfG', 'google'],
    ['https://g.page/empresa-exemplo', 'google'],
    ['https://share.google/AbCdEfG', 'google'],
  ])('classifica "%s" como %s', (entrada, tipoEsperado) => {
    const resultado = detectarFonte(entrada);
    expect(resultado.tipo).toBe(tipoEsperado);
    if (resultado.tipo) {
      expect(resultado.url).toMatch(/^https?:\/\//);
    }
  });

  it.each([
    [''],
    ['   '],
    ['não é um link'],
    ['https://facebook.com/empresa'],
    ['https://instagramfake.com/empresa'],
    ['https://instagram.com.evil.com/empresa'],
    ['https://evil.com/instagram.com'],
    ['https://instagram.com@evil.com/empresa'],
    ['javascript:alert(1)'],
    ['javascript://instagram.com/%0aalert(1)'],
    ['data:text/html;base64,SGVsbG8='],
    ['file:///etc/passwd'],
    ['ftp://instagram.com/empresa'],
    ['https://192.168.0.1/instagram'],
    ['https://google.com/search?q=empresa'],
    [`https://instagram.com/${'a'.repeat(3000)}`],
  ])('rejeita "%s" com uma mensagem amigável', (entrada) => {
    const resultado = detectarFonte(entrada);
    expect(resultado.tipo).toBeNull();
    if (!resultado.tipo) {
      expect(resultado.erro).toBeTruthy();
    }
  });
});
