import { describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/supabase/tipos-banco';
import { enviarFotos } from '@/lib/conectores/uploadFotos';

function criarArquivo(nome: string, tipo: string, tamanhoBytes: number): File {
  const conteudo = new Uint8Array(tamanhoBytes);
  return new File([conteudo], nome, { type: tipo });
}

function criarClienteStorageMock(opcoes: { erroUpload?: boolean; falharNaChamada?: number } = {}) {
  const nomesEnviados: string[] = [];
  const chamadasRemove: string[][] = [];
  let chamadasUpload = 0;

  const from = vi.fn(() => ({
    upload: vi.fn(async (nome: string) => {
      chamadasUpload += 1;
      if (opcoes.erroUpload || chamadasUpload === opcoes.falharNaChamada) {
        return { data: null, error: { message: 'falhou' } };
      }
      nomesEnviados.push(nome);
      return { data: { path: nome }, error: null };
    }),
    getPublicUrl: vi.fn((nome: string) => ({
      data: { publicUrl: `https://storage.exemplo.com/${nome}` },
    })),
    remove: vi.fn(async (nomes: string[]) => {
      chamadasRemove.push(nomes);
      return { data: null, error: null };
    }),
  }));

  const cliente = { storage: { from } } as unknown as SupabaseClient<Database>;
  return { cliente, nomesEnviados, chamadasRemove };
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

  it('rejeita o lote inteiro sem enviar nada quando um arquivo é inválido', async () => {
    const { cliente, nomesEnviados } = criarClienteStorageMock();
    const arquivos = [
      criarArquivo('foto1.jpg', 'image/jpeg', 1024),
      criarArquivo('documento.pdf', 'application/pdf', 1024),
    ];

    const resultado = await enviarFotos(cliente, 'empresa-1', arquivos);

    expect(resultado).toEqual({
      sucesso: false,
      erro: 'Formato de imagem não suportado (use JPEG, PNG ou WebP).',
    });
    // Nenhum arquivo é enviado — a validação roda antes de qualquer upload.
    expect(nomesEnviados).toHaveLength(0);
  });

  it('remove as fotos já enviadas do lote quando um upload seguinte falha', async () => {
    const { cliente, nomesEnviados, chamadasRemove } = criarClienteStorageMock({
      falharNaChamada: 2,
    });
    const arquivos = [
      criarArquivo('foto1.jpg', 'image/jpeg', 1024),
      criarArquivo('foto2.jpg', 'image/jpeg', 1024),
    ];

    const resultado = await enviarFotos(cliente, 'empresa-1', arquivos);

    expect(resultado).toEqual({
      sucesso: false,
      erro: 'Não foi possível enviar as fotos. Tente novamente.',
    });
    expect(nomesEnviados).toHaveLength(1);
    expect(chamadasRemove).toEqual([nomesEnviados]);
  });
});
