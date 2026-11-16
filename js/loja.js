/*
 * Carrega a loja pelo endereço: index.html?loja=sr-john
 *
 * Com "?loja=", os dados vêm do banco (cadastrados pelo painel).
 * Sem "?loja=", o site usa a demonstração local (js/empresa.js e js/dados.js).
 */
var LOJA = {

    // "sr-john" em index.html?loja=sr-john
    slug: (() => {
        var slug = new URLSearchParams(window.location.search).get('loja') || '';
        return slug.toLowerCase().replace(/[^a-z0-9-]/g, '').substring(0, 40);
    })(),

    remota: () => !!LOJA.slug,

    // separa carrinho e dados do cliente de cada loja no navegador
    sufixo: () => LOJA.slug ? '-' + LOJA.slug : '',

    // link para outra página da mesma loja, ex.: LOJA.link('index.html', { mesa: 3 })
    link: (pagina, parametros) => {

        var busca = new URLSearchParams();
        if (LOJA.slug) busca.set('loja', LOJA.slug);

        Object.keys(parametros || {}).forEach((chave) => busca.set(chave, parametros[chave]));

        var texto = busca.toString();
        return texto ? pagina + '?' + texto : pagina;

    },

    // busca a loja, as categorias e os produtos e monta EMPRESA e MENU
    carregar: () => {

        if (!LOJA.remota()) {
            return Promise.resolve();
        }

        var banco = supabase.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.chave, {
            auth: { persistSession: false }
        });

        return banco.from('lojas').select('*').eq('slug', LOJA.slug).eq('ativa', true).maybeSingle()
            .then((resultado) => {

                if (resultado.error) throw resultado.error;
                if (!resultado.data) throw new Error('nao-encontrada');

                var loja = resultado.data;

                return Promise.all([
                    banco.from('categorias').select('id, nome, icone').eq('loja_id', loja.id).eq('ativa', true).order('ordem').order('criado_em'),
                    banco.from('produtos').select('id, categoria_id, nome, descricao, preco, imagem_url').eq('loja_id', loja.id).eq('ativo', true).order('ordem').order('criado_em')
                ]).then((listas) => {

                    if (listas[0].error) throw listas[0].error;
                    if (listas[1].error) throw listas[1].error;

                    LOJA.montar(loja, listas[0].data, listas[1].data);

                });

            })
            .then(() => {
                COMUM.aplicarTema();
                document.documentElement.classList.remove('carregando-loja');
            })
            .catch((erro) => {
                LOJA.mostrarErro(erro && erro.message == 'nao-encontrada'
                    ? 'Não encontramos esta loja. Confira o link e tente de novo.'
                    : 'Não foi possível carregar o cardápio agora. Verifique a internet e tente de novo.');

                // a página para aqui: a mensagem de erro já está na tela
                return new Promise(() => { });
            });

    },

    // converte os dados do banco para o formato usado pelas páginas
    montar: (loja, categorias, produtos) => {

        var site = loja.site || {};

        EMPRESA = {
            id: loja.id,
            slug: loja.slug,
            nome: loja.nome,
            slogan: loja.slogan,
            logo: loja.logo_url || './img/logo.svg',
            descricaoBio: loja.descricao_bio,
            cores: {
                primaria: loja.cor_primaria,
                secundaria: loja.cor_secundaria,
                fundo: loja.cor_fundo
            },
            whatsapp: loja.whatsapp,
            telefoneExibicao: loja.telefone_exibicao,
            instagram: loja.instagram,
            facebook: loja.facebook,
            endereco: loja.endereco,
            linkMapa: loja.link_mapa,
            urlSite: loja.url_site,
            site: {
                titulo: site.titulo || 'Escolha sua comida',
                tituloDestaque: site.tituloDestaque || 'favorita.',
                descricao: site.descricao || 'Veja o cardápio, monte o seu pedido e envie direto pelo WhatsApp.',
                imagemBanner: site.imagemBanner || '',
                imagemDepoimentos: site.imagemDepoimentos || '',
                depoimentoBanner: site.depoimentoBanner || null,
                reservas: site.reservas !== false
            },
            depoimentos: loja.depoimentos || [],
            categorias: categorias.map((c) => ({ id: c.id, nome: c.nome, icone: c.icone })),
            pedido: {
                retirada: loja.aceita_retirada,
                entrega: loja.aceita_entrega,
                mesa: loja.aceita_mesa,
                quantidadeMesas: loja.quantidade_mesas,
                taxaEntrega: loja.taxa_entrega === null ? null : Number(loja.taxa_entrega)
            },
            pagamento: {
                pix: {
                    chave: loja.pix_chave,
                    nomeRecebedor: loja.pix_nome,
                    cidade: loja.pix_cidade
                },
                linkCartao: loja.link_cartao,
                naEntrega: {
                    pix: loja.pagar_pix,
                    cartao: loja.pagar_cartao,
                    dinheiro: loja.pagar_dinheiro
                }
            },
            linksBio: loja.links_bio || []
        };

        MENU = {};

        categorias.forEach((c) => {
            MENU[c.id] = produtos
                .filter((p) => p.categoria_id == c.id)
                .map((p) => ({
                    id: p.id,
                    img: p.imagem_url || './img/sem-imagem.svg',
                    name: p.nome,
                    dsc: p.descricao,
                    price: Number(p.preco)
                }));
        });

    },

    mostrarErro: (mensagem) => {

        document.documentElement.classList.remove('carregando-loja');
        document.title = 'Loja não encontrada';
        document.body.innerHTML =
            '<div style="max-width:420px;margin:15vh auto;padding:0 16px;text-align:center;font-family:sans-serif;color:#4f4f4f">' +
            '<div style="font-size:48px">🍽️</div>' +
            '<p style="font-size:18px">' + COMUM.escapar(mensagem) + '</p>' +
            '</div>';

    }

}

// esconde a página até os dados da loja chegarem (evita mostrar a demonstração)
if (LOJA.remota()) {
    document.documentElement.classList.add('carregando-loja');

    var estiloCarregando = document.createElement('style');
    estiloCarregando.textContent = 'html.carregando-loja body { visibility: hidden; }';
    document.head.appendChild(estiloCarregando);
}
