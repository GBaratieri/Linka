import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/supabase/tipos-banco';
import type { FormularioManualInput } from '@/lib/schemas/manual';
import { gravarCampos, sincronizarNomeESegmento, type CampoParaGravar } from './normalizador';

// Formulário manual já é totalmente estruturado pelo usuário — sem AI
// estruturadora aqui, direto para campo_extraido com confiança máxima. Usa
// gravarCampos (upsert por origem, ver normalizador.ts) em vez de inserir
// direto, para não duplicar linhas se o usuário reenviar o formulário
// (duplo clique, "voltar" do navegador etc.) — a constraint única do banco
// faz a gravação ser idempotente por (empresa_id, campo, origem).
//
// Nota: se o usuário já editou um campo na revisão (origem 'manual',
// editado_pelo_usuario=true) e depois complementa a empresa com uma segunda
// fonte manual (ver adicionarFonte.ts), esta função grava no mesmo slot
// origem='manual' e o valor mais recente vence — é a mesma regra de
// "a ação mais recente do usuário é a que vale" que já se aplica a duas
// edições seguidas na própria revisão, não um caso especial.
export async function gravarDadosManual(
  supabase: SupabaseClient<Database>,
  empresaId: string,
  fonteId: string,
  dados: FormularioManualInput,
  fotos: string[],
): Promise<void> {
  const campos: CampoParaGravar[] = [
    { caminho: 'nome', valor: dados.nome, fonte: 'manual', confianca: 'alta' },
    { caminho: 'segmento', valor: dados.segmento, fonte: 'manual', confianca: 'alta' },
  ];

  if (dados.descricao) {
    campos.push({ caminho: 'descricao_curta', valor: dados.descricao, fonte: 'manual', confianca: 'alta' });
  }
  if (dados.telefone) {
    campos.push({ caminho: 'contato.telefone', valor: dados.telefone, fonte: 'manual', confianca: 'alta' });
  }
  if (dados.whatsapp) {
    campos.push({ caminho: 'contato.whatsapp', valor: dados.whatsapp, fonte: 'manual', confianca: 'alta' });
  }
  if (dados.email) {
    campos.push({ caminho: 'contato.email', valor: dados.email, fonte: 'manual', confianca: 'alta' });
  }
  if (dados.instagram) {
    campos.push({ caminho: 'contato.instagram', valor: dados.instagram, fonte: 'manual', confianca: 'alta' });
  }
  if (dados.site) {
    campos.push({ caminho: 'contato.site', valor: dados.site, fonte: 'manual', confianca: 'alta' });
  }
  if (dados.endereco) {
    campos.push({ caminho: 'endereco.texto', valor: dados.endereco, fonte: 'manual', confianca: 'alta' });
  }

  const horariosPreenchidos = dados.horarios.filter((horario) => horario.abre && horario.fecha);
  if (horariosPreenchidos.length) {
    campos.push({ caminho: 'horarios', valor: horariosPreenchidos, fonte: 'manual', confianca: 'alta' });
  }

  const servicos = (dados.servicos ?? '')
    .split('\n')
    .map((linha) => linha.trim())
    .filter(Boolean)
    .map((nome) => ({ nome, descricao: null }));
  if (servicos.length) {
    campos.push({ caminho: 'servicos', valor: servicos, fonte: 'manual', confianca: 'alta' });
  }

  if (fotos.length) {
    campos.push({ caminho: 'midia.fotos', valor: fotos, fonte: 'manual', confianca: 'alta' });
  }

  await gravarCampos(supabase, empresaId, campos);
  await sincronizarNomeESegmento(supabase, empresaId);

  await supabase
    .from('fonte_dados')
    .update({ status: 'ok', coletado_em: new Date().toISOString() })
    .eq('id', fonteId);
}
