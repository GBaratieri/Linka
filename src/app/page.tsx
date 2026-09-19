import Link from 'next/link';

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 px-6 text-center">
      <h1 className="text-3xl font-semibold sm:text-4xl">SiteLink</h1>
      <p className="max-w-md text-balance text-sm text-gray-600 sm:text-base dark:text-gray-400">
        Gere a landing page da sua microempresa a partir de um único link.
      </p>
      <div className="flex gap-3">
        <Link
          href="/cadastro"
          className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white dark:bg-white dark:text-gray-900"
        >
          Criar conta
        </Link>
        <Link
          href="/login"
          className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium dark:border-gray-700"
        >
          Entrar
        </Link>
      </div>
    </main>
  );
}
