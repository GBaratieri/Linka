import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ManualForm } from '@/app/empresa/[id]/manual/ManualForm';

describe('ManualForm', () => {
  it('renderiza os campos principais do formulário manual', () => {
    render(<ManualForm empresaId="empresa-1" fonteId="fonte-1" />);

    expect(screen.getByLabelText('Nome da empresa')).toBeInTheDocument();
    expect(screen.getByLabelText('Ramo')).toBeInTheDocument();
    expect(screen.getByLabelText('WhatsApp')).toBeInTheDocument();
    expect(screen.getByLabelText('Segunda: horário de abertura')).toBeInTheDocument();
    expect(screen.getByLabelText('Segunda: horário de fechamento')).toBeInTheDocument();
    expect(screen.getByLabelText('Domingo: horário de abertura')).toBeInTheDocument();
    expect(screen.getByLabelText(/Um por linha/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Salvar e continuar/ })).toBeInTheDocument();
  });
});
