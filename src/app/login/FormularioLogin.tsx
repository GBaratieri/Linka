'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { entrar, type EstadoLogin } from './actions';

const estadoInicial: EstadoLogin = {};

export function FormularioLogin() {
  const [estado, formAction, pendente] = useActionState(entrar, estadoInicial);

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <label htmlFor="email" className="text-sm font-medium">
        E-mail
      </label>
      <input
        id="email"
        name="email"
        type="email"
        required
        className="rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
      />

      <label htmlFor="senha" className="text-sm font-medium">
        Senha
      </label>
      <input
        id="senha"
        name="senha"
        type="password"
        required
        className="rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
      />

      {estado.erro ? <p className="text-sm text-red-600">{estado.erro}</p> : null}

      <button
        type="submit"
        disabled={pendente}
        className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-gray-900"
      >
        {pendente ? 'Entrando...' : 'Entrar'}
      </button>

      <p className="text-center text-sm text-gray-600 dark:text-gray-400">
        Ainda não tem conta?{' '}
        <Link href="/cadastro" className="underline underline-offset-2">
          Cadastre-se
        </Link>
      </p>
    </form>
  );
}
