-- Permissões das tabelas. Quem pode ver ou editar cada linha é decidido pelas
-- regras de RLS da migration anterior.

grant select on public.lojas, public.categorias, public.produtos to anon;

grant select, insert, update, delete on public.lojas, public.categorias, public.produtos to authenticated;
grant select, delete on public.loja_usuarios to authenticated;
grant select on public.admins to authenticated;

grant all on public.lojas, public.categorias, public.produtos, public.loja_usuarios, public.admins to service_role;
