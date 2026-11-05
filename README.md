# Totem Digital — Mirante de Canaã dos Carajás

**Site publicado: https://totem-canaa.vercel.app**

Totem touchscreen para o mirante da cidade. O visitante toca na tela, "chega" a Canaã a partir do planeta girando e explora os pontos da cidade: fotos, números, curiosidades, antes e depois e Street View.

Feito para tela **vertical 1080×1920**. Também funciona na horizontal e em notebook (para apresentações).

---

## 1. Instalar (só na primeira vez)

1. Instale o **Node.js** (versão 20 ou mais nova): https://nodejs.org
2. Abra a pasta do projeto no terminal e rode:

```
npm install
```

## 2. Rodar

| Para quê | Comando | Endereço |
|---|---|---|
| Editar e ver as mudanças na hora | `npm run dev` | http://localhost:5173 |
| Versão final (a que vai no totem) | `npm run build` e depois `npm run preview` | http://localhost:4173 |

> Sempre que trocar textos ou fotos, rode `npm run build` de novo antes de levar para o totem. O `config.js` não precisa: basta salvar e recarregar.
>
> O site precisa rodar por um desses endereços. Abrir o `index.html` com dois cliques não funciona.

## 3. Trocar textos, números e locais

**Todo o conteúdo fica em um único arquivo: `data/locais.json`.**

- Os textos estão em três idiomas: `"pt"`, `"en"` e `"es"`.
- Trechos marcados com **`[CONFIRMAR]`** precisam ser revisados com a Prefeitura. Na tela, eles aparecem com uma etiqueta "CONFIRMAR". Depois da revisão, apague o `[CONFIRMAR]` do texto. Para esconder todas as etiquetas de uma vez, mude `"mostrarMarcasConfirmar"` para `false`.
- **Adicionar um local:** copie um bloco inteiro dentro de `"locais"`, troque o `"id"` (sem espaços nem acentos, ex.: `"praca-central"`), os textos, as fotos e as coordenadas.
- **Esconder um local** sem apagar: `"ativo": false`.
- **Curiosidades gerais:** em `"curiosidadesCidade"` ficam as falas do guia na tela de locais.
- **Números:** `"valor"` é o número que o contador anima; `"tipo": "ano"` evita o separador de milhar (2015 e não 2.015); `"sufixo"` é a unidade (`" m²"`, `" m"`, `" h"`).
- **Guia (mascote):** o que ele fala em cada local fica em `"falas"`. Ele também lê as curiosidades.
- **Tempo do modo descanso:** `config.tempoDescansoSegundos` (padrão: 120, ou seja, 2 minutos).
- **Transição do planeta:** roda completa mesmo com as animações do Windows desligadas. Para usar um fade curto nesse caso, mude `config.transicaoCurtaSemAnimacoes` para `true`.

## 4. Trocar as fotos

As fotos atuais vêm do site da Prefeitura de Canaã dos Carajás. As imagens de satélite (INPE/OBT/DPI, CC BY-SA 4.0) e o brasão (domínio público) vêm do Wikimedia Commons. O crédito de cada local fica em `"creditos"` e aparece no fim da página.

1. Coloque as fotos na pasta `fotos-originais/` com o nome do local, por exemplo:
   - `lago-prefeitura-capa.jpg` → foto de abertura (de preferência vertical)
   - `lago-prefeitura-antes.jpg` e `lago-prefeitura-depois.jpg` → comparação (mesmo enquadramento nas duas)
2. Rode `npm run imagens`. As fotos são convertidas para WebP leve em `assets/img/locais/`, junto com a miniatura `-sm`.

Para um local novo, use o padrão `<id>-capa`, `<id>-antes` e `<id>-depois`, e aponte os caminhos em `"fotos"` no `locais.json`. Se um local não tiver foto antiga, apague as linhas `"antes"` e `"depois"`: o capítulo "Antes e depois" some sozinho.

**Brasão:** fica em `assets/img/marca/brasao.svg`. Para trocar, use o mesmo nome. Se for PNG, troque também o nome nos `<img>` do `index.html`.

## 5. Mapa da cidade e Street View

Depois do planeta, o totem mostra um **mapa de satélite da cidade** (MapLibre + imagens Esri, gratuitos). Só os pontos turísticos aparecem, como pins. Tocar num pin abre um painel com descrição, curiosidades e o botão "Ver no Street View".

**Os pontos ficam no arquivo `config.js`, na raiz do projeto**, no array `PONTOS_TURISTICOS`: nome, lat, lng, foto, descrição, curiosidades e link do Street View. As instruções estão dentro do próprio arquivo. Coordenadas marcadas com `CONFERIR NO GOOGLE MAPS` são aproximadas.

- **Adicionar um ponto:** copie um bloco `{ ... }` inteiro, troque o `id` e os dados.
- **Vista final do mapa** (centro, zoom, inclinação e direção): constante `VISTA` em `src/telas/mapa.js`. Hoje ela fica no Parque do Mirante, olhando para o sul, com a cidade à frente.

Para o Street View de um ponto:

1. No Google Maps, abra o Street View no ponto e na direção que você quer.
2. Clique em **Compartilhar > Incorporar um mapa > Copiar HTML**.
3. Do código copiado, pegue só o que está entre as aspas de `src="..."` e cole em `streetView`, no `config.js`.

O link curto (`maps.app.goo.gl`) não funciona ali: o Google não deixa esse tipo de link abrir dentro do site.

**Chave da Google Maps Embed API (opcional):** cole em `GOOGLE_MAPS_EMBED_KEY`, no topo do `config.js`. Ela só é usada nos pontos sem link: o totem abre o Street View mais próximo do lat/lng do ponto.

Sem link, sem internet ou se demorar mais de 15 segundos, o totem mostra uma imagem com a mensagem "Street View indisponível no momento", em PT/EN/ES. Quando a conexão volta, o Street View carrega sozinho.

**Limite:** o site não enxerga o que acontece dentro do Street View do Google. Toques simples contam como uso, mas quem só arrasta o dedo por 2 minutos seguidos pode ser levado à tela inicial.

## 6. QR Code

Cada local tem um QR Code com o texto "Leve este passeio no seu celular". Ele aponta para o endereço configurado em `VITE_QR_URL_BASE` (no `.env`) ou em `config.qrUrlBase` (no `locais.json`), seguido de `?local=<id>&lang=<idioma>`. **Troque o endereço de exemplo** pelo site da Prefeitura.

## 7. Abrir em modo quiosque (no totem)

**Jeito fácil (Windows):**
1. Rode `npm run build` uma vez.
2. Dê dois cliques em **`abrir-totem.bat`**. Ele liga o servidor local e abre o Chrome em tela cheia, sem barras.
3. Para abrir sozinho quando o computador ligar, aperte `Win + R`, digite `shell:startup` e coloque ali um atalho do `abrir-totem.bat`.

**Manual:**
```
npm run preview
"C:\Program Files\Google\Chrome\Application\chrome.exe" --kiosk --app=http://localhost:4173 --disable-pinch --overscroll-history-navigation=0
```

Para sair do modo quiosque: **Alt + F4**.

## 8. Funcionamento offline

Tudo roda a partir do próprio computador do totem (fontes, bibliotecas, fotos e planeta), então ele funciona **sem internet**. O Street View precisa de conexão. As imagens de satélite do mapa vêm da internet: o *service worker* guarda as que já foram vistas, e sem internet o mapa mostra só essas (lugares nunca vistos ficam em branco, mas os pins continuam funcionando). Um *service worker* também guarda os arquivos em cache, caso o totem seja servido por um endereço remoto.

## 9. Conferências de qualidade

| Comando | O que faz |
|---|---|
| `npm run contraste` | Confere se todos os pares de cor (texto/fundo) passam no WCAG AA |
| `npm run testar` | Com `npm run dev` rodando, percorre o totem no Chrome em vertical e horizontal, salva prints em `testes/` e lista erros do console |

## 10. Estrutura

```
config.js                 pontos turísticos do mapa, links do Street View e chave do Google
data/locais.json          textos da interface (PT/EN/ES) e falas do mascote
assets/fonts/             Lora e Manrope (locais)
assets/img/locais/        fotos dos locais
assets/img/globo/         texturas da Terra
assets/img/marca/         brasão
src/styles/tokens.css     paleta de cores e tipografia (único lugar das cores)
src/telas/                início, transição, mapa da cidade (pins, painel, Street View)
src/componentes/          planeta, mapa sobre o planeta, mascote, contador, antes/depois, Street View, QR
src/core/                 idiomas, navegação, modo descanso, regras de quiosque
scripts/                  conversão de fotos, verificação de contraste, teste automatizado
```

## 11. Publicar com link fixo

O site fica em https://totem-canaa.vercel.app (projeto `totem-canaa` na Vercel), ligado a este repositório: cada envio (commit e push) na branch `main` atualiza o site sozinho.

**Atenção:** o plano gratuito da Vercel só vale para uso pessoal e não comercial. Se alguém recebe para fazer o projeto, ele conta como comercial.

**Créditos:** as texturas da Terra são derivadas do *Blue Marble* da NASA (domínio público), via exemplos do three.js. Os contornos do Brasil, do Pará e do município vêm da malha territorial do IBGE. As fontes Lora e Manrope usam a licença SIL Open Font License.
