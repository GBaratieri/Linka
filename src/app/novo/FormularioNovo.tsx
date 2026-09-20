'use client';

import { useActionState } from 'react';
import { acaoLink, acaoManual, type EstadoNovo } from './actions';

const estadoInicial: EstadoNovo = {};

const SUGESTOES = [
  { rotulo: 'Instagram', exemplo: 'https://instagram.com/sua-empresa' },
  { rotulo: 'Google Maps', exemplo: 'https://maps.app.goo.gl/xxxxxxx' },
];

export function FormularioNovo() {
  const [estadoLink, formActionLink, pendenteLink] = useActionState(acaoLink, estadoInicial);
  const [estadoManual, formActionManual, pendenteManual] = useActionState(
    acaoManual,
    estadoInicial,
  );

  return (
    <div className="flex flex-col gap-6">
      <form action={formActionLink} className="flex flex-col gap-3">
        <label htmlFor="link" className="text-sm font-medium">
          Cole o link do Instagram ou do Google da sua empresa
        </label>
        <input
          id="link"
          name="link"
          type="text"
          placeholder="https://instagram.com/sua-empresa"
          autoComplete="off"
          required
          className="rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
        />
        <div className="flex flex-wrap gap-2 text-xs text-gray-500">
          {SUGESTOES.map((sugestao) => (
            <span
              key={sugestao.rotulo}
              className="rounded-full border border-gray-200 px-2 py-1 dark:border-gray-800"
            >
              {sugestao.rotulo}: {sugestao.exemplo}
            </span>
          ))}
        </div>
        {estadoLink.erro ? <p className="text-sm text-red-600">{estadoLink.erro}</p> : null}
        <button
          type="submit"
          disabled={pendenteLink}
          className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-gray-900"
        >
          {pendenteLink ? 'Enviando...' : 'Continuar'}
        </button>
      </form>

      <form action={formActionManual} className="flex flex-col items-center gap-2 text-center">
        <button
          type="submit"
          disabled={pendenteManual}
          className="text-sm text-gray-600 underline underline-offset-2 disabled:opacity-50 dark:text-gray-400"
        >
          {pendenteManual ? 'Enviando...' : 'Não tenho link, quero preencher manualmente'}
        </button>
        {estadoManual.erro ? <p className="text-sm text-red-600">{estadoManual.erro}</p> : null}
      </form>
    </div>
  );
}
