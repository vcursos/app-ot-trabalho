# 📱 Sistema de Gestão de Ordens de Trabalho - Telecom

> **PWA + Capacitor** | Sistema completo para gestão de OTs com **tabelas customizáveis** e **multiplicadores configuráveis**

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![PWA](https://img.shields.io/badge/PWA-Ready-green.svg)](https://developers.google.com/web/progressive-web-apps/)
[![Android](https://img.shields.io/badge/Android-APK-success.svg)](ANDROID-BUILD.md)

## ✨ Funcionalidades

### 🆕 Novidades - Sistema de Tabelas Customizáveis

- ✅ **Configuração de Tabelas de Preços**
  - Instalações, Avarias e Adicionais totalmente editáveis
  - Interface visual para adicionar/editar/remover serviços
  - Exportar/Importar tabelas em JSON
  
- ✅ **Multiplicadores Configuráveis**
  - Normal (1x)
  - Domingo/Feriado (1.5x configurável)
  - Dobrado (2x configurável)
  - Aplicação automática ao valor total

### Core Features

- ✅ Registro de OTs com serviços personalizados
- ✅ Scanner de código de barras via câmera
- ✅ Logística diária: KM rodados, abastecimento, consumo
- ✅ Geração de PDF mensal (OT + Logística)
- ✅ Backup/Importação JSON (sem servidor)
- ✅ Funciona 100% offline após instalação
- ✅ Responsivo: desktop, tablet, celular
- ✅ **Instalável como app Android nativo (APK)**

## � Instalação Rápida

### Opção 1: Como PWA (Web App)

**Android (Chrome/Edge/Brave):**
1. Abra o app em um servidor HTTP/HTTPS
2. Clique no botão "⬇️ Instalar" que aparece no topo
3. Ou: menu do navegador > "Adicionar à tela inicial"

**iPhone (Safari):**
1. Abra o app no Safari
2. Toque no botão Compartilhar (🔼)
3. "Adicionar à Tela de Início"

### Opção 2: Como App Android (APK)

Veja instruções completas em: **[ANDROID-BUILD.md](ANDROID-BUILD.md)**

```powershell
npm install
npm run android
# Abre Android Studio para gerar APK
```

## 📖 Documentação Completa

- **[🎯 GUIA DE TABELAS CUSTOMIZADAS](www/GUIA-TABELAS-CUSTOMIZADAS.md)** - Como configurar serviços e multiplicadores
- **[📱 ANDROID BUILD](ANDROID-BUILD.md)** - Gerar APK passo a passo
- **[🚀 PRONTO PARA APK](PRONTO-PARA-APK.md)** - Checklist rápido
- **[🐙 PUSH GITHUB](PUSH-GITHUB.md)** - Como fazer deploy no GitHub

## 🛠️ Desenvolvimento Local

```powershell
# Instalar dependências
npm install

# Servir PWA (desenvolvimento web)
npm run serve

# Sincronizar com Android
npm run cap:sync:android

# Abrir no Android Studio
npm run cap:open:android

# Atalho: sync + open
npm run android
```

Abra: `http://localhost:5173`

1. Abra `gerar-icones-auto.html` no navegador
2. Os arquivos `icon-192.png` e `icon-512.png` serão baixados automaticamente
3. Mova-os para a pasta raiz do projeto (mesma do `index.html`)

Alternativamente, use `gerar-icones.html` para prévia interativa.

## 📦 Empacotar como APK/IPA (Capacitor)

### Pré-requisitos
- Node.js (v16+)
- Android Studio (para Android)
- Xcode (para iOS, somente macOS)

### Passos

```powershell
# 1. Instalar dependências
npm install

# 2. Adicionar plataformas
npx cap add android
npx cap add ios

# 3. Copiar web assets
npx cap copy

# 4. Abrir no IDE nativo
npx cap open android    # Android Studio
npx cap open ios        # Xcode

# 5. Build e assinar no IDE nativo
```

## 🗂️ Estrutura do projeto

```
├── index.html              # Página principal
├── script1.js              # Lógica principal (OT + Logística)
├── styles.css              # Estilos responsivos
├── js/
│   └── servicosMOI.js      # Base de serviços MOI
├── manifest.webmanifest    # PWA manifest
├── sw.js                   # Service Worker (cache offline)
├── capacitor.config.json   # Configuração Capacitor
├── package.json            # Dependências e scripts
├── gerar-icones-auto.html  # Gerador automático de ícones
├── gerar-icones.html       # Gerador interativo de ícones
└── limpar-dados.html       # Utilitário para limpar localStorage
```

## 💾 Armazenamento

- **Dados locais:** localStorage (ordensTrabalho, registrosLogistica, registroDiaAtual, tabelasCustomizadas, multiplicadores, configuracaoVeiculo)
- **Persistência:** Tudo fica no dispositivo; não há servidor
- **Backup:** Exportar JSON manualmente (botão "💾 Backup") - inclui OTs, logística e configurações de tabelas de serviços
- **Importação:** Restaurar de arquivo JSON (botão "📥 Importar") - restaura todos os dados incluindo configurações de serviços

## 📄 Fluxo mensal recomendado

1. Registrar OTs e logística diariamente
2. No último dia do mês:
   - Gerar PDF OT (aba Ordens de Trabalho)
   - Gerar PDF Logística (aba Logística Diária)
   - Fazer Backup JSON (guarda todos os dados em arquivo, incluindo configurações de tabelas de serviços)
3. (Opcional) Limpar dados antigos via `limpar-dados.html`

## 🛠️ Tecnologias

- HTML5 / CSS3 / JavaScript (Vanilla)
- jsPDF + autoTable (geração PDF)
- ZXing (scanner código de barras)
- Service Worker (cache offline)
- Web App Manifest (PWA)
- Capacitor (empacotamento nativo opcional)

## 🔒 Segurança & Privacidade

- Todos os dados ficam apenas no dispositivo
- Sem servidor, sem login, sem rastreamento
- Se limpar o app ou dados do navegador, o histórico é perdido (faça backup!)

## 📞 Suporte

Para mais informações, abra o app e clique em "❓ Ajuda".

---

**Versão:** 1.0.0  
**Licença:** Uso interno
