import type { Metadata } from 'next';
import { FormularioLogin } from './FormularioLogin';

export const metadata: Metadata = {
  title: 'Entrar — SiteLink',
};

export default async function LoginPage({ searchParams }: PageProps<'/login'>) {
  const params = await searchParams;
  const cadastroPendente = params.cadastro === 'pendente';

  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-8 px-6 py-16">
      <h1 className="text-center text-2xl font-semibold">Entrar</h1>
      {cadastroPendente ? (
        <p className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
          Conta criada! Verifique seu e-mail para confirmar o cadastro antes de entrar.
        </p>
      ) : null}
      <FormularioLogin />
    </main>
  );
}
