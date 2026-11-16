-- e-mail de quem tem acesso, para listar no painel
alter table public.loja_usuarios add column email text not null default '';
