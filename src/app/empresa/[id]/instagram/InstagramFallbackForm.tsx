'use client';

import { useActionState } from 'react';
import { salvarFallbackInstagram, type EstadoInstagram } from './actions';

const estadoInicial: EstadoInstagram = {};

const CLASSE_INPUT =
  'rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900';
const CLASSE_LABEL = 'text-sm font-medium';

export function InstagramFallbackForm({
  empresaId,
  fonteId,
  fonteUrl,
}: {
  empresaId: string;
  fonteId: string;
  fonteUrl: string;
}) {
  const salvarComIds = salvarFallbackInstagram.bind(null, empresaId, fonteId, fonteUrl);
  const [estado, formAction, pendente] = useActionState(salvarComIds, estadoInicial);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label className={CLASSE_LABEL} htmlFor="bio">
          Cole a bio do seu Instagram
        </label>
        <textarea id="bio" name="bio" rows={4} className={CLASSE_INPUT} />
      </div>

      <div className="flex flex-col gap-1">
        <label className={CLASSE_LABEL} htmlFor="telefoneOuWhatsapp">
          Telefone ou WhatsApp
        </label>
        <input
          id="telefoneOuWhatsapp"
          name="telefoneOuWhatsapp"
          type="text"
          placeholder="55DDDNÚMERO"
          className={CLASSE_INPUT}
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className={CLASSE_LABEL} htmlFor="fotos">
          Fotos (até 6, JPEG/PNG/WebP, até 5MB cada)
        </label>
        <input
          id="fotos"
          name="fotos"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          className="text-sm"
        />
      </div>

      {estado.erro ? <p className="text-sm text-red-600">{estado.erro}</p> : null}

      <button
        type="submit"
        disabled={pendente}
        className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-gray-900"
      >
        {pendente ? 'Salvando...' : 'Salvar e continuar'}
      </button>
    </form>
  );
}
