// Campos escalares editáveis na tela de revisão (ver docs/decisoes.md,
// "Edição inline limitada a campos escalares") — uma lista só,
// compartilhada entre o formulário (RevisaoForm.tsx, que usa
// rotulo/tipo pra desenhar cada campo) e a action que grava as edições
// (actions.ts, que só precisa do nome de cada campo). Não pode morar em
// actions.ts: um arquivo com 'use server' só pode exportar funções async.
export const CAMPOS_EDITAVEIS: Array<{
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
