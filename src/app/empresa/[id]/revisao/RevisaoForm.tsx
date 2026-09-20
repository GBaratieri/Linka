'use client';

import { useActionState } from 'react';
import { confirmarRevisao, type EstadoRevisao } from './actions';

const estadoInicial: EstadoRevisao = {};

export interface CampoExtraido {
  campo: string;
  valor: unknown;
  origem: string;
  confianca: 'alta' | 'media' | 'baixa';
}

const CLASSE_INPUT =
  'rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900';
const CLASSE_LABEL = 'text-sm font-medium';

const CAMPOS_FORMULARIO: Array<{
  campo: string;
  rotulo: string;
  tipo: 'texto' | 'select' | 'textarea';
}> = [
  { campo: 'nome', rotulo: 'Nome da empresa', tipo: 'texto' },
  { campo: 'segmento', rotulo: 'Ramo', tipo: 'select' },
  { campo: 'descricao_curta', rotulo: 'Descrição curta', tipo: 'textarea' },
  { campo: 'contato.telefone', rotulo: 'Telefone', tipo: 'texto' },
  { campo: 'contato.whatsapp', rotulo: 'WhatsApp', tipo: 'texto' },
  { campo: 'contato.email', rotulo: 'E-mail', tipo: 'texto' },
  { campo: 'contato.instagram', rotulo: 'Instagram', tipo: 'texto' },
  { campo: 'contato.site', rotulo: 'Site', tipo: 'texto' },
  { campo: 'endereco.texto', rotulo: 'Endereço', tipo: 'texto' },
];

const CORES_CONFIANCA: Record<CampoExtraido['confianca'], string> = {
  alta: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  media: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
  baixa: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
};

const RUTULO_CONFIANCA: Record<CampoExtraido['confianca'], string> = {
  alta: 'Confiança alta',
  media: 'Confiança média',
  baixa: 'Confiança baixa — confira',
};

function SeloConfianca({ confianca }: { confianca: CampoExtraido['confianca'] }) {
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${CORES_CONFIANCA[confianca]}`}>
      {RUTULO_CONFIANCA[confianca]}
    </span>
  );
}

function CampoSomenteLeitura({ rotulo, children }: { rotulo: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1 rounded-md border border-gray-200 p-3 text-sm dark:border-gray-800">
      <span className="font-medium">{rotulo}</span>
      {children}
    </div>
  );
}

export function RevisaoForm({ empresaId, campos }: { empresaId: string; campos: CampoExtraido[] }) {
  const confirmarComId = confirmarRevisao.bind(null, empresaId);
  const [estado, formAction, pendente] = useActionState(confirmarComId, estadoInicial);

  const porCampo = new Map(campos.map((linha) => [linha.campo, linha]));
  const horarios = porCampo.get('horarios')?.valor as
    Array<{ dia: string; abre: string; fecha: string }> | undefined;
  const servicos = porCampo.get('servicos')?.valor as Array<{ nome: string }> | undefined;
  const fotos = porCampo.get('midia.fotos')?.valor as string[] | undefined;
  const nota = porCampo.get('prova_social.nota')?.valor as number | undefined;
  const totalAvaliacoes = porCampo.get('prova_social.total_avaliacoes')?.valor as
    number | undefined;

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <div className="flex flex-col gap-4">
        {CAMPOS_FORMULARIO.map(({ campo, rotulo, tipo }) => {
          const linha = porCampo.get(campo);
          const valor = typeof linha?.valor === 'string' ? linha.valor : '';

          return (
            <div key={campo} className="flex flex-col gap-1">
              <div className="flex items-center justify-between gap-2">
                <label className={CLASSE_LABEL} htmlFor={campo}>
                  {rotulo}
                </label>
                {linha ? <SeloConfianca confianca={linha.confianca} /> : null}
              </div>

              {tipo === 'select' ? (
                <select id={campo} name={campo} defaultValue={valor} className={CLASSE_INPUT}>
                  <option value="">Selecione...</option>
                  <option value="servicos">Serviços</option>
                  <option value="comercio">Comércio</option>
                  <option value="alimentacao">Alimentação</option>
                  <option value="outro">Outro</option>
                </select>
              ) : tipo === 'textarea' ? (
                <textarea
                  id={campo}
                  name={campo}
                  rows={3}
                  defaultValue={valor}
                  className={CLASSE_INPUT}
                />
              ) : (
                <input
                  id={campo}
                  name={campo}
                  type="text"
                  defaultValue={valor}
                  className={CLASSE_INPUT}
                />
              )}
            </div>
          );
        })}
      </div>

      {horarios?.length || servicos?.length || fotos?.length || nota !== undefined ? (
        <div className="flex flex-col gap-3">
          <h2 className="text-base font-semibold">Outras informações encontradas</h2>

          {horarios?.length ? (
            <CampoSomenteLeitura rotulo="Horário de funcionamento">
              <ul className="text-gray-600 dark:text-gray-400">
                {horarios.map((horario) => (
                  <li key={horario.dia}>
                    {horario.dia}: {horario.abre} – {horario.fecha}
                  </li>
                ))}
              </ul>
            </CampoSomenteLeitura>
          ) : null}

          {servicos?.length ? (
            <CampoSomenteLeitura rotulo="Serviços">
              <p className="text-gray-600 dark:text-gray-400">
                {servicos.map((servico) => servico.nome).join(', ')}
              </p>
            </CampoSomenteLeitura>
          ) : null}

          {fotos?.length ? (
            <CampoSomenteLeitura rotulo={`Fotos (${fotos.length})`}>
              <div className="flex flex-wrap gap-2">
                {fotos.map((foto) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={foto} src={foto} alt="" className="h-16 w-16 rounded object-cover" />
                ))}
              </div>
            </CampoSomenteLeitura>
          ) : null}

          {nota !== undefined ? (
            <CampoSomenteLeitura rotulo="Avaliação no Google">
              <p className="text-gray-600 dark:text-gray-400">
                {nota} de 5 ({totalAvaliacoes ?? 0} avaliações)
              </p>
            </CampoSomenteLeitura>
          ) : null}
        </div>
      ) : null}

      <label className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
        <input id="titularidade" name="titularidade" type="checkbox" required className="mt-1" />
        <span>Sou dono ou responsável por este negócio.</span>
      </label>

      {estado.erro ? <p className="text-sm text-red-600">{estado.erro}</p> : null}

      <button
        type="submit"
        disabled={pendente}
        className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-gray-900"
      >
        {pendente ? 'Confirmando...' : 'Confirmar dados'}
      </button>
    </form>
  );
}
