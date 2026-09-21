'use client';

import { useActionState, useState } from 'react';
import { acaoGerarSite, type EstadoEstilo } from './actions';

const estadoInicial: EstadoEstilo = {};
const CHIPS = ['Moderno', 'Elegante', 'Divertido', 'Minimalista', 'Rústico'];
const LIMITE_CARACTERES = 500;

const CLASSE_INPUT =
  'rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900';
const CLASSE_LABEL = 'text-sm font-medium';

export function FormularioEstilo({ empresaId }: { empresaId: string }) {
  const acaoComId = acaoGerarSite.bind(null, empresaId);
  const [estado, formAction, pendente] = useActionState(acaoComId, estadoInicial);
  const [texto, setTexto] = useState('');

  const adicionarChip = (chip: string) => {
    setTexto((atual) => (atual ? `${atual} ${chip.toLowerCase()}` : chip.toLowerCase()));
  };

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        {CHIPS.map((chip) => (
          <button
            key={chip}
            type="button"
            onClick={() => adicionarChip(chip)}
            className="rounded-full border border-gray-300 px-3 py-1 text-sm dark:border-gray-700"
          >
            {chip}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-1">
        <textarea
          id="texto"
          name="texto"
          rows={4}
          maxLength={LIMITE_CARACTERES}
          value={texto}
          onChange={(evento) => setTexto(evento.target.value)}
          placeholder="Ex.: quero algo moderno, com cores claras e que passe confiança"
          required
          className={CLASSE_INPUT}
        />
        <span className="self-end text-xs text-gray-500">
          {texto.length}/{LIMITE_CARACTERES}
        </span>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="referencia" className={CLASSE_LABEL}>
          Alguma referência visual? (opcional)
        </label>
        <input
          id="referencia"
          name="referencia"
          type="text"
          placeholder="Ex.: gosto do visual do site de tal empresa"
          className={CLASSE_INPUT}
        />
      </div>

      {estado.erro ? <p className="text-sm text-red-600">{estado.erro}</p> : null}

      <button
        type="submit"
        disabled={pendente}
        className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-gray-900"
      >
        {pendente ? 'Gerando...' : 'Gerar meu site'}
      </button>
    </form>
  );
}
