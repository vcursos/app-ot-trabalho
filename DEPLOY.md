# 🚀 Como Hospedar e Testar no iPhone

## Opção 1: Netlify Drop (MAIS FÁCIL - 30 segundos)

### Passo a passo:
1. Acesse: https://app.netlify.com/drop
2. Arraste a pasta inteira do projeto para a área indicada
3. Aguarde o upload (alguns segundos)
4. Copie o link gerado (tipo: `https://random-name-123.netlify.app`)
5. Abra o link no iPhone Safari
6. Siga as instruções do banner para instalar

### Vantagens:
✅ Sem cadastro necessário
✅ HTTPS automático (PWA funciona)
✅ Grátis
✅ Instantâneo

### Atualizar:
- Arraste a pasta novamente (gera novo link)
- Ou faça login e use o mesmo site

---

## Opção 2: GitHub Pages (Permanente)

### Passo a passo:
1. Crie conta no GitHub (se não tiver): https://github.com
2. Crie novo repositório (botão verde "New")
   - Nome: `app-ot-trabalho`
   - Público
3. Faça upload dos arquivos:
   - Clique em "uploading an existing file"
   - Arraste todos os arquivos do projeto
   - Commit changes
4. Vá em Settings > Pages
5. Source: Deploy from a branch
6. Branch: main / (root)
7. Save
8. Aguarde 1-2 minutos
9. Link: `https://seu-usuario.github.io/app-ot-trabalho`

### Vantagens:
✅ Permanente (enquanto o repo existir)
✅ HTTPS automático
✅ Histórico de versões (Git)
✅ Pode atualizar sempre que quiser

---

## Opção 3: Vercel (Profissional)

### Passo a passo:

```powershell
# 1. Instalar Vercel CLI (uma vez só)
npm install -g vercel

# 2. Na pasta do projeto, rodar:
cd "c:\Users\HP\Documents\Apps\App OT trabalho"
vercel

# 3. Seguir as instruções:
# - Login (via email ou GitHub)
# - Set up and deploy? Yes
# - Which scope? (escolha sua conta)
# - Link to existing project? No
# - Project name? ot-trabalho (ou outro)
# - In which directory? ./ (enter)
# - Want to override settings? No

# 4. Vercel faz deploy e retorna o link
```

Link gerado: `https://ot-trabalho.vercel.app` (ou similar)

### Para atualizar:
```powershell
vercel --prod
```

### Vantagens:
✅ Deploy em segundos
✅ Atualizações fáceis
✅ Domínio customizado grátis
✅ Analytics

---

## Opção 4: ngrok (Teste Temporário - Sem Upload)

### Passo a passo:

```powershell
# Terminal 1: Servidor local
cd "c:\Users\HP\Documents\Apps\App OT trabalho"
npm run serve
# ou
python -m http.server 5173

# Terminal 2: ngrok
npx ngrok http 5173
```

Copie o link HTTPS gerado (tipo: `https://abc123.ngrok-free.app`)

### Vantagens:
✅ Não precisa upload
✅ Ideal para teste com 1-2 pessoas
✅ Servidor roda no seu PC

### Desvantagens:
⚠️ Link expira quando você fechar
⚠️ Seu PC precisa estar ligado e conectado

---

## 📱 Como Testar no iPhone

Depois de hospedar (qualquer opção acima):

1. Abra o link no **Safari** (não Chrome!)
2. Banner aparece automaticamente com instruções
3. Ou manualmente:
   - Toque no botão **Compartilhar** (🔼 na barra inferior)
   - Role para baixo
   - Toque em **"Adicionar à Tela de Início"**
   - Confirme
4. Ícone do app aparece na tela inicial
5. Abra como qualquer app nativo

---

## 🔗 Compartilhar com outros

Mande o link gerado por qualquer opção acima via:
- WhatsApp
- Email
- SMS
- QR Code (gere em: https://qr.io/)

---

## ⚡ Recomendação

**Para teste rápido (hoje):**  
→ Use **Netlify Drop** (opção 1)

**Para uso prolongado/profissional:**  
→ Use **Vercel** (opção 3) ou **GitHub Pages** (opção 2)

---

## 🆘 Problemas Comuns

**"O app não instala no iPhone"**
- Certifique-se que está usando Safari (não Chrome)
- Verifique se o link é HTTPS (não HTTP)
- Limpe cache do Safari: Configurações > Safari > Limpar Histórico

**"Service Worker não registra"**
- Só funciona em HTTPS ou localhost
- file:// não funciona
- Verifique console do navegador (F12)

**"Ícones não aparecem"**
- Gere os ícones com `gerar-icones-auto.html`
- Mova `icon-192.png` e `icon-512.png` para raiz
- Faça novo upload/deploy

---

**Última atualização:** 2025-11-09
