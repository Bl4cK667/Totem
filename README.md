# Totem Digital — Mirante de Canaã dos Carajás

**Site publicado: https://totem-canaa.vercel.app**

Totem touchscreen para o mirante da cidade. O visitante toca na tela, "chega" a Canaã a partir do planeta girando e explora os pontos da cidade: fotos, dados rápidos, curiosidades, como chegar (QR Code) e Street View.

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

**Os lugares (pins e páginas) ficam no `config.js`** (veja a seção 5). **Os textos da interface ficam em `data/locais.json`.**

- Os textos estão em três idiomas: `"pt"`, `"en"` e `"es"`.
- Trechos marcados com **`[CONFIRMAR]`** precisam ser revisados com a Prefeitura. Na tela, eles aparecem com uma etiqueta "CONFIRMAR". Depois da revisão, apague o `[CONFIRMAR]` do texto. Para esconder todas as etiquetas de uma vez, mude `"mostrarMarcasConfirmar"` para `false`.
- **Tempo do modo descanso:** `config.tempoDescansoSegundos` (padrão: 60 segundos). Sem toque nesse tempo, o totem volta sozinho para o planeta e o idioma volta para PT.
- **Frases do guia no mapa:** `"mascote.dicasMapa"`, em cada idioma. Elas trocam sozinhas a cada 8 segundos. Na página de um lugar, o guia fica ao lado das curiosidades, sem balão.
- **Transição do planeta:** roda completa mesmo com as animações do Windows desligadas. Para usar um fade curto nesse caso, mude `config.transicaoCurtaSemAnimacoes` para `true`.

## 4. Trocar as fotos

As fotos atuais vêm do site da Prefeitura de Canaã dos Carajás. O brasão (domínio público) vem do Wikimedia Commons.

1. Coloque a foto na pasta `fotos-originais/` com o nome do lugar e `-capa`, por exemplo `rodoviaria-capa.jpg` (de preferência com 1600 px de largura ou mais).
2. Rode `npm run imagens`. As fotos são convertidas para WebP leve em `assets/img/locais/`, junto com a miniatura `-sm`.
3. No `config.js`, escreva o caminho em `foto` do lugar: `"assets/img/locais/rodoviaria-capa.webp"`.

**Brasão:** fica em `assets/img/marca/brasao.svg`. Para trocar, use o mesmo nome. Se for PNG, troque também o nome nos `<img>` do `index.html`.

## 5. Mapa da cidade e Street View

Depois do planeta, o totem mostra um **mapa de satélite da cidade** (MapLibre + imagens Esri, gratuitos). Só os pontos turísticos aparecem, como pins. Tocar num pin abre a **página do lugar**, que rola para baixo com o dedo, um bloco por vez:

1. **Abertura:** a foto na tela toda, com o número, o nome e uma frase curta (`frase`, no máximo 2 linhas).
2. **Sobre o lugar:** a descrição (`descricao`, no máximo 4 frases) e 2 ou 3 dados rápidos (`dados`).
3. **Você sabia?:** as curiosidades (`curiosidades`, 2 ou 3), cada uma num card, com o guia ao lado.
4. **Como chegar:** o QR Code e o botão "Ver no Street View".
5. **Outros lugares:** "Anterior", "Próximo" (com o nome do lugar) e "Voltar ao mapa".

A barra do topo fica fixa enquanto a página rola, com "Voltar ao mapa", "Início" e os idiomas. Uma linha dourada fina à direita mostra quanto já rolou.

**Fotos dos lugares:** use a versão grande (`-capa.webp`, sem `-sm`), porque ela ocupa a tela toda. Lugar sem foto certa: deixe `foto: ""` e a página mostra um espaço marcado "Foto em breve". Hoje falta a foto do **Terminal Rodoviário**. A imagem do Parque do Mirante é a ilustração do projeto (`fotoProjeto: true` mostra a legenda "Imagem ilustrativa do projeto").

**Os pontos ficam no arquivo `config.js`, na raiz do projeto**, no array `PONTOS_TURISTICOS`: nome, lat, lng, foto, descrição, curiosidades e link do Street View. As instruções estão dentro do próprio arquivo. Coordenadas marcadas com `CONFERIR NO GOOGLE MAPS` são aproximadas.

- **Adicionar um ponto:** copie um bloco `{ ... }` inteiro, troque o `id` e os dados.
- **Dois lugares num pin só:** a Prefeitura e o Lago da Prefeitura ficam no mesmo lugar, então são um pin só ("Prefeitura e Lago"), com um texto só. Em `assuntos` ficam os dois Street Views; a tela do Street View tem um botão para cada um.
- **Mapa parado:** depois que os pins aparecem, o mapa não se move nem aceita arrastar. Ele só se move quando alguém toca num pin (e volta com "Voltar ao mapa").
- **Vista final do mapa** (centro, zoom, inclinação e direção): constante `VISTA` em `src/telas/mapa.js`. Hoje ela fica no Parque do Mirante, olhando para o sul, com a cidade à frente.

Para o Street View de um ponto:

1. No Google Maps, abra o Street View no ponto e na direção que você quer.
2. Clique em **Compartilhar > Incorporar um mapa > Copiar HTML**.
3. Do código copiado, pegue só o que está entre as aspas de `src="..."` e cole em `streetView`, no `config.js`.

O link curto (`maps.app.goo.gl`) não funciona ali: o Google não deixa esse tipo de link abrir dentro do site.

**Chave da Google Maps Embed API (opcional):** cole em `GOOGLE_MAPS_EMBED_KEY`, no topo do `config.js`. Ela só é usada nos pontos sem link: o totem abre o Street View mais próximo do lat/lng do ponto.

Sem link, sem internet ou se demorar mais de 15 segundos, o totem mostra uma imagem com a mensagem "Street View indisponível no momento", em PT/EN/ES. Quando a conexão volta, o Street View carrega sozinho.

**Limite:** o site não enxerga o que acontece dentro do Street View do Google. Toques simples contam como uso, mas quem só arrasta o dedo por 60 segundos seguidos pode ser levado à tela inicial.

## 6. QR Code

Cada lugar tem um QR Code "Aponte a câmera do celular e veja como chegar". Ele abre o Google Maps no celular com a rota até o lugar: `https://www.google.com/maps/dir/?api=1&destination=LATITUDE,LONGITUDE`, com as mesmas coordenadas do pin (`lat` e `lng` no `config.js`). Corrigindo a coordenada, o QR se corrige sozinho. O QR é gerado no próprio totem (biblioteca `qrcode`, sem internet).

## 7. Abrir em modo quiosque (no totem)

**Jeito fácil (Windows):**
1. Rode `npm run build` uma vez.
2. Dê dois cliques em **`abrir-totem.bat`**. Ele liga o servidor local e abre o Chrome em tela cheia, sem barras e sem cursor (o endereço termina em `?totem`).
3. Para abrir sozinho quando o computador ligar, aperte `Win + R`, digite `shell:startup` e coloque ali um atalho do `abrir-totem.bat`.

**Manual:**
```
npm run preview
"C:\Program Files\Google\Chrome\Application\chrome.exe" --kiosk --app=http://localhost:4173/?totem --disable-pinch --overscroll-history-navigation=0
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
src/telas/                início, transição, mapa da cidade (pins, página do lugar, QR Code, Street View)
src/componentes/          planeta, mapa sobre o planeta, mascote, Street View, QR Code
src/core/                 idiomas, navegação, modo descanso, regras de quiosque
scripts/                  conversão de fotos, verificação de contraste, teste automatizado
```

## 11. Publicar com link fixo

O site fica em https://totem-canaa.vercel.app (projeto `totem-canaa` na Vercel), ligado a este repositório: cada envio (commit e push) na branch `main` atualiza o site sozinho.

**Atenção:** o plano gratuito da Vercel só vale para uso pessoal e não comercial. Se alguém recebe para fazer o projeto, ele conta como comercial.

**Créditos:** as texturas da Terra são derivadas do *Blue Marble* da NASA (domínio público), via exemplos do three.js. Os contornos do Brasil, do Pará e do município vêm da malha territorial do IBGE. As fontes Lora e Manrope usam a licença SIL Open Font License.
