-- ============================================================
--  Cardápio online (SaaS): lojas, categorias, produtos e acessos
-- ============================================================

-- funções internas ficam fora do schema exposto pela API
create schema if not exists privado;
grant usage on schema privado to anon, authenticated, service_role;

-- ---------- lojas ----------

create table public.lojas (
    id uuid primary key default gen_random_uuid(),
    slug text not null unique
        check (char_length(slug) between 3 and 40 and slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
    nome text not null check (char_length(nome) between 1 and 80),
    slogan text not null default '' check (char_length(slogan) <= 80),
    descricao_bio text not null default '' check (char_length(descricao_bio) <= 300),
    logo_url text not null default '' check (logo_url = '' or logo_url ~ '^(https://|\./)'),

    cor_primaria text not null default '#ffbf00' check (cor_primaria ~ '^#[0-9a-fA-F]{6}$'),
    cor_secundaria text not null default '#fff2cc' check (cor_secundaria ~ '^#[0-9a-fA-F]{6}$'),
    cor_fundo text not null default '#fffdf7' check (cor_fundo ~ '^#[0-9a-fA-F]{6}$'),

    whatsapp text not null default '' check (whatsapp ~ '^[0-9]{0,15}$'),
    telefone_exibicao text not null default '' check (char_length(telefone_exibicao) <= 30),
    instagram text not null default '' check (instagram = '' or instagram ~ '^https?://'),
    facebook text not null default '' check (facebook = '' or facebook ~ '^https?://'),
    endereco text not null default '' check (char_length(endereco) <= 200),
    link_mapa text not null default '' check (link_mapa = '' or link_mapa ~ '^https?://'),
    url_site text not null default '' check (url_site = '' or url_site ~ '^https?://'),

    aceita_retirada boolean not null default true,
    aceita_entrega boolean not null default true,
    aceita_mesa boolean not null default true,
    quantidade_mesas integer not null default 10 check (quantidade_mesas between 0 and 500),
    -- null = taxa "a combinar"
    taxa_entrega numeric(10, 2) default 0 check (taxa_entrega >= 0),

    pix_chave text not null default '' check (char_length(pix_chave) <= 77),
    pix_nome text not null default '' check (char_length(pix_nome) <= 60),
    pix_cidade text not null default '' check (char_length(pix_cidade) <= 40),
    link_cartao text not null default '' check (link_cartao = '' or link_cartao ~ '^https?://'),
    pagar_pix boolean not null default true,
    pagar_cartao boolean not null default true,
    pagar_dinheiro boolean not null default true,

    -- textos da página inicial, depoimentos e botões extras da bio
    site jsonb not null default '{}'::jsonb check (jsonb_typeof(site) = 'object'),
    depoimentos jsonb not null default '[]'::jsonb check (jsonb_typeof(depoimentos) = 'array'),
    links_bio jsonb not null default '[]'::jsonb check (jsonb_typeof(links_bio) = 'array'),

    ativa boolean not null default true,
    criado_em timestamptz not null default now(),
    atualizado_em timestamptz not null default now()
);

-- ---------- categorias e produtos ----------

create table public.categorias (
    id uuid primary key default gen_random_uuid(),
    loja_id uuid not null references public.lojas (id) on delete cascade,
    nome text not null check (char_length(nome) between 1 and 60),
    icone text not null default 'fas fa-utensils' check (icone ~ '^[a-z0-9 -]{0,60}$'),
    ordem integer not null default 0,
    ativa boolean not null default true,
    criado_em timestamptz not null default now(),
    unique (id, loja_id)
);

create index categorias_loja_ordem_idx on public.categorias (loja_id, ordem);

create table public.produtos (
    id uuid primary key default gen_random_uuid(),
    loja_id uuid not null references public.lojas (id) on delete cascade,
    categoria_id uuid not null,
    nome text not null check (char_length(nome) between 1 and 100),
    descricao text not null default '' check (char_length(descricao) <= 500),
    preco numeric(10, 2) not null check (preco >= 0),
    imagem_url text not null default '' check (imagem_url = '' or imagem_url ~ '^(https://|\./)'),
    ordem integer not null default 0,
    ativo boolean not null default true,
    criado_em timestamptz not null default now(),
    -- garante que o produto e a categoria são da mesma loja
    foreign key (categoria_id, loja_id) references public.categorias (id, loja_id) on delete cascade
);

create index produtos_categoria_ordem_idx on public.produtos (categoria_id, ordem);
create index produtos_loja_idx on public.produtos (loja_id);

-- ---------- acessos ----------

-- donos (e funcionários) de cada loja
create table public.loja_usuarios (
    loja_id uuid not null references public.lojas (id) on delete cascade,
    user_id uuid not null references auth.users (id) on delete cascade,
    criado_em timestamptz not null default now(),
    primary key (loja_id, user_id)
);

create index loja_usuarios_user_idx on public.loja_usuarios (user_id);

-- administradores da plataforma (DuoTech)
create table public.admins (
    user_id uuid primary key references auth.users (id) on delete cascade,
    criado_em timestamptz not null default now()
);

-- e-mails que viram administradores ao criar a conta
create table privado.admins_pendentes (
    email text primary key
);

-- ---------- funções de permissão ----------

create function privado.eh_admin()
returns boolean
language sql stable security definer
set search_path = ''
as $$
    select exists (select 1 from public.admins where user_id = (select auth.uid()));
$$;

create function privado.eh_membro(p_loja uuid)
returns boolean
language sql stable security definer
set search_path = ''
as $$
    select exists (
        select 1 from public.loja_usuarios
        where loja_id = p_loja and user_id = (select auth.uid())
    );
$$;

create function privado.pode_editar(p_loja uuid)
returns boolean
language sql stable security definer
set search_path = ''
as $$
    select privado.eh_admin() or privado.eh_membro(p_loja);
$$;

-- usado nas fotos: a primeira pasta do arquivo é o id da loja
create function privado.pode_editar_pasta(p_pasta text)
returns boolean
language sql stable security definer
set search_path = ''
as $$
    select case
        when p_pasta ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
            then privado.pode_editar(p_pasta::uuid)
        else false
    end;
$$;

revoke all on function privado.eh_admin() from public;
revoke all on function privado.eh_membro(uuid) from public;
revoke all on function privado.pode_editar(uuid) from public;
revoke all on function privado.pode_editar_pasta(text) from public;
grant execute on function privado.eh_admin() to anon, authenticated;
grant execute on function privado.eh_membro(uuid) to anon, authenticated;
grant execute on function privado.pode_editar(uuid) to anon, authenticated;
grant execute on function privado.pode_editar_pasta(text) to anon, authenticated;

-- só administradores mudam o endereço (slug) e ativam/desativam a loja
create function privado.proteger_loja()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
begin
    if (select auth.uid()) is not null and not privado.eh_admin() then
        new.slug := old.slug;
        new.ativa := old.ativa;
    end if;

    new.atualizado_em := now();
    return new;
end;
$$;

create trigger proteger_loja
before update on public.lojas
for each row execute function privado.proteger_loja();

-- promove a administrador quem está em admins_pendentes
create function privado.promover_admin()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
begin
    if new.email_confirmed_at is not null
       and exists (select 1 from privado.admins_pendentes p where lower(p.email) = lower(new.email)) then
        insert into public.admins (user_id) values (new.id) on conflict do nothing;
    end if;

    return new;
end;
$$;

create trigger promover_admin
after insert or update of email_confirmed_at on auth.users
for each row execute function privado.promover_admin();

-- usado pela função "criar-acesso" (somente com a chave de serviço)
create function public.usuario_por_email(p_email text)
returns uuid
language sql stable security definer
set search_path = ''
as $$
    select id from auth.users where lower(email) = lower(p_email) limit 1;
$$;

revoke all on function public.usuario_por_email(text) from public, anon, authenticated;
grant execute on function public.usuario_por_email(text) to service_role;

-- ---------- segurança por linha (RLS) ----------

alter table public.lojas enable row level security;
alter table public.categorias enable row level security;
alter table public.produtos enable row level security;
alter table public.loja_usuarios enable row level security;
alter table public.admins enable row level security;
alter table privado.admins_pendentes enable row level security;

-- lojas
create policy "Público vê lojas ativas" on public.lojas
    for select to anon, authenticated
    using (ativa);

create policy "Equipe vê a própria loja" on public.lojas
    for select to authenticated
    using (privado.pode_editar(id));

create policy "Admin cria lojas" on public.lojas
    for insert to authenticated
    with check (privado.eh_admin());

create policy "Equipe edita a própria loja" on public.lojas
    for update to authenticated
    using (privado.pode_editar(id))
    with check (privado.pode_editar(id));

create policy "Admin exclui lojas" on public.lojas
    for delete to authenticated
    using (privado.eh_admin());

-- categorias
create policy "Público vê categorias ativas" on public.categorias
    for select to anon, authenticated
    using (ativa and exists (select 1 from public.lojas l where l.id = loja_id and l.ativa));

create policy "Equipe vê categorias" on public.categorias
    for select to authenticated
    using (privado.pode_editar(loja_id));

create policy "Equipe cria categorias" on public.categorias
    for insert to authenticated
    with check (privado.pode_editar(loja_id));

create policy "Equipe edita categorias" on public.categorias
    for update to authenticated
    using (privado.pode_editar(loja_id))
    with check (privado.pode_editar(loja_id));

create policy "Equipe exclui categorias" on public.categorias
    for delete to authenticated
    using (privado.pode_editar(loja_id));

-- produtos
create policy "Público vê produtos disponíveis" on public.produtos
    for select to anon, authenticated
    using (ativo and exists (select 1 from public.lojas l where l.id = loja_id and l.ativa));

create policy "Equipe vê produtos" on public.produtos
    for select to authenticated
    using (privado.pode_editar(loja_id));

create policy "Equipe cria produtos" on public.produtos
    for insert to authenticated
    with check (privado.pode_editar(loja_id));

create policy "Equipe edita produtos" on public.produtos
    for update to authenticated
    using (privado.pode_editar(loja_id))
    with check (privado.pode_editar(loja_id));

create policy "Equipe exclui produtos" on public.produtos
    for delete to authenticated
    using (privado.pode_editar(loja_id));

-- acessos
create policy "Usuário vê os próprios acessos" on public.loja_usuarios
    for select to authenticated
    using (user_id = (select auth.uid()) or privado.eh_admin());

create policy "Admin remove acessos" on public.loja_usuarios
    for delete to authenticated
    using (privado.eh_admin());

create policy "Usuário vê se é admin" on public.admins
    for select to authenticated
    using (user_id = (select auth.uid()));

-- ---------- imagens (logo e fotos) ----------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('imagens', 'imagens', true, 5242880, array['image/png', 'image/jpeg', 'image/webp', 'image/gif'])
on conflict (id) do nothing;

create policy "Equipe envia imagens da loja" on storage.objects
    for insert to authenticated
    with check (bucket_id = 'imagens' and privado.pode_editar_pasta((storage.foldername(name))[1]));

create policy "Equipe vê imagens da loja" on storage.objects
    for select to authenticated
    using (bucket_id = 'imagens' and privado.pode_editar_pasta((storage.foldername(name))[1]));

create policy "Equipe troca imagens da loja" on storage.objects
    for update to authenticated
    using (bucket_id = 'imagens' and privado.pode_editar_pasta((storage.foldername(name))[1]))
    with check (bucket_id = 'imagens' and privado.pode_editar_pasta((storage.foldername(name))[1]));

create policy "Equipe exclui imagens da loja" on storage.objects
    for delete to authenticated
    using (bucket_id = 'imagens' and privado.pode_editar_pasta((storage.foldername(name))[1]));
