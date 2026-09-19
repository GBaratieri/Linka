import type { TipoFonteDados, StatusFonteDados } from '@/lib/conectores/tipos';

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
          aceitou_lgpd_em: string | null;
          criado_em: string;
        };
        Insert: {
          id: string;
          nome?: string | null;
          email: string;
          aceitou_lgpd_em?: string | null;
        };
        Update: Partial<{
          nome: string | null;
          email: string;
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
      evento_pesquisa: {
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
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
  };
}
