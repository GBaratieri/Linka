import { describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/supabase/tipos-banco';
import { enviarFotos } from '@/lib/conectores/uploadFotos';

function criarArquivo(nome: string, tipo: string, tamanhoBytes: number): File {
  const conteudo = new Uint8Array(tamanhoBytes);
  return new File([conteudo], nome, { type: tipo });
}

function criarClienteStorageMock(opcoes: { erroUpload?: boolean } = {}) {
  const nomesEnviados: string[] = [];

  const from = vi.fn(() => ({
    upload: vi.fn(async (nome: string) => {
      nomesEnviados.push(nome);
      if (opcoes.erroUpload) {
        return { data: null, error: { message: 'falhou' } };
      }
      return { data: { path: nome }, error: null };
    }),
    getPublicUrl: vi.fn((nome: string) => ({
      data: { publicUrl: `https://storage.exemplo.com/${nome}` },
    })),
  }));

  const cliente = { storage: { from } } as unknown as SupabaseClient<Database>;
  return { cliente, nomesEnviados };
}

describe('enviarFotos', () => {
  it('não faz nada quando não há arquivos', async () => {
    const { cliente } = criarClienteStorageMock();
    const resultado = await enviarFotos(cliente, 'empresa-1', []);
    expect(resultado).toEqual({ sucesso: true, urls: [] });
  });

  it('ignora um input de arquivo vazio (nenhum arquivo selecionado)', async () => {
    const { cliente } = criarClienteStorageMock();
    const resultado = await enviarFotos(cliente, 'empresa-1', [
      criarArquivo('', 'application/octet-stream', 0),
    ]);
    expect(resultado).toEqual({ sucesso: true, urls: [] });
  });

  it('envia fotos válidas e devolve as URLs públicas', async () => {
    const { cliente, nomesEnviados } = criarClienteStorageMock();
    const arquivos = [criarArquivo('foto.jpg', 'image/jpeg', 1024)];

    const resultado = await enviarFotos(cliente, 'empresa-1', arquivos);

    expect(resultado.sucesso).toBe(true);
    if (resultado.sucesso) {
      expect(resultado.urls).toHaveLength(1);
      expect(resultado.urls[0]).toMatch(/^https:\/\/storage\.exemplo\.com\/empresa-1\//);
    }
    expect(nomesEnviados[0]).toMatch(/^empresa-1\/.+\.jpg$/);
  });

  it('rejeita um tipo de arquivo não suportado', async () => {
    const { cliente } = criarClienteStorageMock();
    const resultado = await enviarFotos(cliente, 'empresa-1', [
      criarArquivo('documento.pdf', 'application/pdf', 1024),
    ]);
    expect(resultado).toEqual({
      sucesso: false,
      erro: 'Formato de imagem não suportado (use JPEG, PNG ou WebP).',
    });
  });

  it('rejeita um arquivo maior que 5MB', async () => {
    const { cliente } = criarClienteStorageMock();
    const resultado = await enviarFotos(cliente, 'empresa-1', [
      criarArquivo('foto.jpg', 'image/jpeg', 6 * 1024 * 1024),
    ]);
    expect(resultado).toEqual({ sucesso: false, erro: 'Cada foto deve ter no máximo 5MB.' });
  });

  it('rejeita mais de 6 fotos', async () => {
    const { cliente } = criarClienteStorageMock();
    const arquivos = Array.from({ length: 7 }, (_, i) =>
      criarArquivo(`foto${i}.jpg`, 'image/jpeg', 1024),
    );
    const resultado = await enviarFotos(cliente, 'empresa-1', arquivos);
    expect(resultado).toEqual({ sucesso: false, erro: 'Envie no máximo 6 fotos.' });
  });

  it('retorna um erro amigável quando o upload falha', async () => {
    const { cliente } = criarClienteStorageMock({ erroUpload: true });
    const resultado = await enviarFotos(cliente, 'empresa-1', [
      criarArquivo('foto.jpg', 'image/jpeg', 1024),
    ]);
    expect(resultado).toEqual({
      sucesso: false,
      erro: 'Não foi possível enviar as fotos. Tente novamente.',
    });
  });
});
