-- Garante no banco a regra que o app já assume ("uma empresa só pode ter
-- uma fonte por tipo" — ver lib/conectores/adicionarFonte.ts): sem isso, a
-- checagem "já existe uma fonte desse tipo?" feita antes do insert tem uma
-- corrida (dois envios simultâneos do formulário de adicionar fonte podem
-- passar pela checagem antes de qualquer um dos dois inserir).
alter table public.fonte_dados
  add constraint fonte_dados_empresa_tipo_key unique (empresa_id, tipo);
