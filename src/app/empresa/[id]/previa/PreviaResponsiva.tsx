'use client';

import { useState, type ReactNode } from 'react';

const MODOS = [
  { id: 'desktop', rotulo: 'Computador' },
  { id: 'mobile', rotulo: 'Celular' },
] as const;

// Prévia responsiva dentro do app (seção "Fase 3" do CLAUDE.md) — alterna a
// largura do container, o site em si (children) é o mesmo em ambos os
// modos, só o "viewport" simulado muda.
export function PreviaResponsiva({ children }: { children: ReactNode }) {
  const [modo, setModo] = useState<(typeof MODOS)[number]['id']>('desktop');

  return (
    <div className="flex flex-col items-center gap-4 py-8">
      <div className="flex gap-2 rounded-full border border-gray-300 p-1 dark:border-gray-700">
        {MODOS.map((opcao) => (
          <button
            key={opcao.id}
            type="button"
            onClick={() => setModo(opcao.id)}
            aria-pressed={modo === opcao.id}
            className={`rounded-full px-4 py-1 text-sm font-medium ${
              modo === opcao.id
                ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900'
                : 'text-gray-600 dark:text-gray-400'
            }`}
          >
            {opcao.rotulo}
          </button>
        ))}
      </div>
      <div
        className={
          modo === 'mobile'
            ? 'w-[375px] max-w-full overflow-hidden rounded-lg border border-gray-300 shadow-sm dark:border-gray-700'
            : 'w-full max-w-5xl overflow-hidden rounded-lg border border-gray-300 shadow-sm dark:border-gray-700'
        }
      >
        {children}
      </div>
    </div>
  );
}
