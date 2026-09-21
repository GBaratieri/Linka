import type { TipoFonteDados, StatusFonteDados, Papel, StatusSite } from '@/lib/conectores/tipos';

type LinhaCompleta<Row, ChavesOpcionaisNaInsercao extends keyof Row> = {
  Row: Row;
  Insert: Omit<Row, ChavesOpcionaisNaInsercao | 'id' | 'criado_em'> &
    Partial<Pick<Row, ChavesOpcionaisNaInsercao>>;
  Update: Partial<Omit<Row, 'id' | 'criado_em'>>;
  Relationships: [];
};

// Tipagem manual, cobrindo só as tabelas usadas pelo código até agora.
// Ideal seria gerar via `supabase gen types typescript`, mas isso requer um
// projeto Supabase real (ver docs/decisoes.md). Ampliar conforme cada fase
// passar a usar novas tabelas do esquema em supabase/migrations/.
export interface Database {
  public: {
    Tables: {
      usuario: {
        Row: {
          id: string;
          nome: string | null;
          email: string;
          papel: Papel;
          aceitou_lgpd_em: string | null;
          criado_em: string;
        };
        Insert: {
          id: string;
          nome?: string | null;
          email: string;
          papel?: Papel;
          aceitou_lgpd_em?: string | null;
        };
        Update: Partial<{
          nome: string | null;
          email: string;
          papel: Papel;
          aceitou_lgpd_em: string | null;
        }>;
        Relationships: [];
      };
      empresa: {
        Row: {
          id: string;
          usuario_id: string;
          nome: string | null;
          segmento: string | null;
          cidade: string | null;
          declaracao_titularidade_em: string | null;
          criado_em: string;
        };
        Insert: {
          usuario_id: string;
          nome?: string | null;
          segmento?: string | null;
          cidade?: string | null;
          declaracao_titularidade_em?: string | null;
        };
        Update: Partial<{
          nome: string | null;
          segmento: string | null;
          cidade: string | null;
          declaracao_titularidade_em: string | null;
        }>;
        Relationships: [];
      };
      fonte_dados: {
        Row: {
          id: string;
          empresa_id: string;
          tipo: TipoFonteDados;
          url: string | null;
          status: StatusFonteDados;
          bruto: unknown;
          coletado_em: string | null;
          criado_em: string;
        };
        Insert: {
          empresa_id: string;
          tipo: TipoFonteDados;
          url?: string | null;
          status?: StatusFonteDados;
          bruto?: unknown;
          coletado_em?: string | null;
        };
        Update: Partial<{
          status: StatusFonteDados;
          bruto: unknown;
          coletado_em: string | null;
        }>;
        Relationships: [];
      };
      campo_extraido: LinhaCompleta<
        {
          id: string;
          empresa_id: string;
          campo: string;
          valor: unknown;
          origem: TipoFonteDados;
          confianca: 'alta' | 'media' | 'baixa';
          confirmado_pelo_usuario: boolean;
          editado_pelo_usuario: boolean;
          criado_em: string;
        },
        'confirmado_pelo_usuario' | 'editado_pelo_usuario'
      >;
      evento_produto: {
        Row: {
          id: string;
          empresa_id: string;
          tipo: string;
          payload: unknown;
          criado_em: string;
        };
        Insert: {
          empresa_id: string;
          tipo: string;
          payload?: unknown;
        };
        Update: Record<string, never>;
        Relationships: [];
      };
      template: {
        Row: {
          id: string;
          segmento: string;
          nome: string;
          componentes: unknown;
          criado_em: string;
        };
        Insert: {
          segmento: string;
          nome: string;
          componentes: unknown;
        };
        Update: Record<string, never>;
        Relationships: [];
      };
      site: LinhaCompleta<
        {
          id: string;
          empresa_id: string;
          subdominio: string | null;
          status: StatusSite;
          publicado_em: string | null;
          criado_em: string;
        },
        'subdominio' | 'status' | 'publicado_em'
      >;
      versao_site: LinhaCompleta<
        {
          id: string;
          site_id: string;
          template_id: string | null;
          estilo_texto: string | null;
          estilo_config: unknown;
          conteudo: unknown;
          nota_qualidade: number | null;
          criado_em: string;
        },
        'template_id' | 'estilo_texto' | 'estilo_config' | 'conteudo' | 'nota_qualidade'
      >;
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
  };
}
