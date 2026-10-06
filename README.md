<div align="center">

```
     _
 ___| |__   ___  __ _  ___  _   _ 
 / __| '_ \ / _ \/ _` |/ _ \| | | |
| (__| | | |  __/ (_| | (_) | |_| |
 \___|_| |_|\___|\__, |\___/ \__,_|
                 |___/
```

**mande arquivos do celular pro PC. um comando, um QR code, pronto.**

![npm](https://img.shields.io/badge/npm-chegou-111?style=flat-square)
![node](https://img.shields.io/badge/node-%3E%3D20-111?style=flat-square)
![license](https://img.shields.io/badge/license-MIT-111?style=flat-square)
![status](https://img.shields.io/badge/status-em%20desenvolvimento-111?style=flat-square)

</div>

---

## ▸ como funciona

```
$ chegou

  chegou · esperando arquivos

  local     http://localhost:8080
  rede      http://192.168.1.15:8080
  pasta     ~/Downloads/chegou

  ▄▄▄▄▄▄▄ ▄▄  ▄ ▄▄▄▄▄▄▄
  █ ▄▄▄ █ ▀█▄█▀ █ ▄▄▄ █
  █ ███ █ ▄▀▄▀▄ █ ███ █      escaneie com
  █▄▄▄▄▄█ █ ▀ █ █▄▄▄▄▄█      o celular
  ▄▄ ▄  ▄▄▀█▄▀▄▄  ▄▄▄ ▄
  █▄▄▄▄▄█ ▀▄▀ █ ▀▄█▄ ▄█

  chegou  foto.jpg       2.3 MB
  chegou  contrato.pdf   812 KB
```

1. rode `chegou` no PC
2. escaneie o QR code com o celular
3. escolha os arquivos e envie
4. eles caem direto na pasta do PC

sem app, sem conta, sem internet. só precisa estar na mesma rede.

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

- [ ] servidor + página de envio
- [ ] detectar o IP certo da rede
- [ ] QR code no terminal
- [ ] token de sessão
- [ ] upload em streaming (arquivos grandes)
- [ ] barra de progresso
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
