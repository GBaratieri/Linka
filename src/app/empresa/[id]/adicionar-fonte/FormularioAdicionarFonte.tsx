'use client';

import { useActionState } from 'react';
import { acaoAdicionarLink, acaoAdicionarManual, type EstadoAdicionarFonte } from './actions';

const estadoInicial: EstadoAdicionarFonte = {};

export function FormularioAdicionarFonte({ empresaId }: { empresaId: string }) {
  const acaoLinkComId = acaoAdicionarLink.bind(null, empresaId);
  const acaoManualComId = acaoAdicionarManual.bind(null, empresaId);
  const [estadoLink, formActionLink, pendenteLink] = useActionState(acaoLinkComId, estadoInicial);
  const [estadoManual, formActionManual, pendenteManual] = useActionState(
    acaoManualComId,
    estadoInicial,
  );

  return (
    <div className="flex flex-col gap-6">
      <form action={formActionLink} className="flex flex-col gap-3">
        <label htmlFor="link" className="text-sm font-medium">
          Cole o link da outra fonte (Instagram ou Google)
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
          {pendenteManual ? 'Enviando...' : 'Não tenho link, quero complementar manualmente'}
        </button>
        {estadoManual.erro ? <p className="text-sm text-red-600">{estadoManual.erro}</p> : null}
      </form>
    </div>
  );
}
