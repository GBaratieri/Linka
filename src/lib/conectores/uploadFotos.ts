import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/supabase/tipos-banco';

const TIPOS_PERMITIDOS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};
const TAMANHO_MAXIMO_BYTES = 5 * 1024 * 1024;
const MAXIMO_FOTOS = 6;
const BUCKET = 'fotos-empresa';

export type ResultadoUpload = { sucesso: true; urls: string[] } | { sucesso: false; erro: string };

// Envia fotos para o Supabase Storage com validação de tipo, tamanho e
// quantidade; o nome do arquivo é sempre gerado pelo servidor (seção 10 do
// CLAUDE.md), nunca o nome original enviado pelo usuário.
export async function enviarFotos(
  supabase: SupabaseClient<Database>,
  empresaId: string,
  arquivos: File[],
): Promise<ResultadoUpload> {
  const comConteudo = arquivos.filter((arquivo) => arquivo.size > 0);

  if (comConteudo.length === 0) {
    return { sucesso: true, urls: [] };
  }

  if (comConteudo.length > MAXIMO_FOTOS) {
    return { sucesso: false, erro: `Envie no máximo ${MAXIMO_FOTOS} fotos.` };
  }

  // Valida tipo e tamanho de todos os arquivos antes de enviar qualquer um —
  // evita subir parte do lote para só depois rejeitar por um arquivo
  // inválido mais adiante.
  for (const arquivo of comConteudo) {
    if (!TIPOS_PERMITIDOS[arquivo.type]) {
      return { sucesso: false, erro: 'Formato de imagem não suportado (use JPEG, PNG ou WebP).' };
    }
    if (arquivo.size > TAMANHO_MAXIMO_BYTES) {
      return { sucesso: false, erro: 'Cada foto deve ter no máximo 5MB.' };
    }
  }

  const nomesEnviados: string[] = [];
  const urls: string[] = [];

  for (const arquivo of comConteudo) {
    const extensao = TIPOS_PERMITIDOS[arquivo.type];
    const nomeArquivo = `${empresaId}/${crypto.randomUUID()}.${extensao}`;
    const { error } = await supabase.storage.from(BUCKET).upload(nomeArquivo, arquivo, {
      contentType: arquivo.type,
      upsert: false,
    });

    if (error) {
      // Um arquivo já enviado neste mesmo lote não deve ficar órfão no
      // Storage só porque um arquivo seguinte falhou.
      if (nomesEnviados.length) {
        await supabase.storage.from(BUCKET).remove(nomesEnviados);
      }
      return { sucesso: false, erro: 'Não foi possível enviar as fotos. Tente novamente.' };
    }

    nomesEnviados.push(nomeArquivo);
    const {
      data: { publicUrl },
    } = supabase.storage.from(BUCKET).getPublicUrl(nomeArquivo);
    urls.push(publicUrl);
  }

  return { sucesso: true, urls };
}
