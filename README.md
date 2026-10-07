<div align="center">

<img src="docs/banner.svg" alt="chegou: digite npx chegou, escaneie o QR e os arquivos chegam" width="760">

<br><br>

**arquivos entre o celular e o PC pela rede local. um comando, um QR code, pronto.**

<br>

![npm](https://img.shields.io/npm/v/chegou?style=flat-square&labelColor=0b0e11&color=3fb950&label=npm)
![stars](https://img.shields.io/github/stars/zrdep/chegou?style=flat-square&labelColor=0b0e11&color=3fb950)
![license](https://img.shields.io/npm/l/chegou?style=flat-square&labelColor=0b0e11&color=3fb950)

</div>

<br>

```
› receber      fotos, vídeos e arquivos do celular direto numa pasta do PC
› enviar       arquivos, textos e links do PC pro celular
› câmera       tira a foto ou grava o vídeo e ele já cai no PC
› arrastar     solte um arquivo na janela do terminal e ele aparece no celular
› seguro       token no QR: só quem escaneou consegue entrar
› descartável  nada instalado no celular, nada rodando depois do ctrl+c
```

---

## ▸ como funciona

<div align="center">

![o terminal mostra o QR, o celular envia e os arquivos aparecem no PC](docs/demo.gif)

</div>

1. rode `npx chegou` no PC
2. escaneie o QR code com o celular
3. mande o que quiser, pros dois lados

sem app, sem conta, sem internet. só precisa estar na mesma rede.

---

## ▸ instalação

sem instalar nada:

```bash
npx chegou
```

ou de vez:

```bash
npm install -g chegou
```

precisa de **Node.js 20** ou mais novo.

---

## ▸ uso

```bash
chegou                        # abre e espera arquivos do celular
chegou foto.png video.mp4     # deixa esses arquivos prontos pro celular baixar
chegou https://youtube.com    # manda um link ou texto pro celular
chegou --timeout 10           # desliga sozinho depois de 10 min sem uso
```

com o chegou aberto, **arraste qualquer arquivo pra janela do terminal** ou digite um texto/link e aperte Enter: o celular recebe na hora.

### opções

| opção | atalho | o que faz | padrão |
|---|---|---|---|
| `--port <número>` | `-p` | porta preferida (se estiver ocupada, usa a próxima livre) | `8080` |
| `--dir <caminho>` | `-d` | onde salvar o que chega do celular | `~/Downloads/chegou` |
| `--timeout <min>` | `-t` | desliga depois de X minutos sem uso (aceita `0.5` = 30 s) | desligado |
| `--help` | `-h` | mostra a ajuda | |

---

## ▸ telas

**no PC**

<img src="docs/terminal.png" alt="terminal do chegou com QR code, endereços e atividade" width="560">

**no celular**: início, menu adicionar, enviando e concluído

<img src="docs/celular.png" alt="página do celular: início, menu adicionar, enviando e concluído">

---

## ▸ segurança

- cada sessão gera um **token aleatório** que vai dentro do QR code; quem só souber o IP leva `401`
- o token é checado **antes** de receber qualquer byte do arquivo
- nomes de arquivo são limpos (nada de `../../`) e nada é sobrescrito: `foto.jpg` vira `foto (1).jpg`
- com `--timeout`, o servidor desliga sozinho se você esquecer ele aberto
- o tráfego é **HTTP na rede local**, sem criptografia: use em redes que você confia

---

## ▸ perguntas frequentes

<details>
<summary><b>por que não usar o LocalSend?</b></summary>
<br>

o LocalSend é ótimo e mais completo (tem criptografia e funciona entre qualquer aparelho). a diferença do chegou é o jeito de usar:

- **nada pra instalar no celular**: escaneia o QR e abre no navegador. ajuda quando o celular não é seu
- **é um comando**: `npx chegou`, manda o que precisa e `ctrl+c`. nada fica rodando em segundo plano
- **mora no terminal**: dá pra arrastar arquivo na janela e usar dentro dos seus fluxos de dev

se você transfere arquivo todo dia entre os seus aparelhos, o LocalSend provavelmente é a melhor escolha. o chegou é pro "preciso passar isso agora e já tô no terminal".

</details>

<details>
<summary><b>é seguro rodar <code>npx</code>?</b></summary>
<br>

desconfiar é saudável: rodar pacote aleatório do npm é um risco real. por isso o chegou é pequeno e aberto: poucos arquivos em `bin/`, `src/` e `public/`, dá pra ler tudo em minutos. as dependências são só `fastify` (e plugins oficiais), `picocolors` e `qrcode-terminal`.

o que ele faz no seu PC: abre uma porta na rede local enquanto está rodando e grava arquivos só na pasta que você escolher. não instala nada, não roda em segundo plano e não acessa a internet.

se preferir rodar direto do código:

```bash
git clone https://github.com/zrdep/chegou
cd chegou && npm install && node bin/chegou.js
```

</details>

<details>
<summary><b>o celular não abre a página</b></summary>
<br>

- confira se o PC e o celular estão **no mesmo Wi-Fi** (desligar os dados móveis ajuda)
- no Windows, o **firewall** pergunta na primeira vez: marque *redes privadas* e permita
- confira se o IP do terminal é o mesmo do adaptador Wi-Fi no `ipconfig`

</details>

<details>
<summary><b>funciona em casa mas não na faculdade/café</b></summary>
<br>

redes públicas costumam isolar os aparelhos entre si. nesse caso não tem como contornar: use em casa, no trabalho ou roteando a internet do celular pro PC.

</details>

---

## ▸ stack

```
node.js · fastify · html/css/js puro
```

---

<div align="center">

feito por [Pedro Randolfo](https://github.com/zrdep) · MIT

se te ajudou, deixa uma ⭐

</div>
