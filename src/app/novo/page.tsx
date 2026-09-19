import type { Metadata } from 'next';
import { FormularioNovo } from './FormularioNovo';

export const metadata: Metadata = {
  title: 'Novo site — SiteLink',
};

export default function NovoPage() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-8 px-6 py-16">
      <div className="flex flex-col gap-2 text-center">
        <h1 className="text-2xl font-semibold">Vamos começar</h1>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Cole o link do Instagram ou do perfil no Google da sua empresa.
        </p>
      </div>
      <FormularioNovo />
    </main>
  );
}
