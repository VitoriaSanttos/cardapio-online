$(document).ready(function () {
    cardapio.eventos.init();
})

var cardapio = {};

var MEU_CARRINHO = [];
var VALOR_CARRINHO = 0;

// categoria exibida no cardápio
var CATEGORIA_ATIVA = null;

// número da mesa vindo do QR code (?mesa=5)
var MESA_QRCODE = null;

// dados preenchidos na etapa "Finalizar pedido"
var PEDIDO = null;

var ITENS_POR_PAGINA = 8;
var CHAVE_STORAGE = 'cardapio-carrinho';
var CHAVE_CLIENTE = 'cardapio-cliente';
var IMAGEM_PADRAO = './img/sem-imagem.svg';

cardapio.eventos = {

    init: () => {
        cardapio.metodos.carregarEmpresa();
        cardapio.metodos.lerMesaQRCode();
        cardapio.metodos.carregarCarrinhoSalvo();
        cardapio.metodos.carregarCategorias();
        cardapio.metodos.obterItensCardapio(CATEGORIA_ATIVA);

        // fecha o carrinho com a tecla ESC
        $(document).on('keydown', (e) => {
            if (e.key === 'Escape' && !$("#modalCarrinho").hasClass('hidden')) {
                cardapio.metodos.abrirCarrinho(false);
            }
        });

        // busca no cardápio
        $("#txtBusca").on('input', function () {
            cardapio.metodos.buscar($(this).val());
        });

        // máscara do CEP (00000-000) e busca automática ao completar
        $("#txtCEP").on('input', function () {
            let cep = $(this).val().replace(/\D/g, '').substring(0, 8);
            $(this).val(cep.length > 5 ? cep.substring(0, 5) + '-' + cep.substring(5) : cep);

            if (cep.length == 8) {
                cardapio.metodos.buscarCep();
            }
        });

        $("#txtCEP").on('keydown', (e) => {
            if (e.key === 'Enter') {
                cardapio.metodos.buscarCep();
            }
        });

        // mostra o campo de troco quando o pagamento é em dinheiro
        $(document).on('change', 'input[name="pagamento"]', () => {
            cardapio.metodos.selecionarPagamento();
        });

        // imagem padrão para itens sem foto
        document.addEventListener('error', (e) => {
            let img = e.target;
            if (img.tagName === 'IMG' && !img.src.endsWith(IMAGEM_PADRAO.substring(1))) {
                img.src = IMAGEM_PADRAO;
            }
        }, true);
    }

}

cardapio.metodos = {

    // preenche o site com os dados de js/empresa.js
    carregarEmpresa: () => {

        let site = EMPRESA.site || {};

        document.title = `${EMPRESA.nome} - Cardápio on-line`;

        $(".img-logo, .logo-footer").attr({ src: EMPRESA.logo, alt: EMPRESA.nome });
        $(".lbl-nome-empresa").text(EMPRESA.nome);

        $("#lblTituloSite").text(site.titulo || '');
        $("#lblTituloDestaque").text(site.tituloDestaque || '');
        $("#lblDescricaoSite").text(site.descricao || '');
        $("#lblTelefone").text(EMPRESA.telefoneExibicao || '');

        if (site.imagemBanner) {
            $("#imgBanner").attr('src', site.imagemBanner);
        }

        if (site.depoimentoBanner && site.depoimentoBanner.texto) {
            $("#lblCardCaseTexto").text(`"${site.depoimentoBanner.texto}"`);
            $("#lblCardCaseNome").text(site.depoimentoBanner.nome || '');
        }
        else {
            $(".card-case").addClass('hidden');
        }

        // redes sociais: esconde as que não foram configuradas
        $(".link-instagram").attr('href', EMPRESA.instagram).toggleClass('hidden', !EMPRESA.instagram);
        $(".link-facebook").attr('href', EMPRESA.facebook).toggleClass('hidden', !EMPRESA.facebook);
        $(".link-whatsapp").attr({ href: COMUM.linkWhatsApp(), target: '_blank' });

        $("#btnLigar").attr('href', `tel:+${EMPRESA.whatsapp}`);
        $("#btnReserva").attr('href', COMUM.linkWhatsApp('Olá! Gostaria de fazer uma *reserva*.'));

        if (site.reservas === false) {
            $("#reservas, .nav-reservas").addClass('hidden');
        }

        cardapio.metodos.carregarDepoimentos();

    },

    // monta os depoimentos configurados
    carregarDepoimentos: () => {

        let depoimentos = EMPRESA.depoimentos || [];

        if (depoimentos.length == 0) {
            $("#depoimentos, .nav-depoimentos").addClass('hidden');
            return;
        }

        $("#listaDepoimentos").html('');
        $("#botoesDepoimentos").html('');

        $.each(depoimentos, (i, e) => {

            let nota = Number(e.nota) || 5;
            let estrelas = '';

            for (let s = 1; s <= 5; s++) {
                if (nota >= s) estrelas += '<i class="fas fa-star"></i> ';
                else if (nota >= s - 0.5) estrelas += '<i class="fas fa-star-half-alt"></i> ';
                else estrelas += '<i class="far fa-star"></i> ';
            }

            let temp = cardapio.metodos.preencher(cardapio.templates.depoimento, {
                id: i + 1,
                nome: e.nome,
                texto: e.texto,
                nota: nota.toFixed(1),
                foto: e.foto || IMAGEM_PADRAO
            }).replace('{{estrelas}}', estrelas);

            $("#listaDepoimentos").append(temp);

            if (depoimentos.length > 1) {
                $("#botoesDepoimentos").append(
                    `<a id="btnDepoimento-${i + 1}" class="btn btn-sm btn-white btn-social mr-3" onclick="cardapio.metodos.abrirDepoimento(${i + 1})">${i + 1}</a>`
                );
            }

        });

        cardapio.metodos.abrirDepoimento(1);

    },

    // lê o número da mesa do link (?mesa=5)
    lerMesaQRCode: () => {

        let config = EMPRESA.pedido || {};
        let mesa = parseInt(new URLSearchParams(window.location.search).get('mesa'), 10);

        if (!config.mesa || !(mesa > 0)) return;
        if (config.quantidadeMesas && mesa > config.quantidadeMesas) return;

        MESA_QRCODE = mesa;

        $("#lblNumeroMesa").text(mesa);
        $("#avisoMesa").removeClass('hidden');

        // quem chega pela mesa vai direto para o cardápio
        setTimeout(() => {
            let topo = $("#cardapio").offset();
            if (topo) window.scrollTo(0, topo.top - 20);
        }, 300);

    },

    // monta os botões das categorias configuradas
    carregarCategorias: () => {

        let categorias = $.grep(EMPRESA.categorias || [], (e) => { return MENU[e.id] && MENU[e.id].length > 0 });

        // categorias que existem em dados.js mas não foram configuradas
        $.each(Object.keys(MENU), (i, id) => {
            if (!categorias.some((c) => c.id == id)) {
                categorias.push({ id: id, nome: id.charAt(0).toUpperCase() + id.slice(1), icone: 'fas fa-utensils' });
            }
        });

        $("#menuCategorias").html('');

        $.each(categorias, (i, e) => {
            $("#menuCategorias").append(cardapio.metodos.preencher(cardapio.templates.categoria, e));
        });

        CATEGORIA_ATIVA = categorias.length > 0 ? categorias[0].id : null;

    },

    // troca {{chave}} pelos valores (com segurança contra HTML)
    preencher: (template, dados) => {

        return template.replace(/\{\{(\w+)\}\}/g, (trecho, chave) => {
            return chave in dados ? COMUM.escapar(dados[chave]) : trecho;
        });

    },

    // obtem a lista de itens do cardápio
    obterItensCardapio: (categoria, vermais = false) => {

        if (!categoria || !MENU[categoria]) return;

        CATEGORIA_ATIVA = categoria;

        var filtro = MENU[categoria];

        // ao trocar de categoria, limpa a busca
        if (!vermais) {
            $("#txtBusca").val('');
            $("#itensCardapio").html('');
        }

        // quantidade de itens que já estão na tela
        var exibidos = vermais ? $("#itensCardapio .card-item").length : 0;
        var limite = exibidos + ITENS_POR_PAGINA;

        $.each(filtro, (i, e) => {

            // exibe a próxima página de itens
            if (i >= exibidos && i < limite) {
                $("#itensCardapio").append(cardapio.metodos.templateItem(e));
            }

        })

        // só mostra o "Ver mais" se ainda existirem itens para exibir
        $("#btnVerMais").toggleClass('hidden', filtro.length <= limite);

        // remove o ativo
        $(".container-menu a").removeClass('active');

        // seta o menu para ativo
        $("#menu-" + categoria).addClass('active')

    },

    templateItem: (e) => {

        return cardapio.metodos.preencher(cardapio.templates.item, {
            id: e.id,
            img: e.img,
            nome: e.name,
            descricao: e.dsc || '',
            preco: COMUM.formatarMoeda(e.price)
        });

    },

    // clique no botão de ver mais
    verMais: () => {

        cardapio.metodos.obterItensCardapio(CATEGORIA_ATIVA, true);

    },

    // busca em todas as categorias pelo nome ou descrição
    buscar: (termo) => {

        let normalizar = (t) => String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
        let busca = normalizar(termo).trim();

        if (busca.length == 0) {
            cardapio.metodos.obterItensCardapio(CATEGORIA_ATIVA);
            return;
        }

        $("#itensCardapio").html('');
        $("#btnVerMais").addClass('hidden');
        $(".container-menu a").removeClass('active');

        let encontrados = 0;

        $.each(MENU, (categoria, itens) => {
            $.each(itens, (i, e) => {
                if (normalizar(e.name).includes(busca) || normalizar(e.dsc).includes(busca)) {
                    $("#itensCardapio").append(cardapio.metodos.templateItem(e));
                    encontrados++;
                }
            });
        });

        if (encontrados == 0) {
            $("#itensCardapio").html(`<p class="col-12 text-center busca-vazia">Nenhum item encontrado para "<b>${COMUM.escapar(termo)}</b>".</p>`);
        }

    },

    // procura o item em todas as categorias
    obterItem: (id) => {

        let encontrado = null;

        $.each(MENU, (categoria, itens) => {
            let item = $.grep(itens, (e) => { return e.id == id });
            if (item.length > 0) {
                encontrado = item[0];
                return false;
            }
        });

        return encontrado;

    },

    // diminuir a quantidade do item no cardapio
    diminuirQuantidade: (id) => {

        let qntdAtual = parseInt($("#qntd-" + id).text());

        if (qntdAtual > 0) {
            $("#qntd-" + id).text(qntdAtual - 1)
        }

    },

    // aumentar a quantidade do item no cardapio
    aumentarQuantidade: (id) => {

        let qntdAtual = parseInt($("#qntd-" + id).text());
        $("#qntd-" + id).text(qntdAtual + 1)

    },

    // adicionar ao carrinho o item do cardápio
    adicionarAoCarrinho: (id) => {

        let qntdAtual = parseInt($("#qntd-" + id).text());

        // um toque no botão sem escolher quantidade adiciona 1
        if (!(qntdAtual > 0)) {
            qntdAtual = 1;
        }

        let item = cardapio.metodos.obterItem(id);

        if (item) {

            // validar se já existe esse item no carrinho
            let objIndex = MEU_CARRINHO.findIndex((obj => obj.id == id));

            // caso já exista o item no carrinho, só altera a quantidade
            if (objIndex >= 0) {
                MEU_CARRINHO[objIndex].qntd = MEU_CARRINHO[objIndex].qntd + qntdAtual;
            }
            // caso ainda não exista o item no carrinho, adiciona ele
            else {
                // copia o item para não alterar os dados do cardápio
                MEU_CARRINHO.push($.extend({}, item, { qntd: qntdAtual }))
            }

            cardapio.metodos.salvarCarrinho();
            cardapio.metodos.mensagem('Item adicionado ao carrinho', 'green')
            $("#qntd-" + id).text(0);

            cardapio.metodos.atualizarBadgeTotal();

        }

    },

    // atualiza o badge de totais dos botões "Meu carrinho"
    atualizarBadgeTotal: () => {

        var total = 0;

        $.each(MEU_CARRINHO, (i, e) => {
            total += e.qntd
        })

        if (total > 0) {
            $(".botao-carrinho").removeClass('hidden');
            $(".container-total-carrinho").removeClass('hidden');
        }
        else {
            $(".botao-carrinho").addClass('hidden')
            $(".container-total-carrinho").addClass('hidden');
        }

        $(".badge-total-carrinho").html(total);

    },

    // salva o carrinho no navegador para não perder ao recarregar a página
    salvarCarrinho: () => {

        try {
            localStorage.setItem(CHAVE_STORAGE, JSON.stringify(MEU_CARRINHO));
        } catch (e) { }

    },

    // recupera o carrinho salvo no navegador
    carregarCarrinhoSalvo: () => {

        try {
            let salvo = JSON.parse(localStorage.getItem(CHAVE_STORAGE));
            if ($.isArray(salvo)) {
                // atualiza nome, foto e preço com o cardápio atual e descarta itens que saíram dele
                MEU_CARRINHO = salvo
                    .filter((e) => e && e.qntd > 0 && cardapio.metodos.obterItem(e.id))
                    .map((e) => $.extend({}, cardapio.metodos.obterItem(e.id), { qntd: e.qntd }));
            }
        } catch (e) { }

        cardapio.metodos.atualizarBadgeTotal();

    },

    // dados do cliente salvos para o próximo pedido
    obterCliente: () => {

        try {
            return JSON.parse(localStorage.getItem(CHAVE_CLIENTE)) || {};
        } catch (e) {
            return {};
        }

    },

    salvarCliente: (cliente) => {

        try {
            localStorage.setItem(CHAVE_CLIENTE, JSON.stringify(cliente));
        } catch (e) { }

    },

    // abrir a modal de carrinho
    abrirCarrinho: (abrir) => {

        if (abrir) {
            $("#modalCarrinho").removeClass('hidden');
            $("body").css('overflow', 'hidden');
            cardapio.metodos.carregarCarrinho();
        }
        else {
            $("#modalCarrinho").addClass('hidden');
            $("body").css('overflow', '');
        }

    },

    // altera os texto e exibe os botões das etapas
    carregarEtapa: (etapa) => {

        let titulos = { 1: 'Seu carrinho:', 2: 'Finalizar pedido:', 3: 'Resumo do pedido:' };

        $("#lblTituloEtapa").text(titulos[etapa]);

        $("#itensCarrinho").toggleClass('hidden', etapa != 1);
        $("#finalizarPedido").toggleClass('hidden', etapa != 2);
        $("#resumoCarrinho").toggleClass('hidden', etapa != 3);
        $("#pedidoEnviado").addClass('hidden');
        $(".m-footer .container-total").removeClass('hidden');

        $(".etapa").removeClass('active');
        for (let i = 1; i <= etapa; i++) {
            $(".etapa" + i).addClass('active');
        }

        $("#btnEtapaPedido").toggleClass('hidden', etapa != 1);
        $("#btnEtapaEndereco").toggleClass('hidden', etapa != 2);
        $("#btnEtapaResumo").toggleClass('hidden', etapa != 3);
        $("#btnVoltar").toggleClass('hidden', etapa == 1);
        $("#btnNovoPedido").addClass('hidden');

        $(".modal-full").scrollTop(0);

    },

    // botão de voltar etapa
    voltarEtapa: () => {

        let etapa = $(".etapa.active").length;

        if (etapa == 2) {
            cardapio.metodos.carregarCarrinho();
        }
        else {
            cardapio.metodos.carregarEtapa(etapa - 1);
        }

    },

    // carrega a lista de itens do carrinho
    carregarCarrinho: () => {

        cardapio.metodos.carregarEtapa(1);

        if (MEU_CARRINHO.length > 0) {

            $("#itensCarrinho").html('');

            $.each(MEU_CARRINHO, (i, e) => {

                let temp = cardapio.metodos.preencher(cardapio.templates.itemCarrinho, {
                    id: e.id,
                    img: e.img,
                    nome: e.name,
                    preco: COMUM.formatarMoeda(e.price),
                    qntd: e.qntd
                });

                $("#itensCarrinho").append(temp);

            })

        }
        else {
            $("#itensCarrinho").html('<p class="carrinho-vazio"><i class="fa fa-shopping-bag"></i> Seu carrinho está vazio.</p>');
        }

        cardapio.metodos.carregarValores();

    },

    // diminuir quantidade do item no carrinho
    diminuirQuantidadeCarrinho: (id) => {

        let qntdAtual = parseInt($("#qntd-carrinho-" + id).text());

        if (qntdAtual > 1) {
            $("#qntd-carrinho-" + id).text(qntdAtual - 1);
            cardapio.metodos.atualizarCarrinho(id, qntdAtual - 1);
        }
        else {
            cardapio.metodos.removerItemCarrinho(id)
        }

    },

    // aumentar quantidade do item no carrinho
    aumentarQuantidadeCarrinho: (id) => {

        let qntdAtual = parseInt($("#qntd-carrinho-" + id).text());
        $("#qntd-carrinho-" + id).text(qntdAtual + 1);
        cardapio.metodos.atualizarCarrinho(id, qntdAtual + 1);

    },

    // botão remover item do carrinho
    removerItemCarrinho: (id) => {

        MEU_CARRINHO = $.grep(MEU_CARRINHO, (e, i) => { return e.id != id });
        cardapio.metodos.salvarCarrinho();
        cardapio.metodos.carregarCarrinho();

        // atualiza o botão carrinho com a quantidade atualizada
        cardapio.metodos.atualizarBadgeTotal();

    },

    // atualiza o carrinho com a quantidade atual
    atualizarCarrinho: (id, qntd) => {

        let objIndex = MEU_CARRINHO.findIndex((obj => obj.id == id));
        MEU_CARRINHO[objIndex].qntd = qntd;
        cardapio.metodos.salvarCarrinho();

        // atualiza o botão carrinho com a quantidade atualizada
        cardapio.metodos.atualizarBadgeTotal();

        // atualiza os valores (R$) totais do carrinho
        cardapio.metodos.carregarValores();

    },

    // tipo de pedido escolhido (retirada, entrega ou mesa)
    tipoPedido: () => {

        return $("#tiposPedido .tipo-pedido.active").data('tipo') || null;

    },

    // taxa de entrega: número, ou null quando é "a combinar"
    taxaEntrega: () => {

        if (cardapio.metodos.tipoPedido() != 'entrega') return 0;

        let taxa = (EMPRESA.pedido || {}).taxaEntrega;
        return (taxa === null || taxa === undefined || taxa === '') ? null : Number(taxa);

    },

    // valor total conhecido (subtotal + taxa, quando a taxa é fixa)
    valorTotal: () => {

        return VALOR_CARRINHO + (cardapio.metodos.taxaEntrega() || 0);

    },

    // carrega os valores de SubTotal, Entrega e Total
    carregarValores: () => {

        VALOR_CARRINHO = 0;

        $.each(MEU_CARRINHO, (i, e) => {
            VALOR_CARRINHO += parseFloat(e.price * e.qntd);
        })

        let etapa = $(".etapa.active").length;
        let tipo = cardapio.metodos.tipoPedido();
        let taxa = cardapio.metodos.taxaEntrega();

        // a linha de entrega só aparece quando o pedido é para entregar
        let mostrarEntrega = etapa > 1 && tipo == 'entrega' && MEU_CARRINHO.length > 0;

        $("#lblSubTotal").text(COMUM.formatarMoeda(VALOR_CARRINHO));
        $(".texto-entrega").toggleClass('hidden', !mostrarEntrega);
        $("#lblValorEntrega").text(taxa === null ? 'a combinar' : '+ ' + COMUM.formatarMoeda(taxa));

        let total = COMUM.formatarMoeda(cardapio.metodos.valorTotal());
        $("#lblValorTotal").text(mostrarEntrega && taxa === null ? total + ' + entrega' : total);

    },

    // carregar a etapa "Finalizar pedido"
    carregarEndereco: () => {

        if (MEU_CARRINHO.length <= 0) {
            cardapio.metodos.mensagem('Seu carrinho está vazio.')
            return;
        }

        let config = EMPRESA.pedido || {};
        let cliente = cardapio.metodos.obterCliente();
        let tipoAtual = cardapio.metodos.tipoPedido();

        // tipos de pedido disponíveis
        let tipos = [];
        if (config.retirada) tipos.push({ tipo: 'retirada', nome: 'Retirada', icone: 'fas fa-store' });
        if (config.entrega) tipos.push({ tipo: 'entrega', nome: 'Entrega', icone: 'fas fa-motorcycle' });
        if (config.mesa) tipos.push({ tipo: 'mesa', nome: 'Na mesa', icone: 'fas fa-chair' });

        $("#tiposPedido").html('');
        $.each(tipos, (i, e) => {
            $("#tiposPedido").append(cardapio.metodos.preencher(cardapio.templates.tipoPedido, e));
        });

        // preenche com os dados do último pedido
        if (!$("#txtNome").val()) {
            $("#txtNome").val(cliente.nome || '');
            $("#txtCEP").val(cliente.cep || '');
            $("#txtEndereco").val(cliente.endereco || '');
            $("#txtBairro").val(cliente.bairro || '');
            $("#txtCidade").val(cliente.cidade || '');
            $("#ddlUf").val(cliente.uf || '-1');
            $("#txtNumero").val(cliente.numero || '');
            $("#txtComplemento").val(cliente.complemento || '');
        }

        // quem veio pelo QR code da mesa já começa com "Na mesa"
        if (MESA_QRCODE) {
            $("#txtMesa").val(MESA_QRCODE).prop('readonly', true);
        }

        let padrao = MESA_QRCODE && config.mesa ? 'mesa' : (tipoAtual || cliente.tipo);
        if (!tipos.some((t) => t.tipo == padrao)) {
            padrao = tipos.length > 0 ? tipos[0].tipo : null;
        }

        $("#lblEnderecoLoja").text(EMPRESA.endereco || '');
        $(".info-retirada").toggleClass('hidden', !EMPRESA.endereco);

        cardapio.metodos.carregarEtapa(2);
        cardapio.metodos.selecionarTipo(padrao);

    },

    // troca entre retirada, entrega e mesa
    selecionarTipo: (tipo) => {

        $("#tiposPedido .tipo-pedido").removeClass('active');
        $(`#tiposPedido .tipo-pedido[data-tipo="${tipo}"]`).addClass('active');

        $(".campos-entrega").toggleClass('hidden', tipo != 'entrega');
        $(".campo-mesa").toggleClass('hidden', tipo != 'mesa');
        $(".campo-retirada").toggleClass('hidden', tipo != 'retirada');

        cardapio.metodos.carregarPagamentos();
        cardapio.metodos.carregarValores();

    },

    // monta as formas de pagamento conforme o tipo de pedido
    carregarPagamentos: () => {

        let config = EMPRESA.pagamento || {};
        let naEntrega = config.naEntrega || {};
        let tipo = cardapio.metodos.tipoPedido();
        let selecionado = $('input[name="pagamento"]:checked').val();

        let onde = { entrega: 'na entrega', retirada: 'na retirada', mesa: 'no caixa' }[tipo] || 'na entrega';

        let html = '';

        if (PIX.disponivel() || config.linkCartao) {
            html += '<p class="grupo-pagamento">Pagar agora</p>';
            if (PIX.disponivel()) {
                html += cardapio.metodos.opcaoPagamento('pix-agora', 'Pix agora', 'QR Code e copia e cola com o valor do pedido');
            }
            if (config.linkCartao) {
                html += cardapio.metodos.opcaoPagamento('cartao-online', 'Cartão online', 'Link de pagamento');
            }
        }

        if (naEntrega.pix || naEntrega.cartao || naEntrega.dinheiro) {
            html += `<p class="grupo-pagamento">Pagar ${onde}</p>`;
            if (naEntrega.pix) html += cardapio.metodos.opcaoPagamento('pix', 'Pix', '');
            if (naEntrega.cartao) html += cardapio.metodos.opcaoPagamento('cartao', 'Cartão de crédito ou débito', '');
            if (naEntrega.dinheiro) html += cardapio.metodos.opcaoPagamento('dinheiro', 'Dinheiro', '');
        }

        $("#formasPagamento").html(html);

        if (selecionado) {
            $(`input[name="pagamento"][value="${selecionado}"]`).prop('checked', true);
        }

        cardapio.metodos.selecionarPagamento();

    },

    opcaoPagamento: (valor, titulo, descricao) => {

        return cardapio.metodos.preencher(cardapio.templates.opcaoPagamento, {
            valor: valor,
            titulo: titulo,
            descricao: descricao
        });

    },

    selecionarPagamento: () => {

        let pagamento = $('input[name="pagamento"]:checked').val();

        $(".opcao-pagamento").removeClass('active');
        $('input[name="pagamento"]:checked').closest('.opcao-pagamento').addClass('active');

        $(".campo-troco").toggleClass('hidden', pagamento != 'dinheiro');

    },

    // API ViaCEP
    buscarCep: () => {

        // cria a variavel com o valor do cep
        var cep = $("#txtCEP").val().trim().replace(/\D/g, '');

        // verifica se o CEP possui valor informado
        if (cep != "") {

            // Expressão regular para validar o CEP
            var validacep = /^[0-9]{8}$/;

            if (validacep.test(cep)) {

                $.ajax({
                    url: "https://viacep.com.br/ws/" + cep + "/json/?callback=?",
                    dataType: 'jsonp',
                    timeout: 8000
                }).done(function (dados) {

                    if (!("erro" in dados)) {

                        // Atualizar os campos com os valores retornados
                        $("#txtEndereco").val(dados.logradouro);
                        $("#txtBairro").val(dados.bairro);
                        $("#txtCidade").val(dados.localidade);
                        $("#ddlUf").val(dados.uf);
                        $("#txtNumero").focus();

                    }
                    else {
                        cardapio.metodos.mensagem('CEP não encontrado. Preencha as informações manualmente.');
                        $("#txtEndereco").focus();
                    }

                }).fail(function () {
                    cardapio.metodos.mensagem('Não foi possível buscar o CEP. Preencha as informações manualmente.');
                    $("#txtEndereco").focus();
                })

            }
            else {
                cardapio.metodos.mensagem('Formato do CEP inválido.');
                $("#txtCEP").focus();
            }

        }
        else {
            cardapio.metodos.mensagem('Informe o CEP, por favor.');
            $("#txtCEP").focus();
        }

    },

    // valida um campo obrigatório
    campoObrigatorio: (seletor, mensagem) => {

        let valor = $(seletor).val();

        if (!valor || !String(valor).trim() || valor == '-1') {
            cardapio.metodos.mensagem(mensagem);
            $(seletor).focus();
            return false;
        }

        return true;

    },

    // validação antes de prosseguir para a etapa 3
    resumoPedido: () => {

        let tipo = cardapio.metodos.tipoPedido();
        let valor = (seletor) => String($(seletor).val() || '').trim();
        let obrigatorio = cardapio.metodos.campoObrigatorio;

        if (!tipo) {
            cardapio.metodos.mensagem('Escolha como quer receber o pedido.');
            return;
        }

        if (!obrigatorio("#txtNome", 'Informe o seu nome, por favor.')) return;

        if (tipo == 'mesa') {
            let mesa = parseInt(valor("#txtMesa"), 10);
            let maximo = (EMPRESA.pedido || {}).quantidadeMesas;

            if (!(mesa > 0) || (maximo && mesa > maximo)) {
                cardapio.metodos.mensagem('Informe o número da mesa, por favor.');
                $("#txtMesa").focus();
                return;
            }
        }

        if (tipo == 'entrega') {
            if (!obrigatorio("#txtCEP", 'Informe o CEP, por favor.')) return;
            if (!obrigatorio("#txtEndereco", 'Informe o Endereço, por favor.')) return;
            if (!obrigatorio("#txtBairro", 'Informe o Bairro, por favor.')) return;
            if (!obrigatorio("#txtCidade", 'Informe a Cidade, por favor.')) return;
            if (!obrigatorio("#ddlUf", 'Informe a UF, por favor.')) return;
            if (!obrigatorio("#txtNumero", 'Informe o Número, por favor.')) return;
        }

        let pagamento = $('input[name="pagamento"]:checked');

        if ($('input[name="pagamento"]').length > 0 && pagamento.length == 0) {
            cardapio.metodos.mensagem('Escolha a forma de pagamento, por favor.');
            return;
        }

        // troco: aceita "100", "100,00" ou "R$ 100"
        let troco = parseFloat(valor("#txtTroco").replace(/[^\d,]/g, '').replace(',', '.')) || 0;

        if (pagamento.val() == 'dinheiro' && troco > 0 && troco < cardapio.metodos.valorTotal()) {
            cardapio.metodos.mensagem('O valor para troco é menor que o total do pedido.');
            $("#txtTroco").focus();
            return;
        }

        PEDIDO = {
            codigo: cardapio.metodos.gerarCodigo(),
            tipo: tipo,
            nome: valor("#txtNome"),
            mesa: valor("#txtMesa"),
            endereco: {
                cep: valor("#txtCEP"),
                endereco: valor("#txtEndereco"),
                bairro: valor("#txtBairro"),
                cidade: valor("#txtCidade"),
                uf: valor("#ddlUf"),
                numero: valor("#txtNumero"),
                complemento: valor("#txtComplemento")
            },
            pagamento: pagamento.val() || '',
            pagamentoNome: pagamento.data('titulo') || '',
            troco: pagamento.val() == 'dinheiro' ? troco : 0,
            observacao: valor("#txtObservacao")
        }

        // guarda nome e endereço para o próximo pedido
        cardapio.metodos.salvarCliente($.extend({ nome: PEDIDO.nome, tipo: tipo }, tipo == 'entrega' ? PEDIDO.endereco : cardapio.metodos.obterCliente()));

        cardapio.metodos.carregarEtapa(3);
        cardapio.metodos.carregarValores();
        cardapio.metodos.carregarResumo();

    },

    // código curto para identificar o pedido (ex.: GDW5)
    gerarCodigo: () => {

        let letras = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        let codigo = '';

        for (let i = 0; i < 4; i++) {
            codigo += letras.charAt(Math.floor(Math.random() * letras.length));
        }

        return codigo;

    },

    // texto do local (mesa, retirada ou endereço)
    textoLocal: () => {

        if (PEDIDO.tipo == 'mesa') {
            return { titulo: `Mesa ${PEDIDO.mesa}`, detalhe: 'Pedido feito na mesa' };
        }

        if (PEDIDO.tipo == 'retirada') {
            return { titulo: 'Retirada no balcão', detalhe: EMPRESA.endereco || '' };
        }

        let end = PEDIDO.endereco;

        return {
            titulo: `${end.endereco}, ${end.numero}, ${end.bairro}`,
            detalhe: `${end.cidade}-${end.uf} / ${end.cep} ${end.complemento}`.trim()
        };

    },

    // texto da forma de pagamento
    textoPagamento: () => {

        let onde = { entrega: 'na entrega', retirada: 'na retirada', mesa: 'no caixa' }[PEDIDO.tipo];
        let texto = PEDIDO.pagamentoNome;

        if (['pix', 'cartao', 'dinheiro'].indexOf(PEDIDO.pagamento) >= 0) {
            texto += ' ' + onde;
        }

        if (PEDIDO.pagamento == 'pix-agora') {
            texto = 'Pix pelo QR Code do cardápio (conferir o comprovante)';
        }

        if (PEDIDO.pagamento == 'dinheiro') {
            texto += PEDIDO.troco > 0 ? ` (troco para ${COMUM.formatarMoeda(PEDIDO.troco)})` : ' (sem troco)';
        }

        return texto;

    },

    // carrega a etapa de Resumo do pedido
    carregarResumo: () => {

        // garante que os blocos de pagamento estão no resumo
        $("#resumoCarrinho").append($("#areaPix"), $("#areaCartao"));

        $("#listaItensResumo").html('');

        $.each(MEU_CARRINHO, (i, e) => {

            let temp = cardapio.metodos.preencher(cardapio.templates.itemResumo, {
                img: e.img,
                nome: e.name,
                preco: COMUM.formatarMoeda(e.price),
                qntd: e.qntd
            });

            $("#listaItensResumo").append(temp);

        });

        let local = cardapio.metodos.textoLocal();
        let icones = { mesa: 'fas fa-chair', retirada: 'fas fa-store', entrega: 'fas fa-map-marked-alt' };

        $("#lblTituloLocal").text(PEDIDO.tipo == 'entrega' ? 'Local da entrega:' : (PEDIDO.tipo == 'mesa' ? 'Mesa:' : 'Retirada:'));
        $("#iconeLocal").attr('class', icones[PEDIDO.tipo]);
        $("#resumoEndereco").text(local.titulo);
        $("#cidadeEndereco").text(local.detalhe);

        $("#blocoPagamento").toggleClass('hidden', !PEDIDO.pagamento);
        $("#resumoPagamento").text(cardapio.metodos.textoPagamento());

        let observacao = PEDIDO.observacao ? `Obs.: ${PEDIDO.observacao}` : '';
        $("#resumoObservacao").text(observacao);

        cardapio.metodos.carregarPix();
        cardapio.metodos.carregarCartaoOnline();
        cardapio.metodos.finalizarPedido();

    },

    // QR Code do Pix com o valor exato
    carregarPix: () => {

        let mostrar = PEDIDO.pagamento == 'pix-agora' && PIX.disponivel();

        $("#areaPix").toggleClass('hidden', !mostrar);
        if (!mostrar) return;

        let valor = cardapio.metodos.valorTotal();
        let codigo = PIX.gerarCodigo(valor, PEDIDO.codigo);

        $("#lblValorPix").text(COMUM.formatarMoeda(valor));
        $("#lblAvisoPixEntrega").toggleClass('hidden', cardapio.metodos.taxaEntrega() !== null);
        $("#txtPixCopiaECola").val(codigo);
        $("#qrPix").html('').append(COMUM.desenharQRCode(codigo, 220));

    },

    copiarPix: () => {

        let codigo = $("#txtPixCopiaECola").val();

        let copiado = () => cardapio.metodos.mensagem('Código Pix copiado!', 'green');

        if (navigator.clipboard && window.isSecureContext) {
            navigator.clipboard.writeText(codigo).then(copiado);
        }
        else {
            $("#txtPixCopiaECola").select();
            document.execCommand('copy');
            copiado();
        }

    },

    carregarCartaoOnline: () => {

        let link = (EMPRESA.pagamento || {}).linkCartao;
        let mostrar = PEDIDO.pagamento == 'cartao-online' && !!link;

        $("#areaCartao").toggleClass('hidden', !mostrar);
        $("#btnPagarCartao").attr('href', link || '#');

    },

    // monta a mensagem do pedido e atualiza o link do botão do WhatsApp
    finalizarPedido: () => {

        if (MEU_CARRINHO.length == 0 || PEDIDO == null) return;

        let taxa = cardapio.metodos.taxaEntrega();
        let linhas = [];

        linhas.push(`*NOVO PEDIDO · ${EMPRESA.nome}* #${PEDIDO.codigo}`);
        linhas.push('');

        if (PEDIDO.tipo == 'mesa') {
            linhas.push(`🪑 *Mesa ${PEDIDO.mesa}*`);
        }
        else if (PEDIDO.tipo == 'retirada') {
            linhas.push('🛍️ *Retirada no balcão*');
        }
        else {
            linhas.push('🛵 *Entrega*');
        }

        linhas.push(`Nome: ${PEDIDO.nome}`);

        if (PEDIDO.tipo == 'entrega') {
            let local = cardapio.metodos.textoLocal();
            linhas.push(`Endereço: ${local.titulo}`);
            linhas.push(local.detalhe);
        }

        linhas.push('');
        linhas.push('*Itens*');

        $.each(MEU_CARRINHO, (i, e) => {
            linhas.push(`${e.qntd}x ${e.name} — ${COMUM.formatarMoeda(e.price * e.qntd)}`);
        });

        linhas.push('');
        linhas.push(`Subtotal: ${COMUM.formatarMoeda(VALOR_CARRINHO)}`);

        if (PEDIDO.tipo == 'entrega') {
            linhas.push(`Entrega: ${taxa === null ? 'a combinar' : COMUM.formatarMoeda(taxa)}`);
        }

        let total = COMUM.formatarMoeda(cardapio.metodos.valorTotal());
        linhas.push(`*Total: ${PEDIDO.tipo == 'entrega' && taxa === null ? total + ' + entrega' : total}*`);

        if (PEDIDO.pagamento) {
            linhas.push('');
            linhas.push(`💳 Pagamento: ${cardapio.metodos.textoPagamento()}`);
        }

        if (PEDIDO.observacao) {
            linhas.push(`📝 Obs.: ${PEDIDO.observacao}`);
        }

        $("#btnEtapaResumo").attr('href', COMUM.linkWhatsApp(linhas.join('\n')));

    },

    // depois de abrir o WhatsApp, mostra a confirmação
    pedidoEnviado: () => {

        setTimeout(() => {

            $("#resumoCarrinho").addClass('hidden');
            $("#pedidoEnviado").removeClass('hidden');
            $("#lblCodigoPedido").text('#' + PEDIDO.codigo);
            $("#btnReabrirWhatsapp").attr('href', $("#btnEtapaResumo").attr('href'));

            // quem escolheu Pix ainda precisa do QR Code depois de enviar
            $("#pedidoEnviado .area-pagamento").append($("#areaPix"), $("#areaCartao"));

            $("#btnEtapaResumo, #btnVoltar").addClass('hidden');
            $(".m-footer .container-total").addClass('hidden');
            $("#btnNovoPedido").removeClass('hidden');
            $("#lblTituloEtapa").text('Pedido pronto!');

        }, 500);

    },

    // limpa o carrinho para um novo pedido
    novoPedido: () => {

        // devolve os blocos de pagamento para o resumo
        $("#resumoCarrinho").append($("#areaPix"), $("#areaCartao"));

        MEU_CARRINHO = [];
        PEDIDO = null;

        cardapio.metodos.salvarCarrinho();
        cardapio.metodos.atualizarBadgeTotal();
        $("#txtObservacao, #txtTroco").val('');
        $('input[name="pagamento"]').prop('checked', false);

        cardapio.metodos.abrirCarrinho(false);

    },

    // abre o depoimento
    abrirDepoimento: (depoimento) => {

        $(".depoimento").addClass('hidden');
        $("#botoesDepoimentos a").removeClass('active');

        $("#depoimento-" + depoimento).removeClass('hidden');
        $("#btnDepoimento-" + depoimento).addClass('active');

    },

    // mensagens
    mensagem: (texto, cor = 'red', tempo = 3500) => {

        let id = Math.floor(Date.now() * Math.random()).toString();

        let msg = `<div id="msg-${id}" class="animated fadeInDown toast ${cor}">${texto}</div>`;

        $("#container-mensagens").append(msg);

        setTimeout(() => {
            $("#msg-" + id).removeClass('fadeInDown');
            $("#msg-" + id).addClass('fadeOutUp');
            setTimeout(() => {
                $("#msg-" + id).remove();
            }, 800);
        }, tempo)

    }

}

cardapio.templates = {

    categoria: `
        <a id="menu-{{id}}" class="btn btn-white btn-sm mr-3" onclick="cardapio.metodos.obterItensCardapio('{{id}}')">
            <i class="{{icone}}"></i>&nbsp; {{nome}}
        </a>
    `,

    item: `
        <div class="col-12 col-lg-3 col-md-3 col-sm-6 mb-5 animated fadeInUp">
            <div class="card card-item" id="{{id}}">
                <div class="img-produto">
                    <img src="{{img}}" alt="{{nome}}" loading="lazy" />
                </div>
                <p class="title-produto text-center mt-4">
                    <b>{{nome}}</b>
                </p>
                <p class="dsc-produto text-center">{{descricao}}</p>
                <p class="price-produto text-center">
                    <b>{{preco}}</b>
                </p>
                <div class="add-carrinho">
                    <span class="btn-menos" onclick="cardapio.metodos.diminuirQuantidade('{{id}}')"><i class="fas fa-minus"></i></span>
                    <span class="add-numero-itens" id="qntd-{{id}}">0</span>
                    <span class="btn-mais" onclick="cardapio.metodos.aumentarQuantidade('{{id}}')"><i class="fas fa-plus"></i></span>
                    <span class="btn btn-add" onclick="cardapio.metodos.adicionarAoCarrinho('{{id}}')" title="Adicionar ao carrinho"><i class="fa fa-shopping-bag"></i></span>
                </div>
            </div>
        </div>
    `,

    itemCarrinho: `
        <div class="col-12 item-carrinho">
            <div class="img-produto">
                <img src="{{img}}" alt="{{nome}}" loading="lazy" />
            </div>
            <div class="dados-produto">
                <p class="title-produto"><b>{{nome}}</b></p>
                <p class="price-produto"><b>{{preco}}</b></p>
            </div>
            <div class="add-carrinho">
                <span class="btn-menos" onclick="cardapio.metodos.diminuirQuantidadeCarrinho('{{id}}')"><i class="fas fa-minus"></i></span>
                <span class="add-numero-itens" id="qntd-carrinho-{{id}}">{{qntd}}</span>
                <span class="btn-mais" onclick="cardapio.metodos.aumentarQuantidadeCarrinho('{{id}}')"><i class="fas fa-plus"></i></span>
                <span class="btn btn-remove no-mobile" onclick="cardapio.metodos.removerItemCarrinho('{{id}}')"><i class="fa fa-times"></i></span>
            </div>
        </div>
    `,

    itemResumo: `
        <div class="col-12 item-carrinho resumo">
            <div class="img-produto-resumo">
                <img src="{{img}}" alt="{{nome}}" loading="lazy" />
            </div>
            <div class="dados-produto">
                <p class="title-produto-resumo">
                    <b>{{nome}}</b>
                </p>
                <p class="price-produto-resumo">
                    <b>{{preco}}</b>
                </p>
            </div>
            <p class="quantidade-produto-resumo">
                x <b>{{qntd}}</b>
            </p>
        </div>
    `,

    tipoPedido: `
        <a class="tipo-pedido" data-tipo="{{tipo}}" onclick="cardapio.metodos.selecionarTipo('{{tipo}}')">
            <i class="{{icone}}"></i> {{nome}}
        </a>
    `,

    opcaoPagamento: `
        <label class="opcao-pagamento">
            <input type="radio" name="pagamento" value="{{valor}}" data-titulo="{{titulo}}" />
            <span>
                <b>{{titulo}}</b>
                <small>{{descricao}}</small>
            </span>
        </label>
    `,

    depoimento: `
        <div class="depoimento animated fadeIn hidden" id="depoimento-{{id}}">
            <div class="container-dados-depoimento">
                <div class="imagem-depoimento" style="background-image: url('{{foto}}');"></div>
                <div>
                    <p class="nome-depoimento"><b>{{nome}}</b></p>
                    <p class="nota-depoimento">
                        {{estrelas}}&nbsp; <span>{{nota}}</span>
                    </p>
                </div>
            </div>
            <p class="texto-depoimento">
                <i class="fas fa-quote-left"></i>
                <span>{{texto}}</span>
                <i class="fas fa-quote-right"></i>
            </p>
        </div>
    `

}
