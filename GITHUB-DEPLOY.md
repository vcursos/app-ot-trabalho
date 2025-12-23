# 📦 Deploy no GitHub Pages - Passo a Passo

## ✅ Pré-requisitos
- Conta no GitHub (você já tem)
- Ícones gerados (icon-192.png e icon-512.png na pasta raiz)

---

## 🚀 Passo 1: Gerar os Ícones (se ainda não fez)

1. Abra o arquivo `gerar-icones-auto.html` no navegador
2. Os arquivos `icon-192.png` e `icon-512.png` serão baixados automaticamente
3. Mova esses 2 arquivos da pasta Downloads para a raiz do projeto (mesma pasta do index.html)

---

## 🌐 Passo 2: Criar Repositório no GitHub

1. Acesse: https://github.com/new

2. Preencha:
   - **Repository name:** `app-ot-trabalho` (ou outro nome sem espaços)
   - **Description:** (opcional) "Controle de OTs e Logística - PWA"
   - **Public** (marque esta opção)
   - ❌ NÃO marque "Add a README file"
   - ❌ NÃO marque .gitignore
   - ❌ NÃO escolha license

3. Clique em **"Create repository"**

---

## 📤 Passo 3: Fazer Upload dos Arquivos

Na página do repositório que acabou de criar:

1. Clique no link **"uploading an existing file"** (logo abaixo do título)

2. **Arraste TODOS os arquivos** da pasta do projeto:
   ```
   ✅ index.html
   ✅ script1.js
   ✅ styles.css
   ✅ manifest.webmanifest
   ✅ sw.js
   ✅ capacitor.config.json
   ✅ package.json
   ✅ limpar-dados.html
   ✅ gerar-icones.html
   ✅ gerar-icones-auto.html
   ✅ README.md
   ✅ DEPLOY.md
   ✅ logo.png
   ✅ icon-192.png ⬅️ IMPORTANTE
   ✅ icon-512.png ⬅️ IMPORTANTE
   ✅ pasta js/ (com servicosMOI.js dentro)
   ✅ pasta assets/ (se existir)
   ```

3. No campo "Commit changes":
   - Deixe a mensagem como está: "Add files via upload"
   - Ou mude para: "Initial commit - App OT Telecom v1.0"

4. Clique em **"Commit changes"** (botão verde)

5. Aguarde o upload terminar

---

## ⚙️ Passo 4: Ativar GitHub Pages

1. No repositório, clique em **"Settings"** (no menu superior)

2. No menu lateral esquerdo, clique em **"Pages"**

3. Em **"Source"**, selecione:
   - **Deploy from a branch**

4. Em **"Branch"**, selecione:
   - Branch: **main** (ou master, se for o caso)
   - Folder: **/ (root)**

5. Clique em **"Save"**

6. Aguarde alguns segundos e **recarregue a página**

7. Aparecerá uma mensagem no topo:
   ```
   Your site is live at https://seu-usuario.github.io/app-ot-trabalho/
   ```

8. **Copie esse link!**

---

## 📱 Passo 5: Testar no iPhone

1. Abra o link no **Safari do iPhone**:
   ```
   https://seu-usuario.github.io/app-ot-trabalho/
   ```

2. O banner automático aparecerá com instruções

3. Ou manualmente:
   - Toque no botão **Compartilhar** (🔼 na barra inferior)
   - Role para baixo
   - Toque em **"Adicionar à Tela de Início"**
   - Confirme

4. O app aparece na tela inicial como qualquer app nativo

---

## 🔄 Como Atualizar (quando fizer mudanças)

### Opção A: Via Web (mais fácil)

1. Entre no repositório no GitHub
2. Clique no arquivo que quer atualizar (ex: `script1.js`)
3. Clique no ícone de lápis (Edit)
4. Faça as alterações
5. Role para baixo e clique em "Commit changes"
6. Aguarde 1-2 minutos para o GitHub Pages atualizar

### Opção B: Upload de vários arquivos

1. Entre no repositório
2. Clique em "Add file" > "Upload files"
3. Arraste os arquivos atualizados (sobrescreve os antigos)
4. Commit changes

---

## 🔗 Compartilhar com Outros

Mande o link para quem quiser testar:
```
https://seu-usuario.github.io/app-ot-trabalho/
```

Via:
- WhatsApp
- Email
- SMS
- QR Code: https://qr.io/ (cole o link para gerar QR code)

---

## 🆘 Problemas Comuns

### "404 - File not found"
- Aguarde 2-3 minutos após ativar GitHub Pages
- Certifique-se que o repositório é **público**
- Verifique se `index.html` está na raiz (não em subpasta)

### "Ícones não aparecem"
- Confirme que `icon-192.png` e `icon-512.png` estão na raiz
- Faça upload novamente se necessário
- Limpe cache do navegador

### "Service Worker não funciona"
- GitHub Pages tem HTTPS automático, então deve funcionar
- Teste em modo anônimo/privado primeiro
- Verifique console do navegador (F12)

### "PWA não instala no iPhone"
- Use Safari (não Chrome ou outro)
- Certifique-se que o link começa com `https://`
- Limpe cache: Settings > Safari > Clear History

---

## ✨ Pronto!

Seu app está no ar e funcionando 24/7 gratuitamente!

O link nunca expira (enquanto o repositório existir).

---

**Última atualização:** 2025-11-09
