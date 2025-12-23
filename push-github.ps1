# Script de Push Automático para GitHub
# Usuario: vcursos

param(
    [string]$mensagem = "Atualização automática"
)

Write-Host "🚀 Push Automático para GitHub - vcursos" -ForegroundColor Cyan
Write-Host ""

# Navegar para o diretório do projeto
Set-Location "c:\Users\HP\Documents\Apps\App OT trabalho"

# Status atual
Write-Host "📊 Status atual:" -ForegroundColor Yellow
git status --short

Write-Host ""
Write-Host "📦 Adicionando arquivos..." -ForegroundColor Green
git add .

Write-Host "💾 Criando commit..." -ForegroundColor Green
git commit -m "$mensagem"

Write-Host "🔼 Fazendo push para GitHub..." -ForegroundColor Green
git push

Write-Host ""
Write-Host "✅ Push concluído! Verifique em:" -ForegroundColor Cyan
Write-Host "   https://github.com/vcursos/app-ot-trabalho" -ForegroundColor White
Write-Host ""
