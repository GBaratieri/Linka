import type { DadosSite } from '@/lib/site/tipos';

const ROTULO_DIA: Record<string, string> = {
  seg: 'Segunda',
  ter: 'Terça',
  qua: 'Quarta',
  qui: 'Quinta',
  sex: 'Sexta',
  sab: 'Sábado',
  dom: 'Domingo',
};

// Sem endereço nem horário nos dados = seção omitida — link para o mapa
// (sem embed obrigatório, seção "Fase 3" do CLAUDE.md) só aparece quando há
// endereço de verdade.
export function Localizacao({ empresa }: DadosSite) {
  const temEndereco = Boolean(empresa.endereco.texto);
  const temHorario = empresa.horarios.length > 0;
  if (!temEndereco && !temHorario) return null;

  return (
    <section className="site-secao">
      <div className="mx-auto flex max-w-2xl flex-col items-center gap-4 text-center">
        <h2 className="text-2xl font-bold sm:text-3xl">Localização e horários</h2>
        {empresa.endereco.texto ? (
          <div className="flex flex-col items-center gap-1">
            <p className="opacity-80">{empresa.endereco.texto}</p>
            <a
              href={`https://www.google.com/maps/search/${encodeURIComponent(empresa.endereco.texto)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-medium underline underline-offset-2"
            >
              Ver no mapa
            </a>
          </div>
        ) : null}
        {temHorario ? (
          <ul className="text-sm opacity-80">
            {empresa.horarios.map((horario, indice) => (
              <li key={`${horario.dia}-${indice}`}>
                {ROTULO_DIA[horario.dia] ?? horario.dia}: {horario.abre} – {horario.fecha}
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </section>
  );
}
