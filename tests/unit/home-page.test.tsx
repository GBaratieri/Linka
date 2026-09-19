import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import Home from '@/app/page';

describe('Página inicial', () => {
  it('exibe o nome do produto', () => {
    render(<Home />);

    expect(screen.getByRole('heading', { name: 'SiteLink' })).toBeInTheDocument();
  });
});
