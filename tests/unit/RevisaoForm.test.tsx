import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { RevisaoForm, type CampoExtraido } from '@/app/empresa/[id]/revisao/RevisaoForm';

const CAMPOS: CampoExtraido[] = [
  { campo: 'nome', valor: 'Padaria Pão Quente', origem: 'google', confianca: 'alta' },
  { campo: 'segmento', valor: 'alimentacao', origem: 'google', confianca: 'media' },
  { campo: 'contato.telefone', valor: '(11) 3456-7890', origem: 'google', confianca: 'alta' },
  {
    campo: 'horarios',
    valor: [{ dia: 'seg', abre: '06:00', fecha: '20:00' }],
    origem: 'google',
    confianca: 'media',
  },
  { campo: 'prova_social.nota', valor: 4.6, origem: 'google', confianca: 'alta' },
  { campo: 'prova_social.total_avaliacoes', valor: 128, origem: 'google', confianca: 'alta' },
];

describe('RevisaoForm', () => {
  it('mostra os campos extraídos com valor pré-preenchido e selo de confiança', () => {
    render(<RevisaoForm empresaId="empresa-1" campos={CAMPOS} />);

    expect(screen.getByLabelText('Nome da empresa')).toHaveValue('Padaria Pão Quente');
    expect(screen.getByLabelText('Telefone')).toHaveValue('(11) 3456-7890');
    expect(screen.getAllByText('Confiança alta').length).toBeGreaterThan(0);
    expect(screen.getByText('Confiança média')).toBeInTheDocument();
    expect(screen.getByText(/06:00 – 20:00/)).toBeInTheDocument();
    expect(screen.getByText(/4\.6 de 5/)).toBeInTheDocument();
  });

  it('mostra campos vazios sem selo quando não há dado extraído', () => {
    render(<RevisaoForm empresaId="empresa-2" campos={[]} />);

    expect(screen.getByLabelText('Nome da empresa')).toHaveValue('');
    expect(screen.queryByText(/Confiança/)).not.toBeInTheDocument();
  });

  it('exige o checkbox de titularidade para confirmar', () => {
    render(<RevisaoForm empresaId="empresa-1" campos={CAMPOS} />);

    const checkbox = screen.getByLabelText(/Sou dono ou responsável/);
    expect(checkbox).toBeRequired();
  });

  it('exige nome e ramo preenchidos, para não desincronizar empresa.nome/segmento', () => {
    render(<RevisaoForm empresaId="empresa-1" campos={CAMPOS} />);

    expect(screen.getByLabelText('Nome da empresa')).toBeRequired();
    expect(screen.getByLabelText('Ramo')).toBeRequired();
  });

  it('mostra um aviso quando há divergência entre fontes para um campo', () => {
    render(
      <RevisaoForm
        empresaId="empresa-1"
        campos={CAMPOS}
        divergencias={[
          {
            campo: 'contato.telefone',
            valores: [
              { origem: 'google', valor: '(11) 3456-7890' },
              { origem: 'instagram', valor: '(11) 99999-0000' },
            ],
          },
        ]}
      />,
    );

    expect(screen.getByText(/não batem entre as fontes/)).toBeInTheDocument();
    expect(screen.getByText(/Google: \(11\) 3456-7890/)).toBeInTheDocument();
    expect(screen.getByText(/Instagram: \(11\) 99999-0000/)).toBeInTheDocument();
  });

  it('não mostra aviso de divergência quando a lista está vazia', () => {
    render(<RevisaoForm empresaId="empresa-1" campos={CAMPOS} divergencias={[]} />);
    expect(screen.queryByText(/não batem entre as fontes/)).not.toBeInTheDocument();
  });
});
