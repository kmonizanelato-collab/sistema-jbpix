# JBPIXS — Painel interno

Painel de uso interno da loja. O funcionário entra, escolhe um tema, abre um card
e salva a arte do dia. O administrador envia as artes e preenche as tabelas de
atrasados.

## Como funciona a edição das artes

O banco guarda **duas coisas separadas**: a arte com as tabelas **vazias**
(o modelo) e os dados da tabela. A imagem publicada é sempre re-renderizada a
partir do modelo — nunca por cima do resultado anterior.

É isso que permite reeditar quantas vezes for preciso sem a imagem acumular
sujeira: trocar uma tabela, limpar a outra, corrigir um número. A arte volta ao
original e recebe o texto de novo, do zero.

O texto é desenhado como **contorno vetorial** da fonte (via `opentype.js`), não
como `<text>` em SVG. Isso é o que garante resultado idêntico na máquina local e
na Vercel — o servidor da Vercel não tem fonte nenhuma instalada.

## Rodando

```bash
npm install
cp .env.example .env.local   # preencha DATABASE_URL e SESSION_SECRET
npm run db:setup             # cria tabelas, temas, cards e os usuários iniciais
npm run dev
```

O `db:setup` é idempotente e **nunca sobrescreve a senha de quem já existe**.
Na primeira execução ele mostra as senhas iniciais no terminal (ou usa
`SEED_ADMIN_PASSWORD` / `SEED_THAIS_PASSWORD`, se você definir).

### Scripts

| Comando | O que faz |
|---|---|
| `npm run db:setup` | Cria/atualiza tabelas, temas, cards e usuários iniciais |
| `npm run db:doctor` | Verifica se toda arte aponta para um arquivo que existe |
| `npm run seed:junina` | Cadastra as artes da Festa Junina já preparadas |

Para preparar uma arte nova a partir de uma com a tabela preenchida:

```bash
node scripts/limpar-tabela.mjs <entrada.jpg> <saida.jpg> <yDoTopoDaTabela>
```

## Antes de publicar na Vercel

1. **Vercel Blob.** Sem `BLOB_READ_WRITE_TOKEN` as artes são gravadas em
   `public/uploads`, que a Vercel apaga a cada deploy. Crie o Blob em
   *Storage* e a variável entra sozinha no projeto.
2. **Fonte Now.** Coloque `Now-Bold.otf` em `assets/fonts/`. Sem ela o sistema
   cai no Poppins, que é parecido mas não idêntico. Nenhum código muda — o
   carregador procura a Now primeiro.

## Só o `main` é publicado

O `vercel.json` bloqueia o build de qualquer outro branch. Dois motivos: um
deploy de preview recebe uma URL pública, e este painel é interno; e ele
apontaria para o **mesmo banco de produção**, sem isolamento nenhum.

Se um dia precisar de ambiente de teste, o caminho é criar um banco separado
para preview e então liberar o build — não o contrário.

## Stack

Next.js (App Router) · PostgreSQL (Neon) · Tailwind · lucide-react · sharp ·
opentype.js

Emojis: [Twemoji](https://github.com/jdecked/twemoji) (CC-BY 4.0).
