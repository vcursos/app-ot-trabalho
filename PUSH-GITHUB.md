# 🚀 Como fazer Push para o GitHub

## Passo 1: Criar Repositório no GitHub

1. Acesse: https://github.com/vcursos
2. Clique em **"New"** (novo repositório)
3. Nome sugerido: **app-ot-trabalho** ou **ot-telecom**
4. Descrição: "Sistema de Gestão de Ordens de Trabalho - Telecom com Tabelas Customizáveis"
5. Deixe como **Público** ou **Privado** (sua escolha)
6. **NÃO** marque "Initialize with README" (já temos arquivos)
7. Clique em **"Create repository"**

## Passo 2: Conectar e Fazer Push

Após criar o repositório no GitHub, execute estes comandos:

### Opção A: Se o repositório for público ou você já configurou SSH
```powershell
cd "c:\Users\HP\Documents\Apps\App OT trabalho"
git remote add origin https://github.com/vcursos/app-ot-trabalho.git
git push -u origin main
```

### Opção B: Se preferir usar token de acesso pessoal (recomendado)
```powershell
cd "c:\Users\HP\Documents\Apps\App OT trabalho"
git remote add origin https://github.com/vcursos/app-ot-trabalho.git
git push -u origin main
```

Quando pedir credenciais:
- **Username**: vcursos
- **Password**: Use um Personal Access Token (não a senha do GitHub)

### Como criar Personal Access Token:
1. GitHub > Settings > Developer settings > Personal access tokens > Tokens (classic)
2. Generate new token
3. Marque: `repo` (acesso completo a repositórios)
4. Copie o token gerado
5. Use como senha no comando `git push`

## Passo 3: Verificar

Após o push, acesse:
```
https://github.com/vcursos/app-ot-trabalho
```

Você verá todos os arquivos lá! ✅

## 🔄 Próximas Atualizações

Sempre que fizer mudanças, use:

```powershell
cd "c:\Users\HP\Documents\Apps\App OT trabalho"
git add .
git commit -m "Descrição das mudanças"
git push
```

## 📝 Estrutura Enviada

✅ **86 arquivos** incluindo:
- Sistema completo de OT
- Configuração de tabelas customizáveis
- Sistema de multiplicadores
- Plataforma Android (Capacitor)
- Documentação completa
- Scripts de build

## 🎯 Pronto!

Seu projeto estará disponível em:
**https://github.com/vcursos/app-ot-trabalho**

---

**Nota**: Substitua `app-ot-trabalho` pelo nome que você escolher no GitHub.
