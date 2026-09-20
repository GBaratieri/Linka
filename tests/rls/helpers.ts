import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/supabase/tipos-banco';

// Chaves padrão do Supabase local (`supabase start`) — não são segredo: são
// as mesmas chaves de desenvolvimento documentadas publicamente pelo
// Supabase para qualquer instância local com a configuração padrão (mesmo
// JWT_SECRET fixo em toda instância local). Podem ser sobrescritas por
// variáveis de ambiente se a config local mudar.
const URL_PADRAO = 'http://127.0.0.1:54321';
const ANON_KEY_PADRAO =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';
const SERVICE_ROLE_KEY_PADRAO =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

const url = process.env.SUPABASE_LOCAL_URL ?? URL_PADRAO;
const anonKey = process.env.SUPABASE_LOCAL_ANON_KEY ?? ANON_KEY_PADRAO;
const serviceRoleKey = process.env.SUPABASE_LOCAL_SERVICE_ROLE_KEY ?? SERVICE_ROLE_KEY_PADRAO;

const opcoesCliente = { auth: { autoRefreshToken: false, persistSession: false } };

// Cliente com service role: usado só para preparar/limpar o cenário de
// teste (criar e apagar usuários), nunca para as asserções de RLS em si —
// service role ignora RLS por definição.
export function clienteServiceRole(): SupabaseClient<Database> {
  return createClient<Database>(url, serviceRoleKey, opcoesCliente);
}

export interface UsuarioDeTeste {
  id: string;
  email: string;
  cliente: SupabaseClient<Database>;
}

// Cria um usuário confirmado pela API admin e devolve um cliente já
// autenticado como ele (chave anon + sessão própria) — é esse cliente,
// sujeito a RLS como qualquer usuário real, que os testes usam para
// verificar isolamento entre contas.
export async function criarUsuarioDeTeste(prefixo: string): Promise<UsuarioDeTeste> {
  const admin = clienteServiceRole();
  const email = `${prefixo}-${crypto.randomUUID()}@teste.linka.local`;
  const senha = 'senha-de-teste-123456';

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: senha,
    email_confirm: true,
  });
  if (error || !data.user) {
    throw new Error(`Falha ao criar usuário de teste: ${error?.message}`);
  }

  const cliente = createClient<Database>(url, anonKey, opcoesCliente);
  const { error: erroLogin } = await cliente.auth.signInWithPassword({ email, password: senha });
  if (erroLogin) {
    throw new Error(`Falha ao autenticar usuário de teste: ${erroLogin.message}`);
  }

  return { id: data.user.id, email, cliente };
}

// Apaga o usuário de teste — cascade (seção 5 do CLAUDE.md) cuida de
// empresa/fonte_dados/campo_extraido/evento_produto/site/etc.
export async function removerUsuarioDeTeste(id: string): Promise<void> {
  await clienteServiceRole().auth.admin.deleteUser(id);
}
