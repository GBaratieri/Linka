import type { ComponentType } from 'react';
import type { Secao } from '@/lib/schemas/estilo';
import type { DadosSite } from '@/lib/site/tipos';
import { Hero } from './Hero';
import { Servicos } from './Servicos';
import { ProvaSocial } from './ProvaSocial';
import { Galeria } from './Galeria';
import { Sobre } from './Sobre';
import { Localizacao } from './Localizacao';
import { Contato } from './Contato';
import { FAQ } from './FAQ';

export const COMPONENTE_POR_SECAO: Record<Secao, ComponentType<DadosSite>> = {
  hero: Hero,
  servicos: Servicos,
  prova_social: ProvaSocial,
  galeria: Galeria,
  sobre: Sobre,
  localizacao: Localizacao,
  contato: Contato,
  faq: FAQ,
};
