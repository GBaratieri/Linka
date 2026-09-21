import type { CSSProperties } from 'react';
import type { Secao } from '@/lib/schemas/estilo';
import type { DadosSite } from '@/lib/site/tipos';
import { estiloParaVariaveisCss } from '@/lib/site/tema';
import { COMPONENTE_POR_SECAO } from './registro';
import { Rodape } from './Rodape';
import './tema.css';

// Monta o site inteiro a partir das seções já resolvidas (lib/site/templates.ts)
// — cada seção decide sozinha se tem dado suficiente pra aparecer (nunca um
// placeholder falso no lugar). O Rodapé não é uma "seção" ajustável pelo
// estilo, então sempre aparece por último.
export function SiteRenderer({ dados, secoes }: { dados: DadosSite; secoes: Secao[] }) {
  const variaveisCss = estiloParaVariaveisCss(dados.estilo) as CSSProperties;

  return (
    <div className="site-gerado" style={variaveisCss}>
      {secoes.map((secao) => {
        const Componente = COMPONENTE_POR_SECAO[secao];
        return <Componente key={secao} {...dados} />;
      })}
      <Rodape {...dados} />
    </div>
  );
}
