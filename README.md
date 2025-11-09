# Controle de Ordens de Trabalho - PWA Instalável

Aplicativo web progressivo (PWA) para registro de Ordens de Trabalho e Logística Diária de técnicos de telecomunicações.

## ✨ Funcionalidades

- ✅ Registro de OTs com serviços MOI, adicionais e equipamentos
- ✅ Scanner de código de barras via câmera
- ✅ Logística diária: KM rodados, abastecimento, consumo
- ✅ Geração de PDF mensal (OT + Logística)
- ✅ Backup/Importação JSON (sem servidor)
- ✅ Funciona 100% offline após instalação
- ✅ Responsivo: funciona em desktop, tablet, celular
- ✅ Instalável como app nativo (Android/iOS)

## 📱 Instalação

### Como app no celular (PWA)

**Android (Chrome/Edge/Brave):**
1. Abra o app em um servidor HTTP/HTTPS
2. Clique no botão "⬇️ Instalar" que aparece no topo
3. Ou: menu do navegador > "Adicionar à tela inicial"

**iPhone (Safari):**
1. Abra o app no Safari
2. Toque no botão Compartilhar (🔼 na barra inferior)
3. Role para baixo e escolha "Adicionar à Tela de Início"
4. Um banner de ajuda aparece automaticamente no app

### Como rodar localmente (desenvolvimento)

Precisa servir via HTTP (não pode ser file://):

```powershell
# Opção 1: Python (se tiver instalado)
python -m http.server 5173

# Opção 2: Node.js http-server (após npm install)
npx http-server -p 5173 .

# Opção 3: PHP
php -S localhost:5173
```

Abra: `http://localhost:5173`

## 🎨 Ícones PWA

Para gerar os ícones otimizados (192x192 e 512x512):

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

- **Dados locais:** localStorage (ordensTrabalho, registrosLogistica, registroDiaAtual)
- **Persistência:** Tudo fica no dispositivo; não há servidor
- **Backup:** Exportar JSON manualmente (botão "💾 Backup JSON")
- **Importação:** Restaurar de arquivo JSON (botão "📥 Importar Backup")

## 📄 Fluxo mensal recomendado

1. Registrar OTs e logística diariamente
2. No último dia do mês:
   - Gerar PDF OT (aba Ordens de Trabalho)
   - Gerar PDF Logística (aba Logística Diária)
   - Fazer Backup JSON (guarda todos os dados em arquivo)
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
