# cardapio-online

Cardápio online com pedidos direto no WhatsApp, link da bio do Instagram e QR codes para as mesas.
O cliente monta o pedido sozinho (retirada, entrega ou na mesa), escolhe a forma de pagamento,
e a loja recebe tudo organizado no WhatsApp. Não precisa de servidor nem banco de dados:
são só arquivos HTML, CSS e JavaScript.

## Páginas

| Página | Para que serve |
| --- | --- |
| `index.html` | Site com o cardápio e o carrinho de pedidos |
| `index.html?mesa=5` | Cardápio aberto pelo QR code da mesa 5: o pedido já chega com o número da mesa |
| `bio.html` | Página para colocar no link da bio do Instagram |
| `qrcodes.html` | Gera os QR codes das mesas, do balcão e da bio para imprimir (4 por folha A4) ou baixar em PNG |

## Modo SaaS (várias lojas com painel)

Com o Supabase configurado em `js/config.js`, cada loja é cadastrada pelo painel e
o cardápio é aberto pelo endereço da loja:

| Página | Para que serve |
| --- | --- |
| `painel.html` | Painel: a DuoTech cria lojas e acessos; o dono edita logo, dados, cores, cardápio, Pix e bio |
| `index.html?loja=sr-john` | Cardápio da loja `sr-john` |
| `index.html?loja=sr-john&mesa=5` | Cardápio pelo QR code da mesa 5 |
| `bio.html?loja=sr-john` | Link da bio da loja |
| `qrcodes.html?loja=sr-john` | QR codes da loja para imprimir |

Sem `?loja=`, o site usa a demonstração local (`js/empresa.js` e `js/dados.js`).

### Banco de dados

O SQL fica em `supabase/migrations/` e a função que cria o acesso do dono em
`supabase/functions/criar-acesso/`. As regras de segurança (RLS) garantem que cada
dono só vê e edita a própria loja; só administradores criam lojas e acessos.

### Primeiro administrador

1. No Supabase, vá em **Authentication → Users → Add user → Create new user**,
   com o seu e-mail, uma senha e **Auto Confirm User** marcado.
2. No **SQL Editor**, rode (trocando o e-mail):

   ```sql
   insert into public.admins (user_id)
   select id from auth.users where email = 'seu-email@exemplo.com';
   ```

3. Entre em `painel.html` com esse e-mail e senha.

### Fluxo de uma loja nova

1. No painel, **Nova loja**: nome e endereço (ex.: `sr-john`).
2. Preencha as abas **Loja**, **Cardápio**, **Pedidos e pagamento** e **Página e bio**.
3. Na aba **Acessos**, crie o acesso do dono (e-mail + senha provisória) e copie a
   mensagem pronta para enviar a ele.
4. Imprima os QR codes pelo botão **QR codes**.

## Como montar o site de uma nova empresa (sem painel)

Cada empresa é uma cópia desta pasta. Para criar uma nova:

1. **Copie a pasta inteira** do projeto (por exemplo, `cardapio-pizzaria-do-ze`).
2. **Edite `js/empresa.js`**: nome, logo, cores, WhatsApp, endereço, redes sociais,
   taxa de entrega, quantidade de mesas, Pix e botões da bio. Cada campo está comentado no arquivo.
3. **Edite `js/dados.js`**: os produtos do cardápio (veja abaixo).
4. **Troque as imagens** em `img/`: o logo e as fotos dos produtos em `img/cardapio/`.
5. **Publique** a pasta (GitHub Pages, Cloudflare Pages, Netlify, Vercel ou qualquer hospedagem).
6. **Coloque o endereço publicado** em `urlSite`, no `js/empresa.js`, e publique de novo.
7. Abra **`qrcodes.html`** no site publicado, confira o endereço que aparece e imprima.
8. Coloque o endereço de **`bio.html`** no link da bio do Instagram.

> Só os arquivos `js/empresa.js`, `js/dados.js` e as imagens mudam de uma empresa para outra.
> Os outros arquivos são iguais em todas.

## `js/empresa.js`: dados da empresa

Os campos mais importantes:

```js
var EMPRESA = {
    nome: 'Pizzaria do Zé',
    slogan: 'Pizzas artesanais',
    logo: './img/logo.png',

    cores: {
        primaria: '#b5523b',   // botões, preços e destaques
        secundaria: '#f3e3dc', // fundos claros
        fundo: '#fdf8f5'       // fundo da página
    },

    whatsapp: '5516999999999',           // 55 + DDD + número, só dígitos
    telefoneExibicao: '(16) 99999-9999',
    instagram: 'https://www.instagram.com/pizzariadoze/',
    endereco: 'Rua das Flores, 100 - Centro, Franca - SP',
    urlSite: 'https://pizzariadoze.com.br/',

    pedido: {
        retirada: true,
        entrega: true,
        mesa: true,
        quantidadeMesas: 12,
        taxaEntrega: 5      // ou null para "a combinar"
    },

    pagamento: {
        pix: {
            chave: '12345678000199',       // CPF, CNPJ, e-mail, +55 telefone ou chave aleatória
            nomeRecebedor: 'Pizzaria do Ze',
            cidade: 'Franca'
        },
        linkCartao: '',                   // link do Mercado Pago, InfinitePay etc.
        naEntrega: { pix: true, cartao: true, dinheiro: true }
    }
};
```

- **Deixe um campo vazio (`''`)** para esconder o botão dele (por exemplo, sem Facebook).
- **Pix:** com `chave`, `nomeRecebedor` e `cidade` preenchidos, aparece a opção **"Pix agora"**,
  com QR Code e copia e cola no valor exato do pedido. Chave de telefone vai com `+55`
  (ex.: `+5516999999999`). Faça um Pix de teste de R$ 0,01 antes de entregar ao cliente.
- **Categorias:** a lista `categorias` define o nome e o ícone de cada aba do cardápio.
  O `id` precisa ser igual ao nome da lista em `js/dados.js`.
- **Bio:** a lista `linksBio` adiciona botões na página da bio. Use `mensagem` para abrir
  o WhatsApp com um texto pronto, ou `url` para qualquer outro link.

## `js/dados.js`: produtos

Cada categoria é uma lista de produtos:

```js
var MENU = {
    "pizzas": [
        {
            "id": "pizza-calabresa",          // único, sem espaços nem acentos
            "img": "./img/cardapio/pizzas/calabresa.jpg",
            "name": "Calabresa",
            "dsc": "Molho de tomate, mussarela, calabresa e cebola",
            "price": 49.90
        }
    ],
    "bebidas": [ ... ]
};
```

Produtos sem foto podem usar `"img": "./img/sem-imagem.svg"`.

## Como o pedido chega no WhatsApp

```
*NOVO PEDIDO · Pizzaria do Zé* #GDW5

🪑 *Mesa 5*
Nome: Maria

*Itens*
2x Calabresa — R$ 99,80
1x Refrigerante — R$ 7,90

Subtotal: R$ 107,70
*Total: R$ 107,70*

💳 Pagamento: Dinheiro no caixa (troco para R$ 150,00)
📝 Obs.: sem cebola
```

## Testar no computador

Abra um terminal na pasta do projeto e rode:

```
python3 -m http.server 8000
```

Depois acesse `http://localhost:8000/` no navegador. Para testar a mesa, use
`http://localhost:8000/index.html?mesa=3`.
