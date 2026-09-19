import type { Metadata } from 'next';
import { FormularioCadastro } from './FormularioCadastro';

export const metadata: Metadata = {
  title: 'Criar conta — SiteLink',
};

export default function CadastroPage() {
  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-8 px-6 py-16">
      <h1 className="text-center text-2xl font-semibold">Criar conta</h1>
      <FormularioCadastro />
    </main>
  );
}
