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

> Os arquivos da pasta `data/` (lugares e textos) não precisam de build: basta salvar e recarregar o totem. Fotos novas e mudanças no código precisam de `npm run build`.
>
> O site precisa rodar por um desses endereços. Abrir o `index.html` com dois cliques não funciona.

## 3. Trocar textos, números e locais

**Os lugares (pins e páginas) ficam em `data/lugares.json`.** **Os textos da interface (botões, títulos, guia) ficam em `data/locais.json`.** **A chave do Google (opcional) fica em `data/config.json`.** Nada de texto de lugar fica no código: um lugar novo no arquivo aparece sozinho no mapa.

Depois de mexer no `lugares.json`, rode **`npm run conteudo`**. Ele confere o arquivo (avisa se faltar algo ou se um arquivo de foto não existir) e atualiza o `CONFIRMAR.md` (o que a Prefeitura precisa revisar) e o `FALTA-CONTEUDO.md` (fotos, áudios e vídeos que faltam).

### Campos de cada lugar (`data/lugares.json`)

| Campo | O que é |
|---|---|
| `id` | nome curto sem espaço nem acento (ex.: `praca-central`). Também nomeia os áudios e o vídeo |
| `numero` | ordem no mapa. O totem numera os pins 01, 02, 03... contando só os lugares que aparecem |
| `status` | `"publicado"` aparece no totem; `"rascunho"` só no modo de edição |
| `revisado_por_prefeitura` | `true` depois que a Prefeitura conferiu tudo |
| `nome` | `{ "pt", "en", "es" }` |
| `categoria` | um `id` da lista `categorias`, no começo do arquivo (Prefeitura, Lagos, Transporte...) |
| `latitude`, `longitude` | posição do pin. No Google Maps: botão direito no lugar, clique nos números. Sem posição, o lugar não tem pin |
| `textos.pt` / `.en` / `.es` | `frase` (abertura, até 2 linhas), `descricao` (até 4 frases), `curiosidades` (2 ou 3), `dados` (2 ou 3: `{ "valor": "2022", "legenda": "Inauguração" }`) e `dica_guia` (frase do guia no mapa; `{numero}` vira o número do pin). Sem inglês ou espanhol, aparece o português |
| `foto` | `arquivo`, `credito`, `alt` (descrição da foto para leitores de tela, em pt/en/es) e `ilustracao_do_projeto` (`true` se não for foto de verdade) |
| `galeria` | fotos extras: `[{ "arquivo", "credito", "alt" }]` |
| `antes_agora` | pares de fotos: `[{ "foto_antes", "ano_antes", "descricao_antes", "foto_agora", "ano_agora" }]` |
| `audio` | `{ "pt": "audio/pt/id.mp3", "en": ..., "es": ... }` |
| `video_libras` | `"libras/id.mp4"`, gravado por intérprete |
| `obra` | para o filtro "Obras da gestão" (próxima etapa) |
| `street_view` | uma ou mais vistas: `[{ "nome", "latitude", "longitude", "link" }]` (veja a seção 5) |
| `pendencias` | o que ainda falta confirmar; aparece no `CONFIRMAR.md` |

**Rascunho e modo de edição:** lugar sem foto real ou sem texto confirmado fica com `"status": "rascunho"` e não aparece no totem. Para ver os rascunhos, abra o endereço com **`?edicao`** no fim (ex.: `http://localhost:4173/?edicao`): eles aparecem com borda tracejada e a palavra "Rascunho". Os que ainda não têm posição ficam numa lista no canto do mapa.

**Muitos lugares:** pins quase no mesmo lugar viram um pin só ("Nome +2", com uma segunda gota dourada atrás); o toque abre uma lista para escolher. Se uma etiqueta encostaria em outra, ela some e fica só o número do pin.

- Os textos estão em três idiomas: `"pt"`, `"en"` e `"es"`.
- Trechos marcados com **`[CONFIRMAR]`** precisam ser revisados com a Prefeitura. Na tela, eles aparecem com uma etiqueta "CONFIRMAR". Depois da revisão, apague o `[CONFIRMAR]` do texto. Para esconder todas as etiquetas de uma vez, mude `"mostrarMarcasConfirmar"` para `false`.
- **Tempo do modo descanso:** `config.tempoDescansoSegundos` (padrão: 60 segundos). Sem toque nesse tempo, o totem volta sozinho para o planeta e o idioma volta para PT.
- **Frases do guia no mapa:** as gerais ficam em `"mascote.dicasMapa"` (locais.json); as de cada lugar, em `dica_guia` (lugares.json). Elas trocam sozinhas a cada 8 segundos. Na página de um lugar, o guia fica ao lado das curiosidades, sem balão.
- **Transição do planeta:** roda completa mesmo com as animações do Windows desligadas. Para usar um fade curto nesse caso, mude `config.transicaoCurtaSemAnimacoes` para `true`.

## 4. Trocar as fotos

As fotos atuais vêm do site da Prefeitura de Canaã dos Carajás. O brasão (domínio público) vem do Wikimedia Commons.

1. Coloque a foto na pasta `fotos-originais/` com o nome do lugar e `-capa`, por exemplo `rodoviaria-capa.jpg` (de preferência com 1600 px de largura ou mais).
2. Rode `npm run imagens`. As fotos são convertidas para WebP leve em `assets/img/locais/`, junto com a miniatura `-sm`.
3. No `data/lugares.json`, escreva o caminho em `foto.arquivo` do lugar (`"assets/img/locais/rodoviaria-capa.webp"`), o crédito em `foto.credito` e uma descrição curta da foto em `foto.alt`.

Se um arquivo de foto sumir, o totem mostra o espaço "Foto em breve" no lugar, sem imagem quebrada.

**Brasão:** fica em `assets/img/marca/brasao.svg`. Para trocar, use o mesmo nome. Se for PNG, troque também o nome nos `<img>` do `index.html`.

## 5. Mapa da cidade e Street View

Depois do planeta, o totem mostra um **mapa de satélite da cidade** (MapLibre + imagens Esri, gratuitos). Só os pontos turísticos aparecem, como pins. Tocar num pin abre a **página do lugar**, que rola para baixo com o dedo, um bloco por vez:

1. **Abertura:** a foto na tela toda (com o crédito), o número, o nome e uma frase curta (`frase`, no máximo 2 linhas).
2. **Sobre o lugar:** a descrição (`descricao`, no máximo 4 frases) e 2 ou 3 dados rápidos (`dados`).
3. **Você sabia?:** as curiosidades (`curiosidades`, 2 ou 3), cada uma num card, com o guia ao lado.
4. **Como chegar:** o QR Code e o botão "Ver no Street View".
5. **Outros lugares:** "Anterior", "Próximo" (com o nome do lugar) e "Voltar ao mapa".

Um bloco sem conteúdo (ex.: lugar sem curiosidades) não aparece.

A barra do topo fica fixa enquanto a página rola, com "Voltar ao mapa", "Início" e os idiomas. Uma linha dourada fina à direita mostra quanto já rolou.

**Fotos dos lugares:** use a versão grande (`-capa.webp`, sem `-sm`), porque ela ocupa a tela toda. Hoje falta a foto do **Terminal Rodoviário**: por isso ele está como rascunho e não aparece no totem. A imagem do Parque do Mirante é a ilustração do projeto (`ilustracao_do_projeto: true` mostra a legenda "Imagem ilustrativa do projeto").

- **Adicionar um lugar:** no `data/lugares.json`, copie um bloco `{ ... }` inteiro da lista `lugares`, troque o `id`, o `numero` e os dados, e rode `npm run conteudo`. Coordenadas a conferir ficam listadas em `pendencias`.
- **Dois lugares num pin só:** a Prefeitura e o Lago da Prefeitura ficam no mesmo lugar, então são um pin só ("Prefeitura e Lago"), com um texto só. Em `street_view` ficam as duas vistas; a tela do Street View tem um botão para cada uma.
- **Mapa parado:** depois que os pins aparecem, o mapa não se move nem aceita arrastar. Ele só se move quando alguém toca num pin (e volta com "Voltar ao mapa").
- **Vista final do mapa** (centro, zoom, inclinação e direção): constante `VISTA` em `src/telas/mapa.js`. Hoje ela fica no Parque do Mirante, olhando para o sul, com a cidade à frente.

Para o Street View de um ponto:

1. No Google Maps, abra o Street View no ponto e na direção que você quer.
2. Clique em **Compartilhar > Incorporar um mapa > Copiar HTML**.
3. Do código copiado, pegue só o que está entre as aspas de `src="..."` e cole em `link`, dentro de `street_view` do lugar, no `data/lugares.json`.

O link curto (`maps.app.goo.gl`) não funciona ali: o Google não deixa esse tipo de link abrir dentro do site.

**Chave da Google Maps Embed API (opcional):** cole em `googleMapsEmbedKey`, no `data/config.json`. Ela só é usada nas vistas sem link: o totem abre o Street View mais próximo da latitude/longitude.

Sem link, sem internet ou se demorar mais de 15 segundos, o totem mostra uma imagem com a mensagem "Street View indisponível no momento", em PT/EN/ES. Quando a conexão volta, o Street View carrega sozinho.

**Limite:** o site não enxerga o que acontece dentro do Street View do Google. Toques simples contam como uso, mas quem só arrasta o dedo por 60 segundos seguidos pode ser levado à tela inicial.

## 6. QR Code

Cada lugar tem um QR Code "Aponte a câmera do celular e veja como chegar". Ele abre o Google Maps no celular com a rota até o lugar: `https://www.google.com/maps/dir/?api=1&destination=LATITUDE,LONGITUDE`, com as mesmas coordenadas do pin (`latitude` e `longitude` no `data/lugares.json`). Corrigindo a coordenada, o QR se corrige sozinho. O QR é gerado no próprio totem (biblioteca `qrcode`, sem internet).

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

Tudo roda a partir do próprio computador do totem (fontes, bibliotecas, fotos e planeta), então ele funciona **sem internet**. O Street View precisa de conexão. As imagens de satélite do mapa vêm da internet: o *service worker* guarda as que já foram vistas, e sem internet o mapa mostra só essas (lugares nunca vistos aparecem borrados ou na cor do chão, mas os pins continuam funcionando). Um *service worker* também guarda os arquivos em cache, caso o totem seja servido por um endereço remoto.

## 9. Conferências de qualidade

| Comando | O que faz |
|---|---|
| `npm run conteudo` | Confere o `data/lugares.json` e atualiza `CONFIRMAR.md` e `FALTA-CONTEUDO.md` |
| `npm run contraste` | Confere se todos os pares de cor (texto/fundo) passam no WCAG AA |
| `npm run testar` | Com `npm run dev` rodando, percorre o totem no Chrome em vertical e horizontal, salva prints em `testes/` e lista erros do console |

## 10. Estrutura

```
data/lugares.json         TODOS os lugares (pins e páginas), em PT/EN/ES
data/locais.json          textos da interface (PT/EN/ES) e falas gerais do guia
data/config.json          chave do Google (opcional)
CONFIRMAR.md              o que a Prefeitura precisa revisar (gerado por npm run conteudo)
FALTA-CONTEUDO.md         fotos, áudios e vídeos que faltam (gerado por npm run conteudo)
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
