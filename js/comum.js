/*
 * Funções usadas por todas as páginas (site, link da bio e QR codes).
 * Não é preciso editar este arquivo: os dados da empresa ficam em js/empresa.js.
 */

var COMUM = {

    // aplica as cores da empresa nas variáveis de CSS
    aplicarTema: () => {

        var raiz = document.documentElement.style;
        var cores = EMPRESA.cores || {};

        if (cores.primaria) raiz.setProperty('--color-primary', cores.primaria);
        if (cores.secundaria) raiz.setProperty('--color-secondary', cores.secundaria);
        if (cores.fundo) raiz.setProperty('--color-background', cores.fundo);

    },

    // R$ 1.234,56
    formatarMoeda: (valor) => {
        return 'R$ ' + Number(valor).toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d),)/g, '.');
    },

    // endereço base do site, terminando em "/"
    urlBase: () => {

        var url = (EMPRESA.urlSite || '').trim();

        if (!url) {
            url = window.location.href.split(/[?#]/)[0].replace(/[^/]*$/, '');
        }

        return url.endsWith('/') ? url : url + '/';

    },

    // link do WhatsApp da empresa, com mensagem opcional
    linkWhatsApp: (texto) => {

        var url = 'https://wa.me/' + EMPRESA.whatsapp;
        return texto ? url + '?text=' + encodeURIComponent(texto) : url;

    },

    // link do Google Maps da loja
    linkMapa: () => {

        if (EMPRESA.linkMapa) return EMPRESA.linkMapa;
        if (!EMPRESA.endereco) return '';

        return 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(EMPRESA.endereco);

    },

    // aceita só links seguros (evita "javascript:" vindo de dados cadastrados)
    urlSegura: (url) => {
        url = String(url || '').trim();
        return /^(https?:\/\/|\.\/|tel:|mailto:)/i.test(url) ? url : '';
    },

    // escapa texto antes de colocar no HTML
    escapar: (texto) => {
        return String(texto == null ? '' : texto)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    },

    // desenha um QR code em um <canvas> e devolve o canvas
    desenharQRCode: (texto, tamanho) => {

        var qr = qrcode(0, 'M');
        qr.addData(texto);
        qr.make();

        var modulos = qr.getModuleCount();
        var margem = 4;
        var escala = Math.max(1, Math.floor(tamanho / (modulos + margem * 2)));
        var lado = (modulos + margem * 2) * escala;

        var canvas = document.createElement('canvas');
        canvas.width = lado;
        canvas.height = lado;

        var ctx = canvas.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, lado, lado);
        ctx.fillStyle = '#000000';

        for (var r = 0; r < modulos; r++) {
            for (var c = 0; c < modulos; c++) {
                if (qr.isDark(r, c)) {
                    ctx.fillRect((c + margem) * escala, (r + margem) * escala, escala, escala);
                }
            }
        }

        return canvas;

    }

}

/*
 * Pix "copia e cola" (BR Code), no padrão do Banco Central.
 */
var PIX = {

    disponivel: () => {
        var pix = (EMPRESA.pagamento && EMPRESA.pagamento.pix) || {};
        return !!(pix.chave && pix.nomeRecebedor && pix.cidade);
    },

    // remove acentos e caracteres que os bancos não aceitam
    limpar: (texto, limite) => {
        return String(texto || '')
            .normalize('NFD').replace(/[̀-ͯ]/g, '')
            .replace(/[^A-Za-z0-9 .\-]/g, '')
            .trim()
            .substring(0, limite);
    },

    campo: (id, valor) => {
        return id + String(valor.length).padStart(2, '0') + valor;
    },

    crc16: (texto) => {

        var crc = 0xFFFF;

        for (var i = 0; i < texto.length; i++) {
            crc ^= texto.charCodeAt(i) << 8;
            for (var j = 0; j < 8; j++) {
                crc = (crc & 0x8000) ? ((crc << 1) ^ 0x1021) : (crc << 1);
                crc &= 0xFFFF;
            }
        }

        return crc.toString(16).toUpperCase().padStart(4, '0');

    },

    // gera o código "copia e cola" para o valor informado
    gerarCodigo: (valor, identificador) => {

        var pix = EMPRESA.pagamento.pix;
        var txid = String(identificador || '').replace(/[^A-Za-z0-9]/g, '').substring(0, 25) || '***';

        var codigo =
            PIX.campo('00', '01') +
            PIX.campo('26', PIX.campo('00', 'br.gov.bcb.pix') + PIX.campo('01', pix.chave.trim())) +
            PIX.campo('52', '0000') +
            PIX.campo('53', '986') +
            (valor > 0 ? PIX.campo('54', Number(valor).toFixed(2)) : '') +
            PIX.campo('58', 'BR') +
            PIX.campo('59', PIX.limpar(pix.nomeRecebedor, 25)) +
            PIX.campo('60', PIX.limpar(pix.cidade, 15)) +
            PIX.campo('62', PIX.campo('05', txid)) +
            '6304';

        return codigo + PIX.crc16(codigo);

    }

}

COMUM.aplicarTema();
