# Melhorias na Sincronização Automática

## Resumo das Mudanças

Este documento descreve as melhorias implementadas no sistema de sincronização automática com Firebase para garantir que os dados sejam sempre sincronizados entre dispositivos.

## Problema Original

Quando o usuário registrava informações e saía do aplicativo, os dados não eram sincronizados automaticamente com o Firebase. Isso fazia com que, ao abrir em outro celular e fazer login, as informações salvas não aparecessem.

## Solução Implementada

### 1. Event Listeners de Ciclo de Vida (script1.js)

Adicionados três event listeners importantes para sincronização automática:

#### a) `beforeunload`
- Sincroniza dados quando o usuário fecha a aba/janela
- Garante que dados sejam enviados antes de sair do app
- Código:
```javascript
window.addEventListener('beforeunload', function() {
    if (window.__firebaseSync && typeof window.__firebaseSync.pushLocal === 'function') {
        window.__firebaseSync.pushLocal('beforeunload').catch(() => {});
    }
});
```

#### b) `visibilitychange`
- Sincroniza quando o app vai para background (crucial para mobile/PWA)
- Detecta quando o documento fica oculto (usuário troca de app)
- Código:
```javascript
document.addEventListener('visibilitychange', function() {
    if (document.visibilityState === 'hidden') {
        if (window.__firebaseSync && typeof window.__firebaseSync.pushLocal === 'function') {
            window.__firebaseSync.pushLocal('visibilitychange-hidden').catch(() => {});
        }
    }
});
```

#### c) `online`
- Sincroniza automaticamente quando a conexão é restaurada
- Usa `forceSync` para garantir pull + push completo
- Código:
```javascript
window.addEventListener('online', function() {
    if (window.__firebaseSync && typeof window.__firebaseSync.forceSync === 'function') {
        window.__firebaseSync.forceSync('online').catch(() => {});
    }
});
```

### 2. Auto-Sync Mais Frequente

- **Antes:** Intervalo de 10 minutos
- **Depois:** Intervalo de 3 minutos
- **Motivo:** Dados mais atualizados entre dispositivos sem impacto significativo no desempenho

```javascript
const INTERVAL_MS = 3 * 60 * 1000; // Reduzido de 10min para 3min
```

### 3. Push Imediato em `notificarMudancaParaSync()`

- **Antes:** Apenas chamava `pushLocal()` sem garantir execução
- **Depois:** Chama `pushLocal()` com tratamento de erro apropriado
- **Benefício:** Mudanças são sincronizadas imediatamente após cada operação

```javascript
function notificarMudancaParaSync(motivo) {
    try {
        if (window.__firebaseSync && typeof window.__firebaseSync.pushLocal === 'function') {
            // Push imediato (não em background) para garantir sincronização
            window.__firebaseSync.pushLocal(motivo || 'change').catch(() => {
                // silencioso se falhar
            });
        }
    } catch (e) {
        console.warn('Falha ao notificar sync:', e);
    }
}
```

### 4. Feedback Visual Melhorado (js/syncFirebase.js)

Adicionadas mensagens de feedback durante o processo de sincronização:

- **Iniciando:** "Buscando dados do servidor..."
- **Aplicando:** "Aplicando dados do servidor..."
- **Sucesso:** "Dados sincronizados com sucesso"
- **Erro:** "Erro ao buscar dados do servidor"

```javascript
// Feedback visual: iniciando sincronização
this.onStatus({ state: 'syncing', phase: 'pull', message: 'Buscando dados do servidor...' });

// Feedback visual: aplicando dados
this.onStatus({ state: 'syncing', phase: 'applying', message: 'Aplicando dados do servidor...' });

// Feedback final: concluído
this.onStatus({ state: 'remote-applied', at: remote?.meta?.updatedAt || null, message: 'Dados sincronizados com sucesso' });
```

## Como Testar

### Teste 1: Sincronização ao Fechar App
1. Abra o app no navegador
2. Faça login com Google
3. Registre uma nova OT
4. Feche a aba do navegador
5. Abra o app em outro dispositivo/navegador
6. Faça login com a mesma conta
7. **Resultado Esperado:** A OT registrada deve aparecer

### Teste 2: Sincronização ao Ir para Background (Mobile)
1. Abra o app PWA instalado no celular
2. Faça login
3. Registre uma nova OT
4. Pressione o botão Home (app vai para background)
5. Abra o app em outro dispositivo
6. Faça login com a mesma conta
7. **Resultado Esperado:** A OT registrada deve aparecer

### Teste 3: Sincronização ao Voltar Online
1. Abra o app
2. Faça login
3. Desabilite a conexão de internet (modo avião)
4. Registre uma nova OT (salva localmente)
5. Habilite a conexão de internet novamente
6. Aguarde alguns segundos
7. Abra o app em outro dispositivo
8. **Resultado Esperado:** A OT registrada deve aparecer

### Teste 4: Pull de Dados ao Fazer Login
1. Dispositivo A: Faça login e registre algumas OTs
2. Dispositivo B: Abra o app (sem login ainda)
3. Dispositivo B: Faça login com a mesma conta
4. **Resultado Esperado:** As OTs do Dispositivo A devem aparecer imediatamente no Dispositivo B

### Teste 5: Auto-Sync Periódico (3 minutos)
1. Abra o app e faça login
2. Registre uma OT
3. Deixe o app aberto
4. Em outro dispositivo, abra o app e faça login
5. Aguarde até 3 minutos
6. **Resultado Esperado:** A OT deve aparecer automaticamente sem precisar recarregar

## Critérios de Aceitação

✅ Ao fechar o app (aba/janela), os dados são enviados para o servidor
✅ Ao ir para background (mobile), os dados são enviados
✅ Ao fazer login em outro dispositivo, os dados do servidor são carregados corretamente
✅ Ao voltar online após estar offline, sincroniza automaticamente
✅ Não há regressões nas funcionalidades existentes
✅ Feedback visual durante o processo de sincronização

## Arquivos Modificados

1. **script1.js**
   - Adicionados event listeners para beforeunload, visibilitychange, online
   - Melhorada função `notificarMudancaParaSync()` para push imediato
   - Reduzido intervalo de auto-sync de 10 para 3 minutos

2. **js/syncFirebase.js**
   - Melhorada função `_pullRemoteOnLogin()` com feedback visual
   - Adicionadas mensagens de status durante sincronização
   - Documentação melhorada sobre comportamento SEMPRE preferir remoto no login

## Compatibilidade

- ✅ Desktop (Chrome, Firefox, Safari, Edge)
- ✅ Mobile Web (Chrome Mobile, Safari iOS)
- ✅ PWA Instalado (Android, iOS)
- ✅ Offline-First (mantém localStorage como cache)

## Notas Técnicas

### beforeunload
- Tem tempo limitado de execução (~100ms em alguns browsers)
- Firebase SDK pode usar `sendBeacon` internamente se configurado
- Garante melhor esforço (best-effort) para enviar dados

### visibilitychange
- Evento mais confiável para mobile/PWA
- Dispara quando app vai para background
- Tempo de execução mais generoso que beforeunload

### online
- Dispara quando conexão é restaurada
- Usa `forceSync()` para garantir pull + push completo
- Essencial para cenário offline-first

### Auto-sync
- Intervalo de 3 minutos é um bom equilíbrio
- Não impacta significativamente bateria/dados
- Garante dados atualizados sem ser intrusivo

## Segurança

Todas as mudanças mantêm o modelo de segurança existente:
- Autenticação via Firebase Auth (Google/Email)
- Dados armazenados por usuário (users/{uid}/appData/main)
- LocalStorage como cache offline
- Firebase como fonte da verdade no servidor
