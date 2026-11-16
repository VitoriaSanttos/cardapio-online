/*
 * Painel do cardápio: administradores (DuoTech) criam lojas e acessos;
 * donos editam a própria loja, o cardápio, os pedidos e a página da bio.
 */

var banco = supabase.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.chave);

var ESTADO = {
    usuario: null,
    admin: false,
    lojas: [],
    loja: null,        // loja aberta no editor
    categorias: [],
    produtos: [],
    produtoEditando: null
};

var ICONES = [
    ['fas fa-utensils', 'Talheres'],
    ['fas fa-hamburger', 'Hambúrguer'],
    ['fas fa-pizza-slice', 'Pizza'],
    ['fas fa-hotdog', 'Cachorro-quente'],
    ['fas fa-drumstick-bite', 'Frango / carnes'],
    ['fas fa-bacon', 'Bacon / grelhados'],
    ['fas fa-fish', 'Peixes'],
    ['fas fa-egg', 'Ovos / café da manhã'],
    ['fas fa-bread-slice', 'Pães / lanches'],
    ['fas fa-cheese', 'Queijos'],
    ['fas fa-carrot', 'Saladas / legumes'],
    ['fas fa-seedling', 'Vegano'],
    ['fas fa-leaf', 'Natural'],
    ['fas fa-pepper-hot', 'Apimentado'],
    ['fas fa-fire', 'Mais pedidos'],
    ['fas fa-coffee', 'Café'],
    ['fas fa-mug-hot', 'Bebidas quentes'],
    ['fas fa-cocktail', 'Drinks'],
    ['fas fa-glass-martini-alt', 'Coquetéis'],
    ['fas fa-wine-glass-alt', 'Vinhos'],
    ['fas fa-beer', 'Cervejas'],
    ['fas fa-glass-whiskey', 'Destilados'],
    ['fas fa-lemon', 'Sucos'],
    ['fas fa-ice-cream', 'Sorvetes'],
    ['fas fa-birthday-cake', 'Bolos / tortas'],
    ['fas fa-cookie', 'Cookies'],
    ['fas fa-cookie-bite', 'Doces'],
    ['fas fa-candy-cane', 'Confeitaria'],
    ['fas fa-stroopwafel', 'Waffles'],
    ['fas fa-apple-alt', 'Frutas'],
    ['fas fa-gift', 'Presentes'],
    ['fas fa-box', 'Combos / kits'],
    ['fas fa-percent', 'Promoções'],
    ['fas fa-star', 'Destaques'],
    ['fas fa-heart', 'Favoritos'],
    ['fas fa-tag', 'Outros']
];

var ICONES_BIO = [
    ['fas fa-calendar-alt', 'Reserva / agenda'],
    ['fas fa-gift', 'Presentes'],
    ['fas fa-link', 'Link'],
    ['fas fa-motorcycle', 'Delivery'],
    ['fas fa-store', 'Loja'],
    ['fas fa-star', 'Destaque'],
    ['fas fa-heart', 'Favoritos'],
    ['fas fa-percent', 'Promoções'],
    ['fas fa-phone', 'Telefone'],
    ['fas fa-map-marker-alt', 'Localização'],
    ['fas fa-utensils', 'Cardápio'],
    ['fas fa-birthday-cake', 'Encomendas'],
    ['fas fa-coffee', 'Café']
];

// ============================================================
//  utilidades
// ============================================================

var $ = (seletor, raiz) => (raiz || document).querySelector(seletor);
var $$ = (seletor, raiz) => Array.from((raiz || document).querySelectorAll(seletor));

var esc = (texto) => String(texto == null ? '' : texto)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

var mostrar = (seletor, visivel) => $$(seletor).forEach((el) => el.classList.toggle('hidden', !visivel));

var moeda = (valor) => 'R$ ' + Number(valor || 0).toFixed(2).replace('.', ',');

// "12,50" ou "R$ 12,50" => 12.5 (ou null quando vazio/inválido)
var lerDinheiro = (texto) => {
    texto = String(texto || '').replace(/[^\d,.]/g, '');
    if (!texto) return null;
    if (texto.includes(',')) texto = texto.replace(/\./g, '').replace(',', '.');
    var valor = parseFloat(texto);
    return isNaN(valor) ? null : Math.round(valor * 100) / 100;
};

var textoDinheiro = (valor) => valor === null || valor === undefined ? '' : Number(valor).toFixed(2).replace('.', ',');

// "Pizzaria do Zé" => "pizzaria-do-ze"
var gerarSlug = (texto) => String(texto || '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
    .substring(0, 40).replace(/-+$/, '');

var mensagem = (texto, erro) => {
    var div = document.createElement('div');
    div.className = 'mensagem' + (erro ? ' erro' : '');
    div.textContent = texto;
    $('#mensagens').appendChild(div);
    setTimeout(() => div.remove(), erro ? 6000 : 3000);
};

// traduz os erros mais comuns do banco
var erroAmigavel = (erro) => {
    var texto = (erro && (erro.message || erro.erro)) || String(erro || '');

    if (/Invalid login credentials/i.test(texto)) return 'E-mail ou senha incorretos.';
    if (/duplicate key.*slug/i.test(texto)) return 'Esse endereço já está em uso por outra loja.';
    if (/lojas_slug_check/i.test(texto)) return 'Endereço inválido: use de 3 a 40 letras minúsculas, números e hífen.';
    if (/_url_check|instagram_check|facebook_check|link_mapa_check|link_cartao_check/i.test(texto)) return 'Confira os links: eles precisam começar com https://';
    if (/whatsapp_check/i.test(texto)) return 'WhatsApp inválido: use só números, com 55 e o DDD.';
    if (/cor_.*_check/i.test(texto)) return 'Cor inválida.';
    if (/row-level security|permission denied/i.test(texto)) return 'Você não tem permissão para fazer isso.';
    if (/Failed to fetch|NetworkError/i.test(texto)) return 'Sem conexão. Verifique a internet e tente de novo.';
    if (/should be different/i.test(texto)) return 'A nova senha precisa ser diferente da atual.';
    if (/Password should be/i.test(texto)) return 'A senha precisa ter pelo menos 8 caracteres.';

    return 'Não foi possível salvar: ' + texto;
};

var opcoesIcones = (lista, selecionado) => lista.map((i) =>
    `<option value="${esc(i[0])}"${i[0] == selecionado ? ' selected' : ''}>${esc(i[1])}</option>`
).join('');

// trava o botão enquanto a ação roda
var comBotao = async (botao, acao) => {
    if (botao) botao.disabled = true;
    try {
        return await acao();
    } finally {
        if (botao) botao.disabled = false;
    }
};

// lê/escreve "site.titulo" dentro do objeto da loja
var lerCaminho = (obj, caminho) => caminho.split('.').reduce((o, c) => (o == null ? undefined : o[c]), obj);
var escreverCaminho = (obj, caminho, valor) => {
    var partes = caminho.split('.');
    var ultimo = partes.pop();
    var alvo = partes.reduce((o, c) => (o[c] = o[c] && typeof o[c] == 'object' ? o[c] : {}), obj);
    alvo[ultimo] = valor;
};

// ============================================================
//  imagens
// ============================================================

var PREFIXO_IMAGENS = '/storage/v1/object/public/imagens/';

// reduz a foto antes de enviar (fotos de celular costumam ter 4 MB ou mais)
var redimensionar = (arquivo, tamanhoMaximo, manterTransparencia) => new Promise((resolve, reject) => {

    var url = URL.createObjectURL(arquivo);
    var img = new Image();

    img.onload = () => {
        var escala = Math.min(1, tamanhoMaximo / Math.max(img.width, img.height));
        var canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * escala);
        canvas.height = Math.round(img.height * escala);

        var ctx = canvas.getContext('2d');
        var tipo = manterTransparencia ? 'image/png' : 'image/jpeg';

        if (!manterTransparencia) {
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }

        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        URL.revokeObjectURL(url);

        canvas.toBlob((blob) => blob ? resolve({ blob: blob, tipo: tipo }) : reject(new Error('imagem')), tipo, 0.85);
    };

    img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Não foi possível ler esta imagem.'));
    };

    img.src = url;

});

var enviarImagem = async (arquivo, tipo) => {

    if (!/^image\/(png|jpeg|webp|gif)$/.test(arquivo.type)) {
        throw new Error('Use uma imagem PNG, JPG, WEBP ou GIF.');
    }

    var transparencia = tipo == 'logo' || arquivo.type == 'image/png';
    var tamanho = tipo == 'logo' ? 600 : 1200;
    var reduzida = await redimensionar(arquivo, tamanho, transparencia);
    var extensao = reduzida.tipo == 'image/png' ? 'png' : 'jpg';
    var caminho = `${ESTADO.loja.id}/${tipo}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${extensao}`;

    var envio = await banco.storage.from('imagens').upload(caminho, reduzida.blob, {
        contentType: reduzida.tipo,
        cacheControl: '31536000',
        upsert: false
    });

    if (envio.error) throw envio.error;

    return banco.storage.from('imagens').getPublicUrl(caminho).data.publicUrl;

};

// apaga do armazenamento uma imagem que foi trocada (sem travar se falhar)
var apagarImagem = (url) => {
    var posicao = String(url || '').indexOf(PREFIXO_IMAGENS);
    if (posicao < 0) return;
    banco.storage.from('imagens').remove([url.substring(posicao + PREFIXO_IMAGENS.length)]).catch(() => { });
};

// liga um bloco .campo-imagem ao envio de arquivo
var prepararCampoImagem = (bloco, aoMudar) => {

    var input = $('input[type="file"]', bloco);
    var previa = $('.imagem-previa img', bloco);

    bloco.definir = (url) => {
        bloco.dataset.valor = url || '';
        previa.src = url || '';
        $('.remover-imagem', bloco).classList.toggle('hidden', !url);
    };

    bloco.valor = () => bloco.dataset.valor || '';

    input.addEventListener('change', async () => {
        var arquivo = input.files[0];
        input.value = '';
        if (!arquivo) return;

        bloco.classList.add('enviando');
        try {
            var url = await enviarImagem(arquivo, bloco.dataset.tipo || 'foto');
            bloco.definir(url);
            if (aoMudar) aoMudar(url);
        } catch (erro) {
            mensagem(erro.message || erroAmigavel(erro), true);
        } finally {
            bloco.classList.remove('enviando');
        }
    });

    $('.remover-imagem', bloco).addEventListener('click', () => {
        bloco.definir('');
        if (aoMudar) aoMudar('');
    });

};

// ============================================================
//  login e sessão
// ============================================================

var PAINEL = {

    iniciar: async () => {

        PAINEL.prepararEventos();

        var sessao = await banco.auth.getSession();

        if (sessao.data.session) {
            await PAINEL.entrou(sessao.data.session.user);
        }
        else {
            PAINEL.telaLogin();
        }

        banco.auth.onAuthStateChange((evento) => {
            if (evento == 'SIGNED_OUT') PAINEL.telaLogin();
        });

    },

    telaLogin: () => {
        mostrar('#telaCarregando, #telaApp', false);
        mostrar('#telaLogin', true);
        $('#loginEmail').focus();
    },

    entrar: async (e) => {

        e.preventDefault();

        await comBotao($('#formLogin button[type="submit"]'), async () => {
            var resultado = await banco.auth.signInWithPassword({
                email: $('#loginEmail').value.trim(),
                password: $('#loginSenha').value
            });

            if (resultado.error) {
                mensagem(erroAmigavel(resultado.error), true);
                return;
            }

            $('#loginSenha').value = '';
            await PAINEL.entrou(resultado.data.user);
        });

    },

    entrou: async (usuario) => {

        ESTADO.usuario = usuario;
        $('#lblUsuario').textContent = usuario.email;

        var admin = await banco.from('admins').select('user_id').eq('user_id', usuario.id).maybeSingle();
        ESTADO.admin = !!admin.data;

        mostrar('.so-admin', ESTADO.admin);
        mostrar('#telaCarregando, #telaLogin', false);
        mostrar('#telaApp', true);

        await PAINEL.carregarLojas();

        // dono com uma loja só vai direto para ela
        if (!ESTADO.admin && ESTADO.lojas.length == 1) {
            await PAINEL.abrirLoja(ESTADO.lojas[0].id);
        }
        else {
            PAINEL.telaLojas();
        }

    },

    sair: async () => {
        await banco.auth.signOut();
        ESTADO.usuario = null;
        ESTADO.loja = null;
    },

    trocarSenha: async (e) => {

        e.preventDefault();

        var senha = $('#novaSenha').value;

        if (senha != $('#novaSenha2').value) {
            mensagem('As senhas não são iguais.', true);
            return;
        }

        await comBotao($('#formSenha button[type="submit"]'), async () => {
            var resultado = await banco.auth.updateUser({ password: senha });

            if (resultado.error) {
                mensagem(erroAmigavel(resultado.error), true);
                return;
            }

            $('#formSenha').reset();
            $('#dlgSenha').close();
            mensagem('Senha alterada!');
        });

    },

    // ============================================================
    //  lojas
    // ============================================================

    carregarLojas: async () => {

        var consulta = banco.from('lojas').select('*').order('nome');

        // a leitura pública mostra todas as lojas ativas: o dono só lista as dele
        if (!ESTADO.admin) {
            var acessos = await banco.from('loja_usuarios').select('loja_id').eq('user_id', ESTADO.usuario.id);
            var ids = (acessos.data || []).map((a) => a.loja_id);
            if (ids.length == 0) {
                ESTADO.lojas = [];
                return;
            }
            consulta = consulta.in('id', ids);
        }

        var resultado = await consulta;

        if (resultado.error) {
            mensagem(erroAmigavel(resultado.error), true);
            ESTADO.lojas = [];
            return;
        }

        ESTADO.lojas = resultado.data;

    },

    telaLojas: () => {

        ESTADO.loja = null;
        mostrar('#telaLoja', false);
        mostrar('#telaLojas', true);

        $('#listaLojas').innerHTML = ESTADO.lojas.map((loja) => `
            <div class="item-loja">
                <img src="${esc(loja.logo_url || './img/logo.svg')}" alt="" />
                <div class="item-loja-dados">
                    <b>${esc(loja.nome)}</b>
                    <small>?loja=${esc(loja.slug)}</small>
                </div>
                ${loja.ativa ? '' : '<span class="selo selo-alerta">Desativada</span>'}
                <div class="item-loja-acoes">
                    <a class="botao pequeno" target="_blank" href="index.html?loja=${encodeURIComponent(loja.slug)}"><i class="fas fa-external-link-alt"></i> Ver</a>
                    <button type="button" class="botao pequeno principal" data-abrir="${esc(loja.id)}"><i class="fas fa-pen"></i> Editar</button>
                </div>
            </div>
        `).join('');

        mostrar('#semLojas', !ESTADO.admin && ESTADO.lojas.length == 0);
        window.scrollTo(0, 0);

    },

    criarLoja: async (e) => {

        e.preventDefault();

        await comBotao($('#formNovaLoja button[type="submit"]'), async () => {
            var resultado = await banco.from('lojas').insert({
                nome: $('#novaLojaNome').value.trim(),
                slug: $('#novaLojaSlug').value.trim()
            }).select().single();

            if (resultado.error) {
                mensagem(erroAmigavel(resultado.error), true);
                return;
            }

            $('#formNovaLoja').reset();
            delete $('#novaLojaSlug').dataset.editado;
            ESTADO.lojas.push(resultado.data);
            mensagem('Loja criada! Agora preencha os dados dela.');
            await PAINEL.abrirLoja(resultado.data.id);
        });

    },

    abrirLoja: async (id) => {

        var loja = ESTADO.lojas.find((l) => l.id == id);
        if (!loja) return;

        ESTADO.loja = JSON.parse(JSON.stringify(loja));

        mostrar('#telaLojas', false);
        mostrar('#telaLoja', true);
        mostrar('#btnVoltarLojas', ESTADO.admin || ESTADO.lojas.length > 1);

        PAINEL.atualizarCabecalho();
        PAINEL.preencherFormularios();
        PAINEL.trocarAba('abaLoja');

        await PAINEL.carregarCardapio();

        if (ESTADO.admin) {
            PAINEL.carregarAcessos();
        }

        window.scrollTo(0, 0);

    },

    atualizarCabecalho: () => {

        var loja = ESTADO.loja;
        var slug = encodeURIComponent(loja.slug);

        $('#lblNomeLoja').textContent = loja.nome;
        mostrar('#lblLojaInativa', !loja.ativa);
        $('#lnkCardapio').href = `index.html?loja=${slug}`;
        $('#lnkBio').href = `bio.html?loja=${slug}`;
        $('#lnkQr').href = `qrcodes.html?loja=${slug}`;

    },

    trocarAba: (id) => {

        $$('#abas button').forEach((b) => b.classList.toggle('active', b.dataset.aba == id));
        $$('#telaLoja .aba').forEach((aba) => aba.classList.toggle('hidden', aba.id != id));

    },

    // ============================================================
    //  formulários da loja (Loja, Pedidos e pagamento, Página e bio)
    // ============================================================

    preencherFormularios: () => {

        var loja = ESTADO.loja;
        loja.site = loja.site || {};

        $$('.form-loja [data-campo]').forEach((campo) => {
            var valor = lerCaminho(loja, campo.dataset.campo);

            if (campo.classList.contains('campo-imagem')) {
                campo.definir(valor || '');
            }
            else if (campo.type == 'checkbox') {
                // "site.reservas" vem ligado quando não foi configurado
                campo.checked = campo.dataset.campo == 'site.reservas' ? valor !== false : !!valor;
            }
            else if (campo.dataset.tipo == 'dinheiro') {
                campo.value = textoDinheiro(valor);
            }
            else {
                campo.value = valor == null ? '' : valor;
            }
        });

        // taxa "a combinar" é guardada como vazio (null)
        $('#chkTaxaCombinar').checked = loja.taxa_entrega === null;
        $('[data-campo="taxa_entrega"]').disabled = loja.taxa_entrega === null;

        PAINEL.desenharLinksBio(loja.links_bio || []);
        PAINEL.desenharDepoimentos(loja.depoimentos || []);

        $('#txtSlug').value = loja.slug;
        $('#chkLojaAtiva').checked = loja.ativa;

    },

    lerFormulario: (form) => {

        var dados = {};
        var site = JSON.parse(JSON.stringify(ESTADO.loja.site || {}));
        var usaSite = false;

        $$('[data-campo]', form).forEach((campo) => {
            var nome = campo.dataset.campo;
            var valor;

            if (campo.classList.contains('campo-imagem')) valor = campo.valor();
            else if (campo.type == 'checkbox') valor = campo.checked;
            else if (campo.type == 'number') valor = parseInt(campo.value, 10) || 0;
            else if (campo.dataset.tipo == 'dinheiro') valor = lerDinheiro(campo.value) || 0;
            else if (campo.dataset.tipo == 'telefone') valor = campo.value.replace(/\D/g, '');
            else valor = campo.value.trim();

            if (nome.indexOf('site.') == 0) {
                escreverCaminho({ site: site }, nome, valor);
                usaSite = true;
            }
            else {
                dados[nome] = valor;
            }
        });

        if (usaSite) dados.site = site;

        return dados;

    },

    salvarLoja: async (dados, botao) => {

        var anterior = ESTADO.loja;

        return comBotao(botao, async () => {
            var resultado = await banco.from('lojas').update(dados).eq('id', anterior.id).select().single();

            if (resultado.error) {
                mensagem(erroAmigavel(resultado.error), true);
                return false;
            }

            // apaga imagens que foram trocadas
            ['logo_url', 'site.imagemBanner', 'site.imagemDepoimentos'].forEach((campo) => {
                var antes = lerCaminho(anterior, campo);
                if (antes && antes != lerCaminho(resultado.data, campo)) apagarImagem(antes);
            });

            ESTADO.loja = resultado.data;
            var indice = ESTADO.lojas.findIndex((l) => l.id == resultado.data.id);
            if (indice >= 0) ESTADO.lojas[indice] = resultado.data;

            PAINEL.atualizarCabecalho();
            mensagem('Salvo! O cardápio já está atualizado.');
            return true;
        });

    },

    enviarFormulario: async (e) => {

        e.preventDefault();

        var form = e.target;
        var dados = PAINEL.lerFormulario(form);

        if (form.id == 'abaPedidos') {
            dados.taxa_entrega = $('#chkTaxaCombinar').checked ? null : (lerDinheiro($('[data-campo="taxa_entrega"]').value) || 0);
        }

        if (form.id == 'abaPagina') {
            dados.links_bio = PAINEL.lerLinksBio();
            dados.depoimentos = PAINEL.lerDepoimentos();
            if (dados.links_bio === null) return;
        }

        await PAINEL.salvarLoja(dados, $('button[type="submit"]', form));

    },

    // ---------- botões da bio ----------

    desenharLinksBio: (links) => {

        $('#listaLinksBio').innerHTML = '';
        links.forEach((link) => PAINEL.adicionarLinkBio(link));

    },

    adicionarLinkBio: (link) => {

        link = link || { icone: 'fas fa-calendar-alt' };
        var tipo = link.url ? 'url' : 'mensagem';

        var div = document.createElement('div');
        div.className = 'linha-editavel';
        div.innerHTML = `
            <select class="icone" aria-label="Ícone">${opcoesIcones(ICONES_BIO, link.icone)}</select>
            <input class="titulo" maxlength="60" placeholder="Título (ex.: Reservar o espaço)" value="${esc(link.titulo)}" />
            <input class="subtitulo" maxlength="80" placeholder="Texto menor (opcional)" value="${esc(link.subtitulo)}" />
            <button type="button" class="botao pequeno icone remover" title="Remover"><i class="fas fa-trash-alt"></i></button>
            <select class="tipo">
                <option value="mensagem"${tipo == 'mensagem' ? ' selected' : ''}>Abre o WhatsApp com a mensagem:</option>
                <option value="url"${tipo == 'url' ? ' selected' : ''}>Abre o link:</option>
            </select>
            <input class="valor largura-total" maxlength="300" value="${esc(link.url || link.mensagem)}"
                placeholder="Ex.: Olá! Gostaria de reservar o espaço." />
        `;

        $('.tipo', div).style.gridColumn = '1 / 3';
        $('.valor', div).style.gridColumn = '3 / -1';
        $('.remover', div).addEventListener('click', () => div.remove());

        $('#listaLinksBio').appendChild(div);

    },

    lerLinksBio: () => {

        var links = [];
        var valido = true;

        $$('#listaLinksBio .linha-editavel').forEach((linha) => {
            var titulo = $('.titulo', linha).value.trim();
            var valor = $('.valor', linha).value.trim();
            if (!titulo && !valor) return;

            var link = {
                titulo: titulo,
                subtitulo: $('.subtitulo', linha).value.trim(),
                icone: $('.icone', linha).value
            };

            if ($('.tipo', linha).value == 'url') {
                if (!/^https?:\/\//i.test(valor)) {
                    mensagem(`O link do botão "${titulo}" precisa começar com https://`, true);
                    valido = false;
                }
                link.url = valor;
            }
            else {
                link.mensagem = valor;
            }

            links.push(link);
        });

        return valido ? links : null;

    },

    // ---------- depoimentos ----------

    desenharDepoimentos: (depoimentos) => {

        $('#listaDepoimentos').innerHTML = '';
        depoimentos.forEach((d) => PAINEL.adicionarDepoimento(d));

    },

    adicionarDepoimento: (depoimento) => {

        depoimento = depoimento || { nota: 5 };

        var div = document.createElement('div');
        div.className = 'linha-editavel depoimento';
        div.innerHTML = `
            <input class="nome" maxlength="60" placeholder="Nome do cliente" value="${esc(depoimento.nome)}" />
            <select class="nota" aria-label="Nota">
                ${[5, 4.5, 4, 3.5, 3].map((n) => `<option value="${n}"${Number(depoimento.nota) == n ? ' selected' : ''}>${n} ★</option>`).join('')}
            </select>
            <button type="button" class="botao pequeno icone remover" title="Remover"><i class="fas fa-trash-alt"></i></button>
            <textarea class="texto largura-total" maxlength="300" rows="2" placeholder="O que o cliente disse">${esc(depoimento.texto)}</textarea>
        `;

        $('.remover', div).addEventListener('click', () => div.remove());
        $('#listaDepoimentos').appendChild(div);

    },

    lerDepoimentos: () => {

        return $$('#listaDepoimentos .linha-editavel')
            .map((linha) => ({
                nome: $('.nome', linha).value.trim(),
                nota: Number($('.nota', linha).value),
                texto: $('.texto', linha).value.trim()
            }))
            .filter((d) => d.nome && d.texto);

    },

    // ============================================================
    //  cardápio
    // ============================================================

    carregarCardapio: async () => {

        var lojaId = ESTADO.loja.id;

        var resultados = await Promise.all([
            banco.from('categorias').select('*').eq('loja_id', lojaId).order('ordem').order('criado_em'),
            banco.from('produtos').select('*').eq('loja_id', lojaId).order('ordem').order('criado_em')
        ]);

        if (resultados[0].error || resultados[1].error) {
            mensagem(erroAmigavel(resultados[0].error || resultados[1].error), true);
            return;
        }

        ESTADO.categorias = resultados[0].data;
        ESTADO.produtos = resultados[1].data;

        PAINEL.desenharCardapio();

    },

    desenharCardapio: () => {

        var html = ESTADO.categorias.map((categoria, indice) => {

            var produtos = ESTADO.produtos.filter((p) => p.categoria_id == categoria.id);

            var linhas = produtos.map((p, i) => `
                <div class="produto${p.ativo ? '' : ' inativo'}" data-produto="${esc(p.id)}">
                    <img src="${esc(p.imagem_url || './img/sem-imagem.svg')}" alt="" loading="lazy" />
                    <div class="produto-dados">
                        <b>${esc(p.nome)}</b>
                        <small>${moeda(p.preco)}${p.descricao ? ' · ' + esc(p.descricao) : ''}</small>
                    </div>
                    <label class="opcao"><input type="checkbox" data-acao="disponivel"${p.ativo ? ' checked' : ''} /> Disponível</label>
                    <div class="produto-acoes">
                        <button type="button" class="botao pequeno icone" data-acao="subir-produto" title="Subir"${i == 0 ? ' disabled' : ''}><i class="fas fa-arrow-up"></i></button>
                        <button type="button" class="botao pequeno icone" data-acao="descer-produto" title="Descer"${i == produtos.length - 1 ? ' disabled' : ''}><i class="fas fa-arrow-down"></i></button>
                        <button type="button" class="botao pequeno" data-acao="editar-produto"><i class="fas fa-pen"></i> Editar</button>
                        <button type="button" class="botao pequeno icone perigo" data-acao="excluir-produto" title="Excluir"><i class="fas fa-trash-alt"></i></button>
                    </div>
                </div>
            `).join('');

            return `
                <div class="cartao categoria${categoria.ativa ? '' : ' inativa'}" data-categoria="${esc(categoria.id)}">
                    <div class="categoria-topo">
                        <i class="${esc(categoria.icone)} icone-previa"></i>
                        <select data-acao="icone-categoria" aria-label="Ícone">${opcoesIcones(ICONES, categoria.icone)}</select>
                        <input type="text" data-acao="nome-categoria" maxlength="60" value="${esc(categoria.nome)}" aria-label="Nome da categoria" />
                        <label class="opcao"><input type="checkbox" data-acao="ativa-categoria"${categoria.ativa ? ' checked' : ''} /> Visível</label>
                        <button type="button" class="botao pequeno icone" data-acao="subir-categoria" title="Subir"${indice == 0 ? ' disabled' : ''}><i class="fas fa-arrow-up"></i></button>
                        <button type="button" class="botao pequeno icone" data-acao="descer-categoria" title="Descer"${indice == ESTADO.categorias.length - 1 ? ' disabled' : ''}><i class="fas fa-arrow-down"></i></button>
                        <button type="button" class="botao pequeno icone perigo" data-acao="excluir-categoria" title="Excluir categoria"><i class="fas fa-trash-alt"></i></button>
                    </div>
                    <div class="produtos">
                        ${linhas || '<p class="produtos-vazio">Nenhum produto nesta categoria ainda.</p>'}
                    </div>
                    <div class="categoria-rodape">
                        <button type="button" class="botao pequeno" data-acao="novo-produto"><i class="fas fa-plus"></i> Adicionar produto</button>
                    </div>
                </div>
            `;

        }).join('');

        $('#listaCategorias').innerHTML = html || '<p class="cartao vazio">Comece criando uma categoria, por exemplo "Lanches" ou "Bebidas".</p>';

    },

    // cliques e mudanças dentro da lista do cardápio
    acaoCardapio: async (e) => {

        var alvo = e.target.closest('[data-acao]');
        if (!alvo) return;

        var acao = alvo.dataset.acao;
        var blocoCategoria = alvo.closest('[data-categoria]');
        var blocoProduto = alvo.closest('[data-produto]');
        var categoria = blocoCategoria && ESTADO.categorias.find((c) => c.id == blocoCategoria.dataset.categoria);
        var produto = blocoProduto && ESTADO.produtos.find((p) => p.id == blocoProduto.dataset.produto);

        // campos de texto e seleção salvam no "change"; botões no "click"
        var ehCampo = ['nome-categoria', 'icone-categoria', 'ativa-categoria', 'disponivel'].indexOf(acao) >= 0;
        if (ehCampo != (e.type == 'change')) return;

        switch (acao) {

            case 'nome-categoria':
                if (!alvo.value.trim()) {
                    alvo.value = categoria.nome;
                    return;
                }
                await PAINEL.atualizar('categorias', categoria, { nome: alvo.value.trim() });
                break;

            case 'icone-categoria':
                blocoCategoria.querySelector('.icone-previa').className = alvo.value + ' icone-previa';
                await PAINEL.atualizar('categorias', categoria, { icone: alvo.value });
                break;

            case 'ativa-categoria':
                await PAINEL.atualizar('categorias', categoria, { ativa: alvo.checked });
                PAINEL.desenharCardapio();
                break;

            case 'disponivel':
                await PAINEL.atualizar('produtos', produto, { ativo: alvo.checked });
                PAINEL.desenharCardapio();
                break;

            case 'subir-categoria':
            case 'descer-categoria':
                await PAINEL.mover('categorias', ESTADO.categorias, categoria, acao.indexOf('subir') == 0 ? -1 : 1);
                break;

            case 'subir-produto':
            case 'descer-produto':
                await PAINEL.mover('produtos', ESTADO.produtos.filter((p) => p.categoria_id == produto.categoria_id), produto, acao.indexOf('subir') == 0 ? -1 : 1);
                break;

            case 'excluir-categoria':
                var quantidade = ESTADO.produtos.filter((p) => p.categoria_id == categoria.id).length;
                if (!confirm(`Excluir a categoria "${categoria.nome}"` + (quantidade ? ` e os ${quantidade} produtos dela?` : '?'))) return;
                if (await PAINEL.excluir('categorias', categoria)) {
                    ESTADO.produtos.filter((p) => p.categoria_id == categoria.id).forEach((p) => apagarImagem(p.imagem_url));
                    ESTADO.produtos = ESTADO.produtos.filter((p) => p.categoria_id != categoria.id);
                }
                break;

            case 'excluir-produto':
                if (!confirm(`Excluir "${produto.nome}"?`)) return;
                if (await PAINEL.excluir('produtos', produto)) apagarImagem(produto.imagem_url);
                break;

            case 'novo-produto':
                PAINEL.abrirProduto(null, categoria.id);
                break;

            case 'editar-produto':
                PAINEL.abrirProduto(produto);
                break;

        }

    },

    atualizar: async (tabela, registro, dados) => {

        var resultado = await banco.from(tabela).update(dados).eq('id', registro.id).select().single();

        if (resultado.error) {
            mensagem(erroAmigavel(resultado.error), true);
            PAINEL.desenharCardapio();
            return false;
        }

        Object.assign(registro, resultado.data);
        mensagem('Salvo!');
        return true;

    },

    excluir: async (tabela, registro) => {

        var resultado = await banco.from(tabela).delete().eq('id', registro.id);

        if (resultado.error) {
            mensagem(erroAmigavel(resultado.error), true);
            return false;
        }

        var lista = tabela == 'categorias' ? 'categorias' : 'produtos';
        ESTADO[lista] = ESTADO[lista].filter((r) => r.id != registro.id);
        PAINEL.desenharCardapio();
        mensagem('Excluído.');
        return true;

    },

    // troca a posição com o vizinho e grava a nova ordem
    mover: async (tabela, lista, registro, direcao) => {

        var ordenada = lista.slice();
        var indice = ordenada.indexOf(registro);
        var destino = indice + direcao;

        if (destino < 0 || destino >= ordenada.length) return;

        ordenada.splice(indice, 1);
        ordenada.splice(destino, 0, registro);

        var mudancas = [];
        ordenada.forEach((r, i) => {
            if (r.ordem != i) {
                r.ordem = i;
                mudancas.push(banco.from(tabela).update({ ordem: i }).eq('id', r.id));
            }
        });

        // reordena a lista do estado na mesma ordem
        var chave = tabela == 'categorias' ? 'categorias' : 'produtos';
        ESTADO[chave].sort((a, b) => a.ordem - b.ordem);
        PAINEL.desenharCardapio();

        var resultados = await Promise.all(mudancas);
        var erro = resultados.find((r) => r.error);
        if (erro) mensagem(erroAmigavel(erro.error), true);

    },

    criarCategoria: async (e) => {

        e.preventDefault();

        await comBotao($('#formNovaCategoria button[type="submit"]'), async () => {
            var resultado = await banco.from('categorias').insert({
                loja_id: ESTADO.loja.id,
                nome: $('#novaCategoriaNome').value.trim(),
                icone: $('#novaCategoriaIcone').value,
                ordem: ESTADO.categorias.length
            }).select().single();

            if (resultado.error) {
                mensagem(erroAmigavel(resultado.error), true);
                return;
            }

            ESTADO.categorias.push(resultado.data);
            $('#novaCategoriaNome').value = '';
            PAINEL.desenharCardapio();
            mensagem('Categoria criada!');
        });

    },

    // ---------- produto ----------

    abrirProduto: (produto, categoriaId) => {

        ESTADO.produtoEditando = produto;

        $('#lblTituloProduto').textContent = produto ? 'Editar produto' : 'Novo produto';
        $('#produtoNome').value = produto ? produto.nome : '';
        $('#produtoDescricao').value = produto ? produto.descricao : '';
        $('#produtoPreco').value = produto ? textoDinheiro(produto.preco) : '';
        $('#produtoAtivo').checked = produto ? produto.ativo : true;
        $('#produtoCategoria').innerHTML = ESTADO.categorias.map((c) =>
            `<option value="${esc(c.id)}">${esc(c.nome)}</option>`
        ).join('');
        $('#produtoCategoria').value = produto ? produto.categoria_id : categoriaId;
        $('#imagemProduto').definir(produto ? produto.imagem_url : '');

        $('#dlgProduto').showModal();
        $('#produtoNome').focus();

    },

    salvarProduto: async (e) => {

        e.preventDefault();

        var preco = lerDinheiro($('#produtoPreco').value);

        if (preco === null) {
            mensagem('Informe o preço, por exemplo 12,50.', true);
            $('#produtoPreco').focus();
            return;
        }

        var produto = ESTADO.produtoEditando;
        var categoriaId = $('#produtoCategoria').value;
        var dados = {
            nome: $('#produtoNome').value.trim(),
            descricao: $('#produtoDescricao').value.trim(),
            preco: preco,
            categoria_id: categoriaId,
            imagem_url: $('#imagemProduto').valor(),
            ativo: $('#produtoAtivo').checked
        };

        // mudou de categoria (ou é novo): vai para o fim da lista
        if (!produto || produto.categoria_id != categoriaId) {
            dados.ordem = ESTADO.produtos.filter((p) => p.categoria_id == categoriaId).length;
        }

        await comBotao($('#formProduto button[type="submit"]'), async () => {
            var resultado = produto
                ? await banco.from('produtos').update(dados).eq('id', produto.id).select().single()
                : await banco.from('produtos').insert(Object.assign({ loja_id: ESTADO.loja.id }, dados)).select().single();

            if (resultado.error) {
                mensagem(erroAmigavel(resultado.error), true);
                return;
            }

            if (produto) {
                if (produto.imagem_url && produto.imagem_url != resultado.data.imagem_url) apagarImagem(produto.imagem_url);
                Object.assign(produto, resultado.data);
            }
            else {
                ESTADO.produtos.push(resultado.data);
            }

            ESTADO.produtos.sort((a, b) => a.ordem - b.ordem);
            $('#dlgProduto').close();
            PAINEL.desenharCardapio();
            mensagem('Produto salvo!');
        });

    },

    cancelarProduto: () => {

        // foto enviada mas não salva: apaga para não sobrar no armazenamento
        var foto = $('#imagemProduto').valor();
        var original = ESTADO.produtoEditando ? ESTADO.produtoEditando.imagem_url : '';
        if (foto && foto != original) apagarImagem(foto);

        $('#dlgProduto').close();

    },

    // ============================================================
    //  acessos e status (administradores)
    // ============================================================

    carregarAcessos: async () => {

        var resultado = await banco.from('loja_usuarios').select('user_id, email, criado_em').eq('loja_id', ESTADO.loja.id).order('criado_em');

        if (resultado.error) {
            $('#listaAcessos').innerHTML = '<p class="dica">Não foi possível carregar os acessos.</p>';
            return;
        }

        $('#listaAcessos').innerHTML = resultado.data.length == 0
            ? '<p class="dica">Ninguém tem acesso a esta loja ainda. Crie o acesso do dono abaixo.</p>'
            : resultado.data.map((a) => `
                <div class="acesso">
                    <span><i class="fas fa-users"></i> ${esc(a.email || a.user_id)}</span>
                    <button type="button" class="botao pequeno perigo" data-remover-acesso="${esc(a.user_id)}">Remover acesso</button>
                </div>
            `).join('');

    },

    removerAcesso: async (userId) => {

        if (!confirm('Remover o acesso desta pessoa ao painel desta loja?')) return;

        var resultado = await banco.from('loja_usuarios').delete().eq('loja_id', ESTADO.loja.id).eq('user_id', userId);

        if (resultado.error) {
            mensagem(erroAmigavel(resultado.error), true);
            return;
        }

        mensagem('Acesso removido.');
        PAINEL.carregarAcessos();

    },

    criarAcesso: async (e) => {

        e.preventDefault();

        var email = $('#acessoEmail').value.trim().toLowerCase();
        var senha = $('#acessoSenha').value;

        await comBotao($('#formAcesso button[type="submit"]'), async () => {
            var resultado = await banco.functions.invoke('criar-acesso', {
                body: { loja_id: ESTADO.loja.id, email: email, senha: senha }
            });

            var corpo = resultado.data;

            // erros da função chegam com o corpo da resposta
            if (resultado.error) {
                try {
                    corpo = await resultado.error.context.json();
                } catch (x) {
                    corpo = { erro: resultado.error.message };
                }
            }

            if (!corpo || !corpo.ok) {
                mensagem((corpo && corpo.erro) || 'Não foi possível criar o acesso.', true);
                return;
            }

            var painel = window.location.href.split(/[?#]/)[0];

            $('#txtMensagemAcesso').value =
                `Olá! Seu cardápio online (${ESTADO.loja.nome}) já tem painel para você editar o logo, os dados da loja e os produtos.\n\n` +
                `Painel: ${painel}\nE-mail: ${email}\nSenha: ${senha}\n\n` +
                `Depois de entrar, troque a senha em "Trocar senha".`;

            mostrar('#resultadoAcesso', true);
            mensagem(corpo.mensagem);
            PAINEL.carregarAcessos();
        });

    },

    gerarSenha: () => {

        var letras = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        var aleatorio = new Uint32Array(10);
        crypto.getRandomValues(aleatorio);
        $('#acessoSenha').value = Array.from(aleatorio).map((n) => letras[n % letras.length]).join('');

    },

    salvarStatus: async (e) => {

        e.preventDefault();

        var slugAntigo = ESTADO.loja.slug;
        var slug = $('#txtSlug').value.trim();

        if (slug != slugAntigo && !confirm('Mudar o endereço faz os QR codes já impressos pararem de funcionar. Continuar?')) {
            return;
        }

        await PAINEL.salvarLoja({ slug: slug, ativa: $('#chkLojaAtiva').checked }, $('#formStatusLoja button[type="submit"]'));

    },

    excluirLoja: async () => {

        var loja = ESTADO.loja;
        var confirmacao = prompt(`Para excluir, digite o endereço da loja: ${loja.slug}`);
        if (confirmacao === null) return;

        if (confirmacao.trim() != loja.slug) {
            mensagem('O endereço digitado não confere. Nada foi excluído.', true);
            return;
        }

        // apaga as imagens antes, enquanto ainda temos permissão na pasta da loja
        var arquivos = await banco.storage.from('imagens').list(loja.id, { limit: 1000 });
        if (arquivos.data && arquivos.data.length) {
            await banco.storage.from('imagens').remove(arquivos.data.map((a) => `${loja.id}/${a.name}`));
        }

        var resultado = await banco.from('lojas').delete().eq('id', loja.id);

        if (resultado.error) {
            mensagem(erroAmigavel(resultado.error), true);
            return;
        }

        ESTADO.lojas = ESTADO.lojas.filter((l) => l.id != loja.id);
        mensagem('Loja excluída.');
        PAINEL.telaLojas();

    },

    // ============================================================
    //  eventos
    // ============================================================

    prepararEventos: () => {

        $('#formLogin').addEventListener('submit', PAINEL.entrar);
        $('#btnSair').addEventListener('click', PAINEL.sair);
        $('#btnTrocarSenha').addEventListener('click', () => $('#dlgSenha').showModal());
        $('#btnCancelarSenha').addEventListener('click', () => $('#dlgSenha').close());
        $('#formSenha').addEventListener('submit', PAINEL.trocarSenha);

        $('#formNovaLoja').addEventListener('submit', PAINEL.criarLoja);
        $('#novaLojaNome').addEventListener('input', () => {
            if (!$('#novaLojaSlug').dataset.editado) $('#novaLojaSlug').value = gerarSlug($('#novaLojaNome').value);
        });
        $('#novaLojaSlug').addEventListener('input', () => { $('#novaLojaSlug').dataset.editado = '1'; });
        $('#listaLojas').addEventListener('click', (e) => {
            var botao = e.target.closest('[data-abrir]');
            if (botao) PAINEL.abrirLoja(botao.dataset.abrir);
        });

        $('#btnVoltarLojas').addEventListener('click', PAINEL.telaLojas);
        $('#abas').addEventListener('click', (e) => {
            var botao = e.target.closest('button[data-aba]');
            if (botao) PAINEL.trocarAba(botao.dataset.aba);
        });

        $$('form.form-loja').forEach((form) => form.addEventListener('submit', PAINEL.enviarFormulario));
        $$('.form-loja .campo-imagem').forEach((bloco) => prepararCampoImagem(bloco));
        prepararCampoImagem($('#imagemProduto'));

        $('#chkTaxaCombinar').addEventListener('change', (e) => {
            $('[data-campo="taxa_entrega"]').disabled = e.target.checked;
        });

        $('#btnNovoLinkBio').addEventListener('click', () => PAINEL.adicionarLinkBio());
        $('#btnNovoDepoimento').addEventListener('click', () => PAINEL.adicionarDepoimento());

        $('#novaCategoriaIcone').innerHTML = opcoesIcones(ICONES, 'fas fa-utensils');
        $('#formNovaCategoria').addEventListener('submit', PAINEL.criarCategoria);
        $('#listaCategorias').addEventListener('click', PAINEL.acaoCardapio);
        $('#listaCategorias').addEventListener('change', PAINEL.acaoCardapio);

        $('#formProduto').addEventListener('submit', PAINEL.salvarProduto);
        $('#btnCancelarProduto').addEventListener('click', PAINEL.cancelarProduto);
        $('#dlgProduto').addEventListener('cancel', (e) => {
            e.preventDefault();
            PAINEL.cancelarProduto();
        });

        $('#formStatusLoja').addEventListener('submit', PAINEL.salvarStatus);
        $('#formAcesso').addEventListener('submit', PAINEL.criarAcesso);
        $('#btnGerarSenha').addEventListener('click', PAINEL.gerarSenha);
        $('#btnCopiarAcesso').addEventListener('click', () => {
            navigator.clipboard.writeText($('#txtMensagemAcesso').value)
                .then(() => mensagem('Mensagem copiada!'))
                .catch(() => { $('#txtMensagemAcesso').select(); document.execCommand('copy'); });
        });
        $('#listaAcessos').addEventListener('click', (e) => {
            var botao = e.target.closest('[data-remover-acesso]');
            if (botao) PAINEL.removerAcesso(botao.dataset.removerAcesso);
        });
        $('#btnExcluirLoja').addEventListener('click', PAINEL.excluirLoja);

    }

};

PAINEL.iniciar();
