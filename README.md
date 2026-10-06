<div align="center">

<img src="docs/banner.svg" alt="chegou" width="680">

<br><br>

**arquivos entre o celular e o PC pela rede local. um comando, um QR code, pronto.**

![npm](https://img.shields.io/badge/npm-chegou-111?style=flat-square)
![node](https://img.shields.io/badge/node-%3E%3D20-111?style=flat-square)
![license](https://img.shields.io/badge/license-MIT-111?style=flat-square)
![status](https://img.shields.io/badge/status-em%20desenvolvimento-111?style=flat-square)

</div>

---

## ▸ como funciona

<div align="center">

![chegou em ação: o terminal mostra o QR, o celular envia e os arquivos aparecem no PC](docs/demo.gif)

</div>

1. rode `chegou` no PC
2. escaneie o QR code com o celular
3. escolha arquivos, tire fotos ou grave vídeos
4. tudo cai direto na pasta do PC

sem app, sem conta, sem internet. só precisa estar na mesma rede.

---

## ▸ telas

**no PC**

<img src="docs/terminal.png" alt="terminal do chegou com QR code, endereços e arquivos recebidos" width="560">

**no celular**: escolhendo, enviando, concluído e erro

<img src="docs/celular.png" alt="página do celular nos estados escolhendo, enviando, concluído e erro">

---

## ▸ instalação

```bash
npm install -g chegou
```

ou sem instalar nada:

```bash
npx chegou
```

---

## ▸ uso

```bash
chegou                      # pasta padrão, porta automática
chegou --dir ./recebidos    # escolhe onde salvar
chegou --port 3000          # escolhe a porta
```

---

## ▸ segurança

- cada sessão gera um **token aleatório** que vai dentro do QR code
- quem só souber o IP não consegue enviar nada
- nomes de arquivo são sanitizados e nada é sobrescrito
- o tráfego é HTTP na rede local: use em redes que você confia

---

## ▸ problemas comuns

**o celular não abre a página**
o firewall do Windows pode bloquear na primeira vez. clique em *permitir acesso* quando ele perguntar.

**funciona em casa mas não na faculdade/café**
redes públicas costumam isolar os dispositivos entre si. não tem como contornar.

---

## ▸ roadmap

- [x] servidor + página de envio
- [x] detectar o IP certo da rede
- [x] QR code no terminal
- [x] token de sessão
- [x] upload em streaming (arquivos grandes)
- [x] barra de progresso
- [x] câmera direta: foto e gravação de vídeo celular → PC
- [ ] mandar texto e links, não só arquivos
- [ ] mandar do PC pro celular
- [ ] desligar sozinho depois de X minutos

---

## ▸ stack

```
node.js · fastify · html/css/js puro
```

---

<div align="center">

MIT © Pedro Randolfo

</div>
