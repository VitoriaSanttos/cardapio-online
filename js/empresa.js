/*
 * ============================================================
 *  CONFIGURAÇÃO DA EMPRESA
 * ============================================================
 *  Este é o arquivo para editar ao montar o site de uma nova
 *  empresa. Os produtos ficam em js/dados.js.
 *
 *  Dicas:
 *  - Deixe um campo vazio ('') para esconder o botão dele.
 *  - Números de WhatsApp: só dígitos, com 55 + DDD + número.
 *  - Depois de editar, abra qrcodes.html para gerar os QR codes.
 * ============================================================
 */

var EMPRESA = {

    // ---------- Identidade ----------
    nome: 'Menu On-line',
    slogan: 'Restaurante & Delivery',
    logo: './img/logo.svg',

    // texto que aparece na página do link da bio (bio.html)
    descricaoBio: 'Comida feita na hora, entregue quentinha na sua casa.',

    // ---------- Cores (qualquer cor CSS) ----------
    cores: {
        primaria: '#ffbf00',   // botões, preços e destaques
        secundaria: '#fff2cc', // fundos claros e cartões
        fundo: '#fffdf7'       // fundo da página
    },

    // ---------- Contato ----------
    whatsapp: '5516993614964',          // recebe os pedidos e reservas
    telefoneExibicao: '(16) 99361-4964', // como o número aparece no site
    instagram: 'https://www.instagram.com/',
    facebook: 'https://www.facebook.com/',

    // endereço da loja (aparece no "Como chegar" e na retirada)
    endereco: 'Rua Exemplo, 123 - Centro, Franca - SP',
    // link do Google Maps; se ficar vazio, é gerado a partir do endereço
    linkMapa: '',

    // ---------- Endereço do site ----------
    // usado nos QR codes. Ex.: 'https://minhaloja.com.br/'
    // se ficar vazio, usa o endereço em que o site está aberto.
    urlSite: '',

    // ---------- Página inicial (index.html) ----------
    site: {
        titulo: 'Escolha sua comida',
        tituloDestaque: 'favorita.',
        descricao: 'Aproveite nosso cardápio! Escolha o que desejar e receba em sua casa de forma rápida e segura.',
        imagemBanner: './img/burguer.png',
        // foto ao lado dos depoimentos
        imagemDepoimentos: './img/cardapio/pizzas/wood-fired-pizzas-best-seller-4-pack.1653bb05922ba153ac178f8365d27f6d.jpg',
        depoimentoBanner: {
            texto: 'Entrega rápida e funcionários simpáticos. A comida chegou quente e muito saborosa!',
            nome: 'Thiago Lopes'
        },
        // mostra a seção "Quer reservar um horário?"
        reservas: true
    },

    depoimentos: [
        {
            nome: 'Diego Pereira',
            nota: 4.5,
            foto: './img/diego.svg',
            texto: 'Muito bom, recomendo demais! Comida muito bem feita pelo chefe, atendimento dentro dos parâmetros e boa comunicação com o cliente.'
        },
        {
            nome: 'Ana Beatriz',
            nota: 5,
            foto: './img/ana.jpg',
            texto: 'Melhor hambúrguer que já comi! O pedido chegou rápido e muito bem embalado.'
        },
        {
            nome: 'João Guilherme',
            nota: 5,
            foto: './img/joao.svg',
            texto: 'Atendimento excelente e comida deliciosa. Já virei cliente!'
        }
    ],

    // ---------- Categorias do cardápio ----------
    // "id" precisa ser igual ao nome da lista em js/dados.js.
    // Ícones: https://fontawesome.com/v5/search?m=free (ex.: 'fas fa-coffee')
    categorias: [
        { id: 'burgers', nome: 'Burgers', icone: 'fas fa-hamburger' },
        { id: 'pizzas', nome: 'Pizzas', icone: 'fas fa-pizza-slice' },
        { id: 'churrasco', nome: 'Churrasco', icone: 'fas fa-drumstick-bite' },
        { id: 'steaks', nome: 'Steaks', icone: 'fas fa-bacon' },
        { id: 'bebidas', nome: 'Bebidas', icone: 'fas fa-cocktail' },
        { id: 'sobremesas', nome: 'Sobremesas', icone: 'fas fa-ice-cream' }
    ],

    // ---------- Pedidos ----------
    pedido: {
        // formas de receber o pedido (true = aparece / false = esconde)
        retirada: true,
        entrega: true,
        mesa: true,

        // quantidade de mesas (gera um QR code para cada uma)
        quantidadeMesas: 10,

        // taxa de entrega em reais. Use null para "a combinar".
        taxaEntrega: 7.5
    },

    // ---------- Pagamento ----------
    pagamento: {
        // Pix com QR Code no valor exato do pedido.
        // Deixe "chave" vazia para não oferecer "Pix agora".
        pix: {
            chave: '',          // CPF, CNPJ, e-mail, telefone (+55...) ou chave aleatória
            nomeRecebedor: '',  // como está no banco (até 25 letras)
            cidade: ''          // cidade do recebedor (até 15 letras)
        },

        // link de pagamento com cartão (Mercado Pago, InfinitePay etc.)
        // Deixe vazio para não oferecer "Cartão online".
        linkCartao: '',

        // formas de pagar na entrega, na retirada ou no caixa
        naEntrega: {
            pix: true,
            cartao: true,
            dinheiro: true
        }
    },

    // ---------- Botões extras do link da bio ----------
    // Aparecem entre "Falar no WhatsApp" e "Como chegar".
    // "mensagem" abre o WhatsApp da loja com o texto já escrito;
    // "url" abre qualquer outro link.
    linksBio: [
        {
            titulo: 'Reservar uma mesa',
            subtitulo: 'Eventos, aniversários e confraternizações',
            icone: 'fas fa-calendar-alt',
            mensagem: 'Olá! Gostaria de fazer uma *reserva*.'
        }
    ]

};
