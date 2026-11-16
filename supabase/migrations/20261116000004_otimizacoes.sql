-- índice que cobre a chave estrangeira (categoria_id, loja_id)
drop index if exists public.produtos_categoria_ordem_idx;
create index produtos_categoria_loja_idx on public.produtos (categoria_id, loja_id);

-- uma regra de leitura por tabela (público + equipe), mesmo efeito de antes
drop policy "Público vê lojas ativas" on public.lojas;
drop policy "Equipe vê a própria loja" on public.lojas;
create policy "Ver lojas" on public.lojas
    for select to anon, authenticated
    using (ativa or privado.pode_editar(id));

drop policy "Público vê categorias ativas" on public.categorias;
drop policy "Equipe vê categorias" on public.categorias;
create policy "Ver categorias" on public.categorias
    for select to anon, authenticated
    using (
        (ativa and exists (select 1 from public.lojas l where l.id = loja_id and l.ativa))
        or privado.pode_editar(loja_id)
    );

drop policy "Público vê produtos disponíveis" on public.produtos;
drop policy "Equipe vê produtos" on public.produtos;
create policy "Ver produtos" on public.produtos
    for select to anon, authenticated
    using (
        (ativo and exists (select 1 from public.lojas l where l.id = loja_id and l.ativa))
        or privado.pode_editar(loja_id)
    );
