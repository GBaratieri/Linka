import { describe, expect, it } from 'vitest';
import {
  razaoDeContraste,
  corComContrasteMinimo,
  corrigirContraste,
  estiloParaVariaveisCss,
} from '@/lib/site/tema';
import type { EstiloConfig } from '@/lib/schemas/estilo';

describe('razaoDeContraste', () => {
  it('preto sobre branco tem o contraste máximo (21:1)', () => {
    expect(razaoDeContraste('#000000', '#FFFFFF')).toBeCloseTo(21, 0);
  });

  it('uma cor contra ela mesma tem contraste 1:1', () => {
    expect(razaoDeContraste('#336699', '#336699')).toBeCloseTo(1, 5);
  });

  it('é simétrico (não importa a ordem dos argumentos)', () => {
    expect(razaoDeContraste('#222222', '#EEEEEE')).toBeCloseTo(
      razaoDeContraste('#EEEEEE', '#222222'),
      5,
    );
  });
});

describe('corComContrasteMinimo', () => {
  it('mantém a cor quando o contraste já é suficiente', () => {
    expect(corComContrasteMinimo('#000000', '#FFFFFF')).toBe('#000000');
  });

  it('escurece uma cor clara demais contra um fundo claro', () => {
    const corrigida = corComContrasteMinimo('#CCCCCC', '#FFFFFF');
    expect(razaoDeContraste(corrigida, '#FFFFFF')).toBeGreaterThanOrEqual(4.5);
  });

  it('clareia uma cor escura demais contra um fundo escuro', () => {
    const corrigida = corComContrasteMinimo('#222222', '#000000');
    expect(razaoDeContraste(corrigida, '#000000')).toBeGreaterThanOrEqual(4.5);
  });

  it('nunca inverte a direção da cor (uma cor mais clara que o fundo fica mais clara ainda, não escurece)', () => {
    // #999999 já é mais clara que o fundo #4D4D4D — a correção precisa
    // clarear (não escurecer, o que reduziria o contraste ainda mais).
    const corrigida = corComContrasteMinimo('#999999', '#4D4D4D');
    expect(razaoDeContraste(corrigida, '#4D4D4D')).toBeGreaterThanOrEqual(4.5);
  });

  it('não consegue passar de preto/branco puro quando o fundo é cinza médio equidistante', () => {
    // Contra #808080 (luminância ~0.215), nem branco puro alcança 4.5:1
    // (o máximo possível é ~3.95:1) — devolve o melhor esforço (branco),
    // não trava nem lança erro.
    const corrigida = corComContrasteMinimo('#E0E0E0', '#808080');
    expect(corrigida).toBe('#FFFFFF');
  });
});

describe('corrigirContraste', () => {
  it('corrige texto e primária, preservando secundária e fundo', () => {
    const paleta = {
      primaria: '#DDDDDD',
      secundaria: '#336699',
      fundo: '#FFFFFF',
      texto: '#EEEEEE',
    };

    const corrigida = corrigirContraste(paleta);

    expect(corrigida.secundaria).toBe(paleta.secundaria);
    expect(corrigida.fundo).toBe(paleta.fundo);
    expect(razaoDeContraste(corrigida.texto, paleta.fundo)).toBeGreaterThanOrEqual(4.5);
    expect(razaoDeContraste(corrigida.primaria, paleta.fundo)).toBeGreaterThanOrEqual(4.5);
  });

  it('não mexe numa paleta que já tem contraste suficiente', () => {
    const paleta = {
      primaria: '#111111',
      secundaria: '#336699',
      fundo: '#FFFFFF',
      texto: '#000000',
    };

    expect(corrigirContraste(paleta)).toEqual(paleta);
  });
});

describe('estiloParaVariaveisCss', () => {
  it('converte o estilo em variáveis CSS consumíveis pelos componentes', () => {
    const estilo: EstiloConfig = {
      tema: 'claro',
      paleta: { primaria: '#2563EB', secundaria: '#0EA5E9', fundo: '#FFFFFF', texto: '#0F172A' },
      tipografia: { titulos: 'Inter', corpo: 'Inter' },
      tom_de_voz: 'tecnico',
      densidade: 'media',
      raio_borda: 'medio',
      secoes: ['hero', 'contato'],
      destaque_cta: 'whatsapp',
    };

    expect(estiloParaVariaveisCss(estilo)).toEqual({
      '--cor-primaria': '#2563EB',
      '--cor-secundaria': '#0EA5E9',
      '--cor-fundo': '#FFFFFF',
      '--cor-texto': '#0F172A',
      '--fonte-titulos': 'var(--font-inter)',
      '--fonte-corpo': 'var(--font-inter)',
      '--raio-borda': '12px',
      '--espacamento-secao': '1.5rem',
    });
  });
});
