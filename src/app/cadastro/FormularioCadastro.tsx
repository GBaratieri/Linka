'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { cadastrar, type EstadoCadastro } from './actions';

const estadoInicial: EstadoCadastro = {};

export function FormularioCadastro() {
  const [estado, formAction, pendente] = useActionState(cadastrar, estadoInicial);

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <label htmlFor="nome" className="text-sm font-medium">
        Nome
      </label>
      <input
        id="nome"
        name="nome"
        type="text"
        required
        className="rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
      />

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
        minLength={8}
        required
        className="rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
      />

      <label className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
        <input id="aceitouLgpd" name="aceitouLgpd" type="checkbox" required className="mt-1" />
        <span>
          Li e aceito a{' '}
          <Link href="/privacidade" className="underline underline-offset-2" target="_blank">
            política de privacidade
          </Link>{' '}
          e o tratamento dos meus dados conforme a LGPD.
        </span>
      </label>

      {estado.erro ? <p className="text-sm text-red-600">{estado.erro}</p> : null}

      <button
        type="submit"
        disabled={pendente}
        className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-gray-900"
      >
        {pendente ? 'Criando conta...' : 'Criar conta'}
      </button>

      <p className="text-center text-sm text-gray-600 dark:text-gray-400">
        Já tem conta?{' '}
        <Link href="/login" className="underline underline-offset-2">
          Entrar
        </Link>
      </p>
    </form>
  );
}
