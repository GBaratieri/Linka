'use client';

import { useActionState } from 'react';
import { salvarManual, type EstadoManual } from './actions';

const estadoInicial: EstadoManual = {};

const DIAS = [
  { chave: 'seg', rotulo: 'Segunda' },
  { chave: 'ter', rotulo: 'Terça' },
  { chave: 'qua', rotulo: 'Quarta' },
  { chave: 'qui', rotulo: 'Quinta' },
  { chave: 'sex', rotulo: 'Sexta' },
  { chave: 'sab', rotulo: 'Sábado' },
  { chave: 'dom', rotulo: 'Domingo' },
] as const;

const CLASSE_INPUT =
  'rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900';
const CLASSE_LABEL = 'text-sm font-medium';

export function ManualForm({ empresaId, fonteId }: { empresaId: string; fonteId: string }) {
  const salvarComIds = salvarManual.bind(null, empresaId, fonteId);
  const [estado, formAction, pendente] = useActionState(salvarComIds, estadoInicial);

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <fieldset className="flex flex-col gap-3">
        <legend className="mb-1 text-base font-semibold">Dados básicos</legend>

        <label className={CLASSE_LABEL} htmlFor="nome">
          Nome da empresa
        </label>
        <input id="nome" name="nome" type="text" required className={CLASSE_INPUT} />

        <label className={CLASSE_LABEL} htmlFor="segmento">
          Ramo
        </label>
        <select id="segmento" name="segmento" required className={CLASSE_INPUT} defaultValue="">
          <option value="" disabled>
            Selecione...
          </option>
          <option value="servicos">Serviços</option>
          <option value="comercio">Comércio</option>
          <option value="alimentacao">Alimentação</option>
          <option value="outro">Outro</option>
        </select>

        <label className={CLASSE_LABEL} htmlFor="descricao">
          Descrição curta
        </label>
        <textarea id="descricao" name="descricao" rows={3} className={CLASSE_INPUT} />
      </fieldset>

      <fieldset className="flex flex-col gap-3">
        <legend className="mb-1 text-base font-semibold">Contato</legend>

        <label className={CLASSE_LABEL} htmlFor="telefone">
          Telefone
        </label>
        <input id="telefone" name="telefone" type="text" className={CLASSE_INPUT} />

        <label className={CLASSE_LABEL} htmlFor="whatsapp">
          WhatsApp
        </label>
        <input
          id="whatsapp"
          name="whatsapp"
          type="text"
          placeholder="55DDDNÚMERO"
          className={CLASSE_INPUT}
        />

        <label className={CLASSE_LABEL} htmlFor="email">
          E-mail
        </label>
        <input id="email" name="email" type="email" className={CLASSE_INPUT} />

        <label className={CLASSE_LABEL} htmlFor="instagram">
          Instagram
        </label>
        <input
          id="instagram"
          name="instagram"
          type="text"
          placeholder="@sua_empresa"
          className={CLASSE_INPUT}
        />

        <label className={CLASSE_LABEL} htmlFor="site">
          Site
        </label>
        <input id="site" name="site" type="text" className={CLASSE_INPUT} />

        <label className={CLASSE_LABEL} htmlFor="endereco">
          Endereço
        </label>
        <input id="endereco" name="endereco" type="text" className={CLASSE_INPUT} />
      </fieldset>

      <fieldset className="flex flex-col gap-3">
        <legend className="mb-1 text-base font-semibold">Horário de funcionamento</legend>
        <p className="text-xs text-gray-500">Deixe em branco os dias em que não funciona.</p>
        <div className="flex flex-col gap-2">
          {DIAS.map((dia) => (
            <div key={dia.chave} className="grid grid-cols-3 items-center gap-2">
              <span className="text-sm">{dia.rotulo}</span>
              <input
                name={`abre_${dia.chave}`}
                type="time"
                aria-label={`${dia.rotulo}: horário de abertura`}
                className={CLASSE_INPUT}
              />
              <input
                name={`fecha_${dia.chave}`}
                type="time"
                aria-label={`${dia.rotulo}: horário de fechamento`}
                className={CLASSE_INPUT}
              />
            </div>
          ))}
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-3">
        <legend className="mb-1 text-base font-semibold">Serviços</legend>
        <label className={CLASSE_LABEL} htmlFor="servicos">
          Um por linha
        </label>
        <textarea
          id="servicos"
          name="servicos"
          rows={4}
          placeholder={'Corte de cabelo\nManicure\nDepilação'}
          className={CLASSE_INPUT}
        />
      </fieldset>

      <fieldset className="flex flex-col gap-3">
        <legend className="mb-1 text-base font-semibold">Fotos</legend>
        <label className={CLASSE_LABEL} htmlFor="fotos">
          Até 6 fotos (JPEG, PNG ou WebP, até 5MB cada)
        </label>
        <input
          id="fotos"
          name="fotos"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          className="text-sm"
        />
      </fieldset>

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
