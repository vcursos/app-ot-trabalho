let ordensTrabalho = JSON.parse(localStorage.getItem('ordensTrabalho')) || [];
let equipamentosTemp = []; // Array temporário para equipamentos antes de salvar OT

// ==================== SORT STATE ====================
// Estado atual de ordenação: { field: 'data'|'numeroOT', direction: 'asc'|'desc' }
let currentSort = { field: 'data', direction: 'desc' }; // Default: data desc (mais recente primeiro)

// ==================== EDIT STATE ====================
// ID da OT sendo editada (null se for nova OT)
let otEmEdicao = null;

// ==================== SINCRONIZAÇÃO (Firebase opcional) ====================
// Opção 2: sincronizar desktop <-> mobile via Firestore.
// Mantém localStorage como fonte offline. Quando Firebase está configurado,
// enviamos mudanças e aplicamos mudanças remotas em tempo real.
window.__firebaseSync = null;

function atualizarUIStatusSync(msg) {
    try {
        const el = document.getElementById('syncStatus');
        if (!el) return;
        el.textContent = msg || '';
    } catch {}
}

function setAuthPanelsVisibilidade({ mostrarAuthPanel } = {}) {
    try {
        const authPanel = document.getElementById('syncAuthPanel');
        if (authPanel && typeof mostrarAuthPanel === 'boolean') {
            authPanel.style.display = mostrarAuthPanel ? 'flex' : 'none';
        }
    } catch {}
}

function setBotaoSairVisivel(visivel) {
    try {
        const el = document.getElementById('btnSyncSair');
        if (el) el.style.display = visivel ? 'inline-flex' : 'none';
    } catch {}
}

function setBotaoForcarSyncVisivel(visivel) {
    try {
        const el = document.getElementById('btnSyncForcar');
        if (el) el.style.display = visivel ? 'inline-flex' : 'none';
    } catch {}
}

function setBotaoSalvarVisivel(visivel) {
    try {
        const el = document.getElementById('btnSyncSalvar');
        if (el) el.style.display = visivel ? 'inline-flex' : 'none';
    } catch {}
}

function setBotaoCarregarVisivel(visivel) {
    try {
        const el = document.getElementById('btnSyncCarregar');
        if (el) el.style.display = visivel ? 'inline-flex' : 'none';
    } catch {}
}

function setBotoesEntrarVisiveis(visivel) {
    try {
        const ids = ['btnSyncGoogle'];
        ids.forEach(id => {
            const el = document.getElementById(id);
            if (!el) return;
            const isInput = el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT';
            el.style.display = visivel ? (isInput ? 'inline-block' : 'inline-flex') : 'none';
        });
    } catch {}
}

function setGoogleControlVisivel(visivel) {
    try {
        const el = document.getElementById('btnSyncGoogle');
        if (el) el.style.display = visivel ? 'inline-flex' : 'none';
    } catch {}
}

function aplicarUIPosLogin() {
    // Garantia extra para PWA mobile: aplica o estado visual logo após autenticar.
    try {
        setBotoesEntrarVisiveis(false);
        setGoogleControlVisivel(false);
        setBotaoSairVisivel(true);
        setBotaoForcarSyncVisivel(true);
        setBotaoSalvarVisivel(true);
        setBotaoCarregarVisivel(true);
    } catch {}
}

function setBotoesAuthHabilitados(habilitar) {
    try {
        const ids = [
            'btnSyncGoogle',
            'btnSyncSair',
        ];
        ids.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.disabled = !habilitar;
        });
    } catch {}
}

function mostrarPromptLoginSeNecessario() {
    try {
        const jaMostrou = localStorage.getItem('syncLoginPromptMostrado') === '1';
        if (jaMostrou) return;
        localStorage.setItem('syncLoginPromptMostrado', '1');

        // Mostra um aviso leve só na primeira vez
        setTimeout(() => {
            alert('Para sincronizar entre celular e desktop, faça login (Google ou Email).\n\nSe preferir, você pode usar sem login (fica salvo só neste aparelho).');
        }, 1200);
    } catch {}
}

// ==== FUNÇÕES GLOBAIS (UI de autenticação do Sync) ====
// Agora: somente Google + Sair.
try { console.log('[sync-ui] handlers carregados (Google-only)'); } catch {}

async function garantirSyncPronto() {
    try {
        if (window.__firebaseSync) return window.__firebaseSync;

        // Import dinâmico (mesmo fluxo usado no DOMContentLoaded)
        const mod = await import('./js/syncFirebase.js');
        if (!mod || !mod.FirebaseSync) {
            throw new Error('Módulo de sync não encontrado.');
        }

        window.__firebaseSync = new mod.FirebaseSync({
            enabled: true,
            onRemoteApplied: () => {
                try {
                    ordensTrabalho = JSON.parse(localStorage.getItem('ordensTrabalho')) || [];
                    historicoOTPorMes = JSON.parse(localStorage.getItem('historicoOTPorMes')) || {};
                    premiosFestivosPorDia = JSON.parse(localStorage.getItem('premiosFestivosPorDia')) || {};
                } catch {}

                try {
                    atualizarTabela();
                    atualizarResumos();
                    atualizarUIFestivoPorDia();
                    if (typeof atualizarTabelaLogistica === 'function') atualizarTabelaLogistica();
                } catch {}
            },
            onStatus: (st) => {
                try {
                    if (!st || !st.state) return;
                    if (st.state === 'not-configured') {
                        atualizarUIStatusSync('Sync: desativado (Firebase não configurado)');
                        setAuthPanelsVisibilidade({ mostrarAuthPanel: true });
                        setBotoesEntrarVisiveis(true);
                        setBotaoSairVisivel(false);
                        return;
                    }
                    if (st.state === 'logged-out') {
                        atualizarUIStatusSync('Sync: desligado (sem login)');
                        setAuthPanelsVisibilidade({ mostrarAuthPanel: true });
                        setBotoesEntrarVisiveis(true);
                        setBotaoSairVisivel(false);
                        setBotaoForcarSyncVisivel(false);
                        setBotaoSalvarVisivel(false);
                        setBotaoCarregarVisivel(false);
                        setGoogleControlVisivel(true);
                        mostrarPromptLoginSeNecessario();
                        return;
                    }
                    if (st.state === 'ready') {
                        const email = st.email ? ` | ${st.email}` : '';
                        atualizarUIStatusSync(`Sync: ativo${email} (UID ${String(st.uid).slice(0, 6)}…)`);
                        setAuthPanelsVisibilidade({ mostrarAuthPanel: true });
                        // Após autenticar: não mostrar novamente opções de login.
                        setBotoesEntrarVisiveis(false);
                        setBotaoSairVisivel(true);
                        setBotaoForcarSyncVisivel(true);
                        setBotaoSalvarVisivel(true);
                        setBotaoCarregarVisivel(true);
                        // Esconde também os controles individuais (garantia extra)
                        setGoogleControlVisivel(false);
                        return;
                    }
                    if (st.state === 'pushed') {
                        atualizarUIStatusSync('Sync: ok');
                        return;
                    }
                    if (st.state === 'remote-applied') {
                        atualizarUIStatusSync('Sync: atualizado');
                        return;
                    }
                    if (st.state === 'redirect-error') {
                        atualizarUIStatusSync('Sync: erro no redirect (ver console)');
                        setAuthPanelsVisibilidade({ mostrarAuthPanel: true });
                        setBotoesEntrarVisiveis(true);
                        setBotaoSairVisivel(false);
                        return;
                    }
                    if (String(st.state).includes('error')) {
                        atualizarUIStatusSync('Sync: erro (ver console)');
                    }
                } catch {}
            }
        });

        await window.__firebaseSync.init();
        return window.__firebaseSync;
    } catch (e) {
        console.warn('Falha ao iniciar sync:', e);
        throw e;
    }
}

window.syncEntrarGoogle = async function() {
    try {
        try { console.log('[sync-ui] clique Google'); } catch {}
        atualizarUIStatusSync('Sync: iniciando...');
        const sync = await garantirSyncPronto();
        await sync.entrarGoogle();
        aplicarUIPosLogin();
    } catch (e) {
        console.error(e);
        const msg = String(e?.message || e);
        const code = e?.code ? String(e.code) : '';
        let dica = '';
        if (code.includes('auth/unauthorized-domain') || msg.toLowerCase().includes('unauthorized')) {
            dica = '\n\nDica: No Firebase Console → Authentication → Settings → Authorized domains, adicione seu domínio do GitHub Pages (ex.: vcursos.github.io).';
        } else if (code.includes('auth/operation-not-allowed')) {
            dica = '\n\nDica: No Firebase Console → Authentication → Sign-in method, habilite o provedor Google.';
        } else if (code.includes('auth/popup-blocked') || msg.toLowerCase().includes('popup')) {
            dica = '\n\nDica: Pop-up bloqueado. O app vai tentar entrar por redirecionamento. Se não abrir, desative bloqueador de pop-up.';
        }
        alert('Falha ao entrar com Google: ' + (code ? code + ' | ' : '') + msg + dica);
    }
};


window.syncSair = async function() {
    try {
        try { console.log('[sync-ui] clique Sair'); } catch {}
        if (!window.__firebaseSync) return;
        await window.__firebaseSync.sair();
        alert('Saiu da conta.');
    } catch (e) {
        console.error(e);
        alert('Falha ao sair: ' + (e?.message || e));
    }
};

window.syncForcarAgora = async function() {
    try {
        atualizarUIStatusSync('Sync: forçando...');
        const sync = await garantirSyncPronto();
        if (typeof sync.forceSync === 'function') {
            await sync.forceSync('ui');
        } else {
            // fallback antigo
            await sync.pushLocal?.('manual');
        }
    } catch (e) {
        console.error(e);
        alert('Falha ao forçar sync: ' + (e?.message || e));
    }
};

window.syncSalvarAgora = async function() {
    try {
        // Verificar se está logado
        const sync = await garantirSyncPronto();
        if (!sync || !sync.getUserInfo) {
            alert('Por favor, faça login primeiro.');
            return;
        }
        const info = sync.getUserInfo();
        if (!info || !info.uid) {
            alert('Por favor, faça login primeiro.');
            return;
        }

        // Confirmar ação
        if (!confirm('Deseja salvar agora?')) {
            return;
        }

        // Atualizar status
        atualizarUIStatusSync('Sync: salvando...');

        // Chamar pushLocal
        if (typeof sync.pushLocal === 'function') {
            await sync.pushLocal('manual-save');
            atualizarUIStatusSync('Sync: salvo!');
            setTimeout(() => {
                atualizarUIStatusSync(`Sync: ativo | ${info.email || ''} (UID ${String(info.uid).slice(0, 6)}…)`);
            }, 2000);
        } else {
            throw new Error('Método pushLocal não disponível');
        }
    } catch (e) {
        console.error(e);
        atualizarUIStatusSync('Sync: erro ao salvar');
        alert('Falha ao salvar dados: ' + (e?.message || e));
    }
};

window.syncCarregarAgora = async function() {
    try {
        // Verificar se está logado
        const sync = await garantirSyncPronto();
        if (!sync || !sync.getUserInfo) {
            alert('Por favor, faça login primeiro.');
            return;
        }
        const info = sync.getUserInfo();
        if (!info || !info.uid) {
            alert('Por favor, faça login primeiro.');
            return;
        }

        // Confirmar ação
        if (!confirm('Carregar dados salvos do servidor?')) {
            return;
        }

        // Atualizar status
        atualizarUIStatusSync('Sync: carregando...');

        // Chamar forceSync (pull + push if local newer)
        if (typeof sync.forceSync === 'function') {
            await sync.forceSync('manual-load');
            atualizarUIStatusSync('Sync: carregado!');
            setTimeout(() => {
                atualizarUIStatusSync(`Sync: ativo | ${info.email || ''} (UID ${String(info.uid).slice(0, 6)}…)`);
            }, 2000);
        } else {
            throw new Error('Método forceSync não disponível');
        }
    } catch (e) {
        console.error(e);
        atualizarUIStatusSync('Sync: erro ao carregar');
        alert('Falha ao carregar dados: ' + (e?.message || e));
    }
};

// Auto-sync: a cada 3 minutos, puxa/envia dados se estiver logado.
// Não mostra alertas e não bloqueia o usuário.
(function iniciarAutoSync10min() {
    const INTERVAL_MS = 3 * 60 * 1000; // Reduzido de 10min para 3min
    let rodando = false;

    async function tick() {
        try {
            if (rodando) return;
            if (!navigator.onLine) return;
            const sync = window.__firebaseSync;
            if (!sync || !sync.getUserInfo) return;
            const info = sync.getUserInfo();
            if (!info?.uid) return;

            rodando = true;
            // Usar forceSync para garantir pull+push.
            if (typeof sync.forceSync === 'function') {
                await sync.forceSync('auto');
            } else if (typeof sync.pushLocal === 'function') {
                await sync.pushLocal('auto');
            }
        } catch {
            // silencioso
        } finally {
            rodando = false;
        }
    }

    // Primeira tentativa pouco depois de carregar (ajuda PWA pós-login)
    setTimeout(tick, 2500);
    // Repetição a cada 3 minutos
    setInterval(tick, INTERVAL_MS);
})();

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

// ==================== SINCRONIZAÇÃO AUTOMÁTICA (EVENTOS DE CICLO DE VIDA) ====================
// Sincronizar ao sair do app ou ir para background

// Sincronizar ao fechar aba/janela
// NOTA: beforeunload tem tempo limitado (~100ms em alguns browsers)
// Usamos melhor esforço (best-effort): Firebase SDK pode usar sendBeacon internamente
// Para garantir 100%, o usuário deve esperar 1-2 segundos antes de fechar (ou usar visibilitychange no mobile)
window.addEventListener('beforeunload', function() {
    try {
        if (window.__firebaseSync && typeof window.__firebaseSync.pushLocal === 'function') {
            // pushLocal é async, mas Firebase SDK pode usar sendBeacon se configurado
            window.__firebaseSync.pushLocal('beforeunload').catch(() => {});
        }
    } catch (e) {
        // Silencioso - beforeunload tem tempo limitado
        console.warn('Erro ao sincronizar no beforeunload:', e);
    }
});

// Sincronizar ao ir para background (mobile/PWA)
document.addEventListener('visibilitychange', function() {
    if (document.visibilityState === 'hidden') {
        try {
            if (window.__firebaseSync && typeof window.__firebaseSync.pushLocal === 'function') {
                window.__firebaseSync.pushLocal('visibilitychange-hidden').catch(() => {});
            }
        } catch (e) {
            // Silencioso para não atrapalhar transição de app
            console.warn('Erro ao sincronizar no visibilitychange:', e);
        }
    }
});

// Sincronizar ao voltar online
window.addEventListener('online', function() {
    try {
        if (window.__firebaseSync && typeof window.__firebaseSync.forceSync === 'function') {
            window.__firebaseSync.forceSync('online').catch(() => {});
        }
    } catch (e) {
        // Silencioso
        console.warn('Erro ao sincronizar ao voltar online:', e);
    }
});

// ==================== HISTÓRICO (ARQUIVO MENSAL) ====================
// Mantém todos os meses armazenados para consulta futura.
// Estrutura: { 'YYYY-MM': [ots...] }
let historicoOTPorMes = JSON.parse(localStorage.getItem('historicoOTPorMes')) || {};

function getMesAnoFromISODate(isoDateOrDateTime) {
    const d = new Date(isoDateOrDateTime);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function salvarHistoricoOT() {
    localStorage.setItem('historicoOTPorMes', JSON.stringify(historicoOTPorMes));
    notificarMudancaParaSync('historicoOTPorMes');
}

function garantirOTNoHistorico(ot) {
    if (!ot || !ot.data) return;
    const mesAno = getMesAnoFromISODate(ot.data);
    if (!historicoOTPorMes[mesAno]) historicoOTPorMes[mesAno] = [];
    // Evitar duplicar por id
    if (!historicoOTPorMes[mesAno].some(x => x && x.id === ot.id)) {
        historicoOTPorMes[mesAno].push(ot);
    }
}

function sincronizarHistoricoComOTsAtuais() {
    try {
        ordensTrabalho.forEach(garantirOTNoHistorico);
        salvarHistoricoOT();
    } catch (e) {
        console.warn('Falha ao sincronizar histórico:', e);
    }
}

function obterOTsDoMes(mesAno) {
    // Preferir histórico, mas SEMPRE filtrar contra ordensTrabalho atual.
    // Isso garante que qualquer OT apagada não volte a aparecer no PDF,
    // mesmo que por algum motivo tenha ficado “presa” no histórico.
    const doHistorico = (historicoOTPorMes && historicoOTPorMes[mesAno]) ? historicoOTPorMes[mesAno] : [];
    const doAtual = ordensTrabalho.filter(ot => getMesAnoFromISODate(ot.data) === mesAno);

    // Se existir histórico, usa ele como base (mantém meses antigos), mas remove ids que não existem mais.
    if (doHistorico.length > 0) {
        const idsAtuais = new Set((ordensTrabalho || []).map(ot => ot && ot.id).filter(Boolean));
        return doHistorico.filter(ot => ot && idsAtuais.has(ot.id));
    }

    return doAtual;
}

// Controle de prémio festivo por dia (aplicar no máximo 1x por data)
// Estrutura: { 'YYYY-MM-DD': { valor: number, aplicadoEm: ISOString } }
let premiosFestivosPorDia = JSON.parse(localStorage.getItem('premiosFestivosPorDia')) || {};

function getDataISO(isoStringOrDate) {
    // Retorna YYYY-MM-DD baseado na data LOCAL do dispositivo (não UTC)
    const d = isoStringOrDate ? new Date(isoStringOrDate) : new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

function formatarDataBRFromISODate(isoDate) {
    // isoDate: 'YYYY-MM-DD'
    if (!isoDate) return '-';
    const d = new Date(isoDate + 'T00:00:00');
    return d.toLocaleDateString('pt-BR');
}

function salvarPremiosFestivosPorDia() {
    localStorage.setItem('premiosFestivosPorDia', JSON.stringify(premiosFestivosPorDia));
    notificarMudancaParaSync('premiosFestivosPorDia');
}

function premioJaAplicadoNoDia(dataISO) {
    return !!(premiosFestivosPorDia && premiosFestivosPorDia[dataISO] && (parseFloat(premiosFestivosPorDia[dataISO].valor) || 0) > 0);
}

function getPremioRegistradoNoDia(dataISO) {
    if (!premiosFestivosPorDia || !premiosFestivosPorDia[dataISO]) return 0;
    return parseFloat(premiosFestivosPorDia[dataISO].valor) || 0;
}

function setPremioNoDiaSeMaior(dataISO, valor, aplicadoEm) {
    if (!dataISO) return;
    const atual = getPremioRegistradoNoDia(dataISO);
    const novo = parseFloat(valor) || 0;
    if (novo <= 0) return;
    if (!premiosFestivosPorDia[dataISO] || novo > atual) {
        premiosFestivosPorDia[dataISO] = {
            valor: novo,
            aplicadoEm: aplicadoEm || new Date().toISOString()
        };
        salvarPremiosFestivosPorDia();
    }
}

function atualizarUIFestivoPorDia() {
    const checkboxFestivo = document.getElementById('otFestivo');
    const preview = document.getElementById('previewPremioFestivo');
    const badgeFestivo = document.getElementById('badgeFestivo');
    if (!checkboxFestivo) return;

    const mult = typeof obterMultiplicadores === 'function' ? obterMultiplicadores() : { premioFestivo: 0 };
    const premioBase = parseFloat(mult.premioFestivo) || 0;
    // Considera a data selecionada no formulário (se existir), para não depender do "hoje"
    const dataFormEl = document.getElementById('dataOT');
    const dataBase = (dataFormEl && dataFormEl.value) ? (dataFormEl.value + 'T00:00:00') : null;
    const hojeISO = getDataISO(dataBase);
    const jaAplicado = premioJaAplicadoNoDia(hojeISO);

    if (jaAplicado) {
        checkboxFestivo.checked = false;
        checkboxFestivo.disabled = true;
        checkboxFestivo.setAttribute('title', 'Prémio festivo já aplicado hoje');
        if (preview) {
            const val = parseFloat(premiosFestivosPorDia[hojeISO]?.valor) || 0;
            preview.textContent = val > 0
                ? `Prémio do dia já aplicado em ${formatarDataBRFromISODate(hojeISO)}: € ${val.toFixed(2)}`
                : 'Prémio do dia já aplicado hoje.';
        }
        if (badgeFestivo) badgeFestivo.style.display = 'none';
    } else {
        checkboxFestivo.disabled = false;
        checkboxFestivo.removeAttribute('title');
        if (preview) {
            preview.textContent = premioBase > 0
                ? `Prémio configurado: € ${premioBase.toFixed(2)} (aplica 1x por dia)`
                : 'Prémio configurado: € 0.00';
        }
    }
}

// Inicialização
document.addEventListener('DOMContentLoaded', function() {
    // Não bloquear os botões de login: se ficarem "disabled", o clique não dispara.
    // O fluxo de sync já lida com init sob demanda.
    setBotoesAuthHabilitados(true);
    popularTodosServicos();
    popularAdicionais();
    atualizarTabela();
    atualizarResumos();
    definirDataAtual();
    atualizarListaEquipamentos();
    carregarConfiguracaoVeiculo();

    // Data da OT: sempre sincronizar com a data do dispositivo
    sincronizarDataOTComDispositivo();

    // Garantir que meses anteriores seguem armazenados
    sincronizarHistoricoComOTsAtuais();

    // Festivo: atualizar estado (1x por dia)
    atualizarUIFestivoPorDia();
    
    // Listener para atualizar valor quando serviço for selecionado
    document.getElementById('tipoServico').addEventListener('change', atualizarValorServico);
    
    // Listener para adicional
    document.getElementById('adicionalServico').addEventListener('change', atualizarValorAdicional);

    // Iniciar sync (se configurado) depois que a UI básica estiver pronta
    (async function iniciarSyncFirebase() {
        try {
            // Import dinâmico do módulo de sync
            const mod = await import('./js/syncFirebase.js');
            if (!mod || !mod.FirebaseSync) return;

            window.__firebaseSync = new mod.FirebaseSync({
                enabled: true,
                onRemoteApplied: () => {
                    // Recarregar variáveis globais a partir do localStorage atualizado
                    try {
                        ordensTrabalho = JSON.parse(localStorage.getItem('ordensTrabalho')) || [];
                        historicoOTPorMes = JSON.parse(localStorage.getItem('historicoOTPorMes')) || {};
                        premiosFestivosPorDia = JSON.parse(localStorage.getItem('premiosFestivosPorDia')) || {};
                    } catch {}

                    try {
                        atualizarTabela();
                        atualizarResumos();
                        atualizarUIFestivoPorDia();
                        if (typeof atualizarTabelaLogistica === 'function') atualizarTabelaLogistica();
                    } catch {}
                },
                onStatus: (st) => {
                    if (!st || !st.state) return;
                    if (st.state === 'not-configured') {
                        atualizarUIStatusSync('Sync: desativado (Firebase não configurado)');
                        setBotoesAuthHabilitados(true);
                        return;
                    }
                    if (st.state === 'logged-out') {
                        atualizarUIStatusSync('Sync: desligado (sem login)');
                        setBotoesAuthHabilitados(true);
                        // Mantém painel visível para o usuário poder clicar.
                        setAuthPanelsVisibilidade({ mostrarAuthPanel: true });
                        return;
                    }
                    if (st.state === 'ready') {
                        const email = st.email ? ` | ${st.email}` : '';
                        const modo = st.isAnonymous ? 'anônimo' : 'conta';
                        atualizarUIStatusSync(`Sync: ativo (${modo})${email} (UID ${String(st.uid).slice(0, 6)}…)`);

                        setBotoesAuthHabilitados(true);

                        // Agora o app pode ficar sem login (sem anônimo). Mantém painel visível,
                        // mas alterna visibilidade dos botões via setBotoesEntrarVisiveis/setBotaoSairVisivel.
                        setAuthPanelsVisibilidade({ mostrarAuthPanel: true });

                        // Se a sessão foi restaurada após reload, refletir imediatamente na UI.
                        // (Sem isso, o botão "Entrar (Google)" volta a aparecer.)
                        try {
                            setBotoesEntrarVisiveis(false);
                            setGoogleControlVisivel(false);
                            setBotaoSairVisivel(true);
                            setBotaoForcarSyncVisivel(true);
                            setBotaoSalvarVisivel(true);
                            setBotaoCarregarVisivel(true);
                        } catch {}
                        return;
                    }
                    if (st.state === 'pushed') {
                        atualizarUIStatusSync('Sync: ok');
                        return;
                    }
                    if (st.state === 'remote-applied') {
                        atualizarUIStatusSync('Sync: atualizado');
                        return;
                    }
                    if (String(st.state).includes('error')) {
                        atualizarUIStatusSync('Sync: erro (ver console)');
                        setBotoesAuthHabilitados(true);
                        return;
                    }
                }
            });

            await window.__firebaseSync.init();
        } catch (e) {
            console.warn('Sync Firebase não iniciou:', e);
            atualizarUIStatusSync('Sync: indisponível');
            setBotoesAuthHabilitados(true);
        }
    })();
});

function getHojeISO() {
    return getDataISO(new Date());
}

function sincronizarDataOTComDispositivo() {
    const campo = document.getElementById('dataOT');
    if (!campo) return;

    const hoje = getHojeISO();

    // Ao abrir: se vazio, preenche com hoje
    if (!campo.value) {
        campo.value = hoje;
    }

    // Bloquear datas futuras (data do dispositivo é o máximo)
    campo.max = hoje;

    // Reaplicar estado do festivo quando mudar a data
    campo.addEventListener('change', function() {
        const hojeAgora = getHojeISO();
        // Se o usuário tentar colocar futuro, corrigir
        if (campo.value && campo.value > hojeAgora) {
            campo.value = hojeAgora;
        }
        campo.max = hojeAgora;
        atualizarUIFestivoPorDia();
    });

    // Se virar o dia com o app aberto, atualiza automaticamente (sem sobrescrever se o usuário estiver vendo data antiga)
    setInterval(function() {
        const hojeAgora = getHojeISO();
        if (campo.max !== hojeAgora) campo.max = hojeAgora;

        // Só ajusta o campo se ele estiver vazio OU ainda estiver no dia anterior
        // (não força mudança quando o usuário abriu mês/dia antigos para conferir)
        if (!campo.value || campo.value < hojeAgora) {
            campo.value = hojeAgora;
            atualizarUIFestivoPorDia();
        }
    }, 60 * 1000);
}

// ==================== CONFIGURAÇÃO DO VEÍCULO ====================
function salvarConfiguracaoVeiculo() {
    const config = {
        modelo: document.getElementById('modeloCarro').value || '',
        consumo: parseFloat(document.getElementById('consumoCarro').value) || 5.15
    };
    localStorage.setItem('configuracaoVeiculo', JSON.stringify(config));
}

function carregarConfiguracaoVeiculo() {
    const config = localStorage.getItem('configuracaoVeiculo');
    if (config) {
        const dados = JSON.parse(config);
        if (document.getElementById('modeloCarro')) {
            document.getElementById('modeloCarro').value = dados.modelo || '';
        }
        if (document.getElementById('consumoCarro')) {
            document.getElementById('consumoCarro').value = dados.consumo || 5.15;
        }
    } else {
        // Valor padrão
        if (document.getElementById('consumoCarro')) {
            document.getElementById('consumoCarro').value = 5.15;
        }
    }
}

function obterConsumoConfigurado() {
    const config = localStorage.getItem('configuracaoVeiculo');
    if (config) {
        const dados = JSON.parse(config);
        return dados.consumo || 5.15;
    }
    return 5.15;
}

// Adicionar equipamento à lista temporária
function adicionarEquipamento() {
    const codigo = document.getElementById('macEquipamento').value.trim();
    
    if (!codigo) {
        alert('Digite ou escaneie o código de barras do equipamento!');
        return;
    }
    
    // Adicionar ao array temporário (só o código, sem tipo)
    equipamentosTemp.push(codigo);
    
    // Atualizar visualização
    atualizarListaEquipamentos();
    
    // Limpar campo
    document.getElementById('macEquipamento').value = '';
}

// Atualizar visualização da lista de equipamentos
function atualizarListaEquipamentos() {
    const lista = document.getElementById('listaEquipamentos');
    const msgVazio = document.getElementById('msgEquipamentosVazio');
    
    if (!lista) return;
    
    // Limpa sempre o container antes de renderizar
    lista.innerHTML = '';

    if (equipamentosTemp.length === 0) {
        if (msgVazio) msgVazio.style.display = 'block';
        return;
    } else {
        if (msgVazio) msgVazio.style.display = 'none';
    }

    lista.innerHTML = equipamentosTemp.map((codigo, index) => `
        <div style="display: inline-flex; align-items: center; gap: 5px; padding: 5px 10px; background: #667eea; color: white; border-radius: 5px; margin: 2px; font-size: 12px;">
            <span>📦 ${codigo}</span>
            <button type="button" onclick="removerEquipamento(${index})" style="background: rgba(255,255,255,0.3); color: white; border: none; padding: 2px 6px; border-radius: 3px; cursor: pointer; font-weight: bold;">✕</button>
        </div>
    `).join('');
}

// Remover equipamento da lista
function removerEquipamento(index) {
    equipamentosTemp.splice(index, 1);
    atualizarListaEquipamentos();
}

function definirDataAtual() {
    const hoje = new Date();
    const mes = String(hoje.getMonth() + 1).padStart(2, '0');
    const ano = hoje.getFullYear();
    document.getElementById('filtroMes').value = `${ano}-${mes}`;
}

// Formulário
document.getElementById('formOT').addEventListener('submit', function(e) {
    e.preventDefault();
    
    const numeroOT = document.getElementById('numeroOT').value;
    const tipoServico = document.getElementById('tipoServico').value;
    
    // Validação básica - pelo menos OT ou Serviço deve estar preenchido
    if (!numeroOT && !tipoServico) {
        alert('Preencha pelo menos o Número da OT ou o Tipo de Serviço!');
        return;
    }
    
    let servicoInfo = null;
    if (tipoServico) {
        try {
            servicoInfo = JSON.parse(tipoServico);
        } catch (e) {
            servicoInfo = getServicoInfo(tipoServico);
        }
    }
    
    const categoriaSelecionada = document.getElementById('categoriaServico').value;
    const adicionalSelecionado = document.getElementById('adicionalServico').value;
    
    let adicionalInfo = null;
    if (adicionalSelecionado) {
        try {
            adicionalInfo = JSON.parse(adicionalSelecionado);
        } catch (e) {
            adicionalInfo = getServicoInfo(adicionalSelecionado);
        }
    }
    
    // Obter multiplicador selecionado
    const multiplicadorEl = document.getElementById('multiplicadorServico');
    const tipoMultiplicador = multiplicadorEl ? multiplicadorEl.value : 'normal';
    const mult = obterMultiplicadores();
    const valorMultiplicador = mult[tipoMultiplicador] || 1.0;
    
    // Valores base sem multiplicador
    const valorServicoBase = servicoInfo ? servicoInfo.valor : 0;
    const valorAdicionalBase = adicionalInfo ? adicionalInfo.valor : 0;

    // Pontos base
    const pontosServicoBase = servicoInfo ? (parseFloat(servicoInfo.pontos) || 0) : 0;
    const pontosAdicionalBase = adicionalInfo ? (parseFloat(adicionalInfo.pontos) || 0) : 0;
    
    // Valor total com multiplicador
    const valorTotalFinal = parseFloat(document.getElementById('valorTotal').value) || (valorServicoBase + valorAdicionalBase);

    // Prémio festivo (extra do dia), aplicado apenas 1x por dia
    const checkboxFestivo = document.getElementById('otFestivo');
    const dataFormEl = document.getElementById('dataOT');
    const dataOTISO = (dataFormEl && dataFormEl.value) ? dataFormEl.value : getDataISO();
    const hojeISO = dataOTISO;
    const premioConfigurado = parseFloat((obterMultiplicadores()?.premioFestivo)) || 0;
    const permitirAplicarHoje = !premioJaAplicadoNoDia(hojeISO);
    const marcadoFestivo = !!(checkboxFestivo && checkboxFestivo.checked);
    const premioAplicado = (marcadoFestivo && permitirAplicarHoje) ? premioConfigurado : 0;
    
    const ot = {
        id: otEmEdicao || Date.now(), // Usar ID existente se estiver editando
        // Guardar a data da OT (não a data/hora de cadastro), para o PDF sempre mostrar correto
        data: dataOTISO + 'T00:00:00',
        numeroOT: numeroOT || '-',
        tipoServico: servicoInfo ? servicoInfo.item : (tipoServico || '-'),
        categoria: categoriaSelecionada,
        rede: servicoInfo ? servicoInfo.red : '',
        tipologia: servicoInfo ? servicoInfo.tipologia : '',
        adicional: adicionalInfo ? adicionalInfo.item : (adicionalSelecionado || ''),
        adicionalDesc: adicionalInfo ? adicionalInfo.tipologia : '',
        valorAdicional: valorAdicionalBase,
    pontosServico: pontosServicoBase,
    pontosAdicional: pontosAdicionalBase,
        multiplicador: tipoMultiplicador,
        valorMultiplicador: valorMultiplicador,
    otFestivo: (marcadoFestivo && permitirAplicarHoje),
        premioFestivoAplicado: premioAplicado,
        equipamentos: [...equipamentosTemp], // Copiar array de equipamentos
        tipoTrabalho: document.getElementById('tipoTrabalho').value || '-',
        observacoes: document.getElementById('observacoes').value || '',
        valorServico: valorTotalFinal
    };
    
    // Modo edição: atualizar OT existente
    if (otEmEdicao) {
        const index = ordensTrabalho.findIndex(o => o.id === otEmEdicao);
        if (index !== -1) {
            ordensTrabalho[index] = ot;
        }
        otEmEdicao = null; // Resetar modo edição
    } else {
        // Modo novo: adicionar nova OT
        ordensTrabalho.push(ot);
    }

    // Arquivar no histórico do mês (não apagar meses antigos)
    garantirOTNoHistorico(ot);
    salvarHistoricoOT();

    // Se foi marcado e aplicado hoje, registrar que o prémio do dia já foi usado
    if (premioAplicado > 0) {
        setPremioNoDiaSeMaior(hojeISO, premioAplicado, ot.data);
    }

    salvarDados();
    atualizarTabela();
    atualizarResumos();
    limparFormulario();

    // Atualizar UI (desabilita se já aplicou)
    atualizarUIFestivoPorDia();
    
    alert('Ordem de trabalho registrada com sucesso!');
});

function limparFormulario() {
    document.getElementById('formOT').reset();
    limparCamposServico();
    
    // Resetar modo de edição
    otEmEdicao = null;
    
    // Resetar multiplicador para normal
    const multiplicadorEl = document.getElementById('multiplicadorServico');
    if (multiplicadorEl) {
        multiplicadorEl.value = 'normal';
    }

    // Resetar festivo
    const checkboxFestivo = document.getElementById('otFestivo');
    if (checkboxFestivo) {
        checkboxFestivo.checked = false;
    }

    // Atualizar preview do prémio
    calcularValorTotal();

    // Atualizar estado do festivo (pode ficar desabilitado se já aplicado hoje)
    atualizarUIFestivoPorDia();
    
    equipamentosTemp = [];
    atualizarListaEquipamentos();
    
    // Resetar texto do botão e título
    const btnSubmit = document.querySelector('#formOT button[type="submit"]');
    if (btnSubmit) {
        btnSubmit.textContent = 'Registrar OT';
        btnSubmit.style.background = '';
    }
    
    const formSection = document.querySelector('.form-section h2');
    if (formSection) {
        formSection.textContent = 'Nova Ordem de Trabalho';
        formSection.style.color = '';
    }
}

function obterValorServico(itemMOI) {
    const servico = getServicoInfo(itemMOI);
    return servico ? servico.valor : 0;
}

function popularTodosServicos() {
    // Usa o novo sistema de servicos-custom.js
    if (typeof popularSelectsServicos === 'function') {
        popularSelectsServicos();
    } else {
        console.error('Sistema de serviços customizados não carregado!');
    }
}

function popularAdicionais() {
    // Já é populado pelo servicos-custom.js automaticamente
    // Esta função mantida apenas para compatibilidade
}

function atualizarValorAdicional() {
    const select = document.getElementById('adicionalServico');
    
    if (select.value) {
        try {
            const adicional = JSON.parse(select.value);
            const valorAdicional = adicional.valor || 0;
            document.getElementById('valorAdicional').value = valorAdicional.toFixed(2);
        } catch (e) {
            console.error('Erro ao processar adicional:', e);
            document.getElementById('valorAdicional').value = '0.00';
        }
    } else {
        document.getElementById('valorAdicional').value = '0.00';
    }
    
    calcularValorTotal();
}

function calcularValorTotal() {
    // Usa função do servicos-custom.js que suporta multiplicadores
    if (typeof calcularValorTotalComMultiplicador === 'function') {
        calcularValorTotalComMultiplicador();

        // Festivo: NÃO somar no "valorTotal" (o prémio deve aparecer separado no PDF)
        const checkboxFestivo = document.getElementById('otFestivo');
        const badgeFestivo = document.getElementById('badgeFestivo');
        if (badgeFestivo) {
            badgeFestivo.style.display = (checkboxFestivo && checkboxFestivo.checked) ? 'inline-flex' : 'none';
        }

        // Atualiza preview/estado (inclui regra 1x por dia)
        atualizarUIFestivoPorDia();
    } else {
        // Fallback para cálculo simples
        const valorServico = parseFloat(document.getElementById('valorServico').value.replace(' ', '').replace(',', '.')) || 0;
        const valorAdicional = parseFloat(document.getElementById('valorAdicional').value.replace(' ', '').replace(',', '.')) || 0;
        let total = valorServico + valorAdicional;

        const checkboxFestivo = document.getElementById('otFestivo');
        const badgeFestivo = document.getElementById('badgeFestivo');
        if (badgeFestivo) {
            badgeFestivo.style.display = (checkboxFestivo && checkboxFestivo.checked) ? 'inline-flex' : 'none';
        }

        // Festivo: NÃO somar no total do serviço
        atualizarUIFestivoPorDia();

        document.getElementById('valorTotal').value = ` ${total.toFixed(2)}`;
    }
}

function popularServicosPorCategoria(categoria) {
    const select = document.getElementById('tipoServico');
    
    if (!categoria) {
        select.disabled = true;
        select.innerHTML = '<option value="">Selecione a categoria primeiro...</option>';
        limparCamposServico();
        return;
    }
    
    // Verificar se servicosMOI existe
    if (typeof servicosMOI === 'undefined') {
        console.error('servicosMOI não está definido!');
        select.innerHTML = '<option value="">Erro ao carregar serviços</option>';
        return;
    }
    
    // Habilitar select e limpar
    select.disabled = false;
    select.innerHTML = '<option value="">Selecione um serviço...</option>';
    
    // Filtrar serviços pela categoria selecionada
    const servicosFiltrados = servicosMOI.filter(s => s.categoria === categoria);
    
    if (servicosFiltrados.length === 0) {
        select.innerHTML = '<option value="">Nenhum serviço encontrado nesta categoria</option>';
        return;
    }
    
    servicosFiltrados.forEach(servico => {
        const option = document.createElement('option');
        option.value = servico.item;
        option.textContent = `${servico.item} - ${servico.tipologia}`;
        option.dataset.valor = servico.valor;
        option.dataset.red = servico.red;
        option.dataset.categoria = servico.categoria;
        option.dataset.tipologia = servico.tipologia;
        select.appendChild(option);
    });
    
    limparCamposServico();
}

function limparCamposServico() {
    document.getElementById('valorServico').value = '';
    document.getElementById('redeServico').value = '';
    document.getElementById('categoriaServico').value = '';
    document.getElementById('valorTotal').value = '';
}

function atualizarValorServico() {
    const select = document.getElementById('tipoServico');
    
    if (select.value) {
        try {
            const servico = JSON.parse(select.value);
            const valor = servico.valor || 0;
            const rede = servico.red || '';
            const categoria = servico.categoria || '';
            const codigo = servico.item || '';
            const descricao = servico.tipologia || '';
            
            // Atualizar campos readonly
            document.getElementById('valorServico').value = valor.toFixed(2);
            document.getElementById('redeServico').value = rede;
            document.getElementById('categoriaServico').value = categoria;
            
            // Auto-selecionar tipo de trabalho baseado no código/descrição
            const selectTipoTrabalho = document.getElementById('tipoTrabalho');
            if (selectTipoTrabalho) {
                if (codigo.startsWith('INST') || categoria.includes('INSTALACIONES')) {
                    // Verificar se é migração (reutilizada)
                    if (descricao.toLowerCase().includes('reutilizada') || 
                        descricao.toLowerCase().includes('reutilizado') ||
                        descricao.toLowerCase().includes('migracion') ||
                        descricao.toLowerCase().includes('migração')) {
                        selectTipoTrabalho.value = 'migracao';
                    } else {
                        selectTipoTrabalho.value = 'instalacao';
                    }
                } else if (codigo.startsWith('AVAR') || categoria.includes('AVERIAS') || categoria.includes('POSTVENTAS')) {
                    selectTipoTrabalho.value = 'avaria';
                }
            }
            
            // Calcular total com multiplicador
            calcularValorTotal();
        } catch (e) {
            console.error('Erro ao processar serviço:', e);
            limparCamposServico();
        }
    } else {
        limparCamposServico();
    }
}

function salvarDados() {
    localStorage.setItem('ordensTrabalho', JSON.stringify(ordensTrabalho));
    notificarMudancaParaSync('ordensTrabalho');
}

// ==================== SORTING FUNCTIONS ====================
/**
 * Ordena array de OTs baseado no estado de ordenação atual
 */
function ordenarOTs(ots) {
    if (!ots || ots.length === 0) return ots;
    
    const sorted = [...ots]; // Cria cópia para não modificar o original
    
    sorted.sort((a, b) => {
        let compareValue = 0;
        
        if (currentSort.field === 'data') {
            // Ordenar por data
            const dateA = new Date(a.data);
            const dateB = new Date(b.data);
            compareValue = dateA - dateB;
        } else if (currentSort.field === 'numeroOT') {
            // Ordenar por número da OT (string comparison)
            const numA = String(a.numeroOT || '').toLowerCase();
            const numB = String(b.numeroOT || '').toLowerCase();
            compareValue = numA.localeCompare(numB);
        }
        
        // Aplicar direção (asc ou desc)
        return currentSort.direction === 'asc' ? compareValue : -compareValue;
    });
    
    return sorted;
}

/**
 * Alterna a ordenação por um campo específico
 */
function toggleSort(field) {
    if (currentSort.field === field) {
        // Se já está ordenando por esse campo, inverte a direção
        currentSort.direction = currentSort.direction === 'asc' ? 'desc' : 'asc';
    } else {
        // Se é um campo novo, começa com desc (conforme requisito: data deve começar desc = mais recente primeiro)
        currentSort.field = field;
        currentSort.direction = 'desc';
    }
    
    // Atualizar indicadores visuais no header
    atualizarIndicadoresOrdenacao();
    
    // Re-renderizar tabela com nova ordenação
    const termo = document.getElementById('pesquisaMAC').value.toLowerCase().trim();
    if (termo) {
        pesquisarPorMAC();
    } else {
        aplicarFiltros();
    }
}

/**
 * Atualiza os indicadores visuais de ordenação nos headers da tabela
 */
function atualizarIndicadoresOrdenacao() {
    // Atualizar indicador de Data
    const thData = document.querySelector('th[data-sort="data"]');
    if (thData) {
        const arrow = currentSort.field === 'data' 
            ? (currentSort.direction === 'asc' ? ' ▲' : ' ▼')
            : '';
        // Use textContent for the arrow to avoid XSS
        const span = thData.querySelector('.sort-arrow') || document.createElement('span');
        span.className = 'sort-arrow';
        span.textContent = arrow;
        thData.textContent = 'Data ';
        thData.appendChild(span);
    }
    
    // Atualizar indicador de OT
    const thOT = document.querySelector('th[data-sort="numeroOT"]');
    if (thOT) {
        const arrow = currentSort.field === 'numeroOT' 
            ? (currentSort.direction === 'asc' ? ' ▲' : ' ▼')
            : '';
        // Use textContent for the arrow to avoid XSS
        const span = thOT.querySelector('.sort-arrow') || document.createElement('span');
        span.className = 'sort-arrow';
        span.textContent = arrow;
        thOT.textContent = 'OT ';
        thOT.appendChild(span);
    }
}

// Helper: ordena OTs por data descendente (mais recentes primeiro)
function ordenarOTsPorDataDesc(ots) {
    return [...ots].sort((a, b) => {
        // Compara strings ISO de data (formato YYYY-MM-DDTHH:mm:ss)
        // OTs sem data válida vão para o final da lista
        const FALLBACK_DATE = '0000-01-01T00:00:00';
        const dataA = a.data || FALLBACK_DATE;
        const dataB = b.data || FALLBACK_DATE;
        // Comparação lexicográfica simples (ISO dates são comparáveis como strings)
        return dataB > dataA ? 1 : dataB < dataA ? -1 : 0;
    });
}

function atualizarTabela(filtrarMes = null) {
    const tbody = document.getElementById('corpoTabela');
    tbody.innerHTML = '';
    
    let otsFiltradas = ordensTrabalho;
    
    // Aplicar filtro de mês
    if (filtrarMes) {
        otsFiltradas = otsFiltradas.filter(ot => {
            const dataOT = new Date(ot.data);
            const mesAno = `${dataOT.getFullYear()}-${String(dataOT.getMonth() + 1).padStart(2, '0')}`;
            return mesAno === filtrarMes;
        });
    }
    
    if (otsFiltradas.length === 0) {
        tbody.innerHTML = '<tr class="empty-state"><td colspan="10">Nenhuma ordem de trabalho encontrada</td></tr>';
        return;
    }
    
    // Aplicar ordenação
    otsFiltradas = ordenarOTs(otsFiltradas);
    
    otsFiltradas.forEach(ot => {
        const tr = document.createElement('tr');
        const data = new Date(ot.data);
        
        // Formatar equipamentos para exibição
        const equipamentosTexto = ot.equipamentos && ot.equipamentos.length > 0
            ? ot.equipamentos.map(eq => typeof eq === 'string' ? eq : `${eq.tipo}: ${eq.mac}`).join(', ')
            : (ot.macEquipamento || '-');
        
        tr.innerHTML = `
            <td>${data.toLocaleDateString('pt-BR')}</td>
            <td><strong>${ot.numeroOT}</strong></td>
            <td><small>${ot.tipoServico}</small></td>
            <td><small>${ot.adicional ? ot.adicional : '-'}</small></td>
            <td><small>${ot.categoria || '-'}</small></td>
            <td><span class="badge-rede">${ot.rede || '-'}</span></td>
            <td>${formatarTipoTrabalho(ot.tipoTrabalho)}</td>
            <td><small>${equipamentosTexto}</small></td>
            <td><strong style="color: #27ae60;">€ ${ot.valorServico.toFixed(2)}</strong></td>
            <td>
                <button class="btn-edit" onclick="editarOT(${ot.id})" title="Editar">✏️</button>
                <button class="btn-delete" onclick="deletarOT(${ot.id})" title="Excluir">🗑️</button>
            </td>
        `;
        
        tbody.appendChild(tr);
    });
    
    // Atualizar indicadores de ordenação
    atualizarIndicadoresOrdenacao();
}

function formatarTipoTrabalho(tipo) {
    const tipos = {
        'instalacao': '🔧 Instalação',
        'avaria': '⚙️ Avaria',
        'manutencao': '⚙️ Avaria', // Manter compatibilidade com registros antigos
        'migracao': '🔄 Migração'
    };
    return tipos[tipo] || tipo;
}

function removerOTDoHistorico(id) {
    try {
        if (!historicoOTPorMes || !id) return;
        let alterou = false;
        Object.keys(historicoOTPorMes).forEach(mesAno => {
            const lista = Array.isArray(historicoOTPorMes[mesAno]) ? historicoOTPorMes[mesAno] : [];
            const nova = lista.filter(ot => ot && ot.id !== id);
            if (nova.length !== lista.length) {
                historicoOTPorMes[mesAno] = nova;
                alterou = true;
            }
        });
        if (alterou) salvarHistoricoOT();
    } catch (e) {
        console.warn('Falha ao remover OT do histórico:', e);
    }
}

function limparPremioFestivoDoDiaSeNaoExistirMaisOTFestiva(dataISO) {
    try {
        if (!dataISO) return;

        const aindaExiste = ordensTrabalho.some(ot => {
            if (!ot) return false;
            const dataOT = getDataISO(ot.data);
            const temFestivo = (parseFloat(ot.premioFestivoAplicado) || 0) > 0;
            return dataOT === dataISO && temFestivo;
        });

        if (!aindaExiste && premiosFestivosPorDia && premiosFestivosPorDia[dataISO]) {
            delete premiosFestivosPorDia[dataISO];
            salvarPremiosFestivosPorDia();
        }
    } catch (e) {
        console.warn('Falha ao limpar prémio festivo do dia:', e);
    }
}

function deletarOT(id) {
    if (confirm('Deseja realmente excluir esta ordem de trabalho?')) {
        // Capturar dados antes de remover, para limpar histórico e festivo do dia corretamente
        const otRemovida = ordensTrabalho.find(ot => ot && ot.id === id);
        const dataISO = otRemovida ? getDataISO(otRemovida.data) : null;

        ordensTrabalho = ordensTrabalho.filter(ot => ot.id !== id);
        removerOTDoHistorico(id);
        // Se essa OT era a última festiva do dia, limpar o map diário para não “travar” o checkbox
        limparPremioFestivoDoDiaSeNaoExistirMaisOTFestiva(dataISO);

        salvarDados();
        atualizarTabela();
        atualizarResumos();
        atualizarUIFestivoPorDia();

        notificarMudancaParaSync('deletarOT');
    }
}


// ==================== EDIT OT FUNCTION ====================
/**
 * Carrega os dados de uma OT existente no formulário para edição
 */
function editarOT(id) {
    const ot = ordensTrabalho.find(o => o.id === id);
    if (!ot) {
        alert('OT não encontrada!');
        return;
    }
    
    // Marcar que estamos editando esta OT
    otEmEdicao = id;
    
    // Rolar para o topo do formulário
    document.querySelector('.form-section').scrollIntoView({ behavior: 'smooth' });
    
    // Preencher os campos do formulário
    const dataISO = ot.data ? ot.data.substring(0, 10) : '';
    document.getElementById('dataOT').value = dataISO;
    document.getElementById('numeroOT').value = ot.numeroOT || '';
    document.getElementById('observacoes').value = ot.observacoes || '';
    document.getElementById('tipoTrabalho').value = ot.tipoTrabalho || '';
    
    // Preencher serviço
    if (ot.tipoServico) {
        try {
            // Tentar encontrar o serviço no select
            const selectServico = document.getElementById('tipoServico');
            const servicoInfo = {
                item: ot.tipoServico,
                valor: ot.valorServico || 0,
                red: ot.rede || '',
                categoria: ot.categoria || '',
                tipologia: ot.tipologia || '',
                pontos: ot.pontosServico || 0
            };
            selectServico.value = JSON.stringify(servicoInfo);
            atualizarValorServico();
        } catch (e) {
            console.warn('Erro ao restaurar serviço:', e);
        }
    }
    
    // Preencher adicional
    if (ot.adicional) {
        try {
            const selectAdicional = document.getElementById('adicionalServico');
            const adicionalInfo = {
                item: ot.adicional,
                valor: ot.valorAdicional || 0,
                tipologia: ot.adicionalDesc || '',
                pontos: ot.pontosAdicional || 0
            };
            selectAdicional.value = JSON.stringify(adicionalInfo);
            atualizarValorAdicional();
        } catch (e) {
            console.warn('Erro ao restaurar adicional:', e);
        }
    }
    
    // Preencher multiplicador
    if (ot.multiplicador) {
        const selectMultiplicador = document.getElementById('multiplicadorServico');
        if (selectMultiplicador) {
            selectMultiplicador.value = ot.multiplicador;
        }
    }
    
    // Preencher festivo
    const checkboxFestivo = document.getElementById('otFestivo');
    if (checkboxFestivo && ot.otFestivo) {
        checkboxFestivo.checked = true;
    }
    
    // Preencher equipamentos
    equipamentosTemp = ot.equipamentos ? [...ot.equipamentos] : [];
    atualizarListaEquipamentos();
    
    // Recalcular valor total
    calcularValorTotal();
    
    // Atualizar texto do botão para indicar modo edição
    const btnSubmit = document.querySelector('#formOT button[type="submit"]');
    if (btnSubmit) {
        btnSubmit.textContent = 'Atualizar OT';
        btnSubmit.style.background = 'linear-gradient(135deg, #f39c12 0%, #e67e22 100%)';
    }
    
    // Mostrar mensagem indicando modo de edição
    const formSection = document.querySelector('.form-section h2');
    if (formSection) {
        formSection.textContent = 'Editar Ordem de Trabalho #' + (ot.numeroOT || id);
        formSection.style.color = '#f39c12';
    }
}

function atualizarResumos() {
    const hoje = new Date().toDateString();
    const mesAtual = new Date().getMonth();
    const anoAtual = new Date().getFullYear();
    
    const otsDia = ordensTrabalho.filter(ot => new Date(ot.data).toDateString() === hoje);
    const otsMes = ordensTrabalho.filter(ot => {
        const data = new Date(ot.data);
        return data.getMonth() === mesAtual && data.getFullYear() === anoAtual;
    });
    
    const valorDia = otsDia.reduce((sum, ot) => sum + ot.valorServico, 0);
    const valorMes = otsMes.reduce((sum, ot) => sum + ot.valorServico, 0);

    const pontosDia = otsDia.reduce((sum, ot) => {
        const pServ = parseFloat(ot.pontosServico) || 0;
        const pAdd = parseFloat(ot.pontosAdicional) || 0;
        return sum + pServ + pAdd;
    }, 0);

    const pontosMes = otsMes.reduce((sum, ot) => {
        const pServ = parseFloat(ot.pontosServico) || 0;
        const pAdd = parseFloat(ot.pontosAdicional) || 0;
        return sum + pServ + pAdd;
    }, 0);
    
    document.getElementById('qtdDia').textContent = otsDia.length;
    document.getElementById('valorDia').textContent = `€ ${valorDia.toFixed(2)} | ${pontosDia.toFixed(1)} pts`;
    document.getElementById('qtdMes').textContent = otsMes.length;
    document.getElementById('valorMes').textContent = `€ ${valorMes.toFixed(2)} | ${pontosMes.toFixed(1)} pts`;
}

function filtrarPorMes() {
    const mes = document.getElementById('filtroMes').value;
    if (mes) {
        atualizarTabela(mes);
    } else {
        atualizarTabela();
    }
}

function aplicarFiltros() {
    const mes = document.getElementById('filtroMes').value;
    const categoria = document.getElementById('filtroCategoria').value;
    const rede = document.getElementById('filtroRede').value;
    
    const tbody = document.getElementById('corpoTabela');
    tbody.innerHTML = '';
    
    let otsFiltradas = ordensTrabalho;
    
    // Filtro por mês
    if (mes) {
        otsFiltradas = otsFiltradas.filter(ot => {
            const dataOT = new Date(ot.data);
            const mesAno = `${dataOT.getFullYear()}-${String(dataOT.getMonth() + 1).padStart(2, '0')}`;
            return mesAno === mes;
        });
    }
    
    // Filtro por categoria
    if (categoria) {
        otsFiltradas = otsFiltradas.filter(ot => ot.categoria === categoria);
    }
    
    // Filtro por rede
    if (rede) {
        otsFiltradas = otsFiltradas.filter(ot => ot.rede === rede);
    }
    
    if (otsFiltradas.length === 0) {
        tbody.innerHTML = '<tr class="empty-state"><td colspan="10">Nenhuma ordem de trabalho encontrada</td></tr>';
        return;
    }
    
    // Aplicar ordenação
    otsFiltradas = ordenarOTs(otsFiltradas);
    
    otsFiltradas.forEach(ot => {
        const tr = document.createElement('tr');
        const data = new Date(ot.data);
        
        // Formatar equipamentos para exibição
        const equipamentosTexto = ot.equipamentos && ot.equipamentos.length > 0
            ? ot.equipamentos.map(eq => typeof eq === 'string' ? eq : `${eq.tipo}: ${eq.mac}`).join(', ')
            : (ot.macEquipamento || '-');
        
        tr.innerHTML = `
            <td>${data.toLocaleDateString('pt-BR')}</td>
            <td><strong>${ot.numeroOT}</strong></td>
            <td><small>${ot.tipoServico}</small></td>
            <td><small>${ot.adicional ? ot.adicional : '-'}</small></td>
            <td><small>${ot.categoria || '-'}</small></td>
            <td><span class="badge-rede">${ot.rede || '-'}</span></td>
            <td>${formatarTipoTrabalho(ot.tipoTrabalho)}</td>
            <td><small>${equipamentosTexto}</small></td>
            <td><strong style="color: #27ae60;">€ ${ot.valorServico.toFixed(2)}</strong></td>
            <td>
                <button class="btn-edit" onclick="editarOT(${ot.id})" title="Editar">✏️</button>
                <button class="btn-delete" onclick="deletarOT(${ot.id})" title="Excluir">🗑️</button>
            </td>
        `;
        
        tbody.appendChild(tr);
    });
    
    // Atualizar indicadores de ordenação
    atualizarIndicadoresOrdenacao();
}

// Pesquisar por MAC
function pesquisarPorMAC() {
    const termo = document.getElementById('pesquisaMAC').value.toLowerCase().trim();
    const tbody = document.getElementById('corpoTabela');
    tbody.innerHTML = '';
    
    if (!termo) {
        aplicarFiltros();
        return;
    }
    
    const resultados = ordensTrabalho.filter(ot => {
        // Buscar em equipamentos novos
        if (ot.equipamentos && ot.equipamentos.length > 0) {
            return ot.equipamentos.some(eq => {
                const codigo = typeof eq === 'string' ? eq : eq.mac;
                return codigo.toLowerCase().includes(termo);
            });
        }
        // Compatibilidade com registros antigos
        if (ot.macEquipamento) {
            return ot.macEquipamento.toLowerCase().includes(termo);
        }
        return false;
    });
    
    if (resultados.length === 0) {
        tbody.innerHTML = '<tr class="empty-state"><td colspan="10">Nenhum equipamento encontrado com este MAC</td></tr>';
        return;
    }
    
    // Aplicar ordenação aos resultados da busca
    const resultadosOrdenados = ordenarOTs(resultados);
    
    resultadosOrdenados.forEach(ot => {
        const tr = document.createElement('tr');
        const data = new Date(ot.data);
        
        const equipamentosTexto = ot.equipamentos && ot.equipamentos.length > 0
            ? ot.equipamentos.map(eq => {
                const codigo = typeof eq === 'string' ? eq : eq.mac;
                // Destacar código encontrado
                const codigoDestacado = codigo.toLowerCase().includes(termo) 
                    ? `<mark style="background: yellow;">${codigo}</mark>` 
                    : codigo;
                return codigoDestacado;
            }).join(', ')
            : (ot.macEquipamento || '-');
        
        tr.innerHTML = `
            <td>${data.toLocaleDateString('pt-BR')}</td>
            <td><strong>${ot.numeroOT}</strong></td>
            <td><small>${ot.tipoServico}</small></td>
            <td><small>${ot.adicional ? ot.adicional : '-'}</small></td>
            <td><small>${ot.categoria || '-'}</small></td>
            <td><span class="badge-rede">${ot.rede || '-'}</span></td>
            <td>${formatarTipoTrabalho(ot.tipoTrabalho)}</td>
            <td><small>${equipamentosTexto}</small></td>
            <td><strong style="color: #27ae60;">€ ${ot.valorServico.toFixed(2)}</strong></td>
            <td>
                <button class="btn-edit" onclick="editarOT(${ot.id})" title="Editar">✏️</button>
                <button class="btn-delete" onclick="deletarOT(${ot.id})" title="Excluir">🗑️</button>
            </td>
        `;
        
        tbody.appendChild(tr);
    });
    
    // Atualizar indicadores de ordenação
    atualizarIndicadoresOrdenacao();
}

// Retorna exatamente as OTs visíveis na tabela (mesmo critério de filtros).
// Isso garante que o PDF "Ordens de Trabalho Registradas" gere somente o que está adicionado/visível,
// e nunca recupere OTs apagadas que possam ter ficado em cache/histórico.
function obterOTsVisiveisNaTabela() {
    // Fonte de verdade: o que está renderizado na TABELA.
    // Isso evita qualquer divergência entre filtros/estado e garante que:
    // tabela vazia => PDF vazio.
    const tbody = document.getElementById('corpoTabela');
    if (!tbody) return [];

    const linhas = Array.from(tbody.querySelectorAll('tr'));
    const visiveis = [];

    for (const tr of linhas) {
        // Ignorar estado vazio
        if (tr.classList.contains('empty-state')) continue;

        const btn = tr.querySelector('button.btn-delete');
        const onclick = btn ? (btn.getAttribute('onclick') || '') : '';
        const match = onclick.match(/deletarOT\((\d+)\)/);
        const id = match ? parseInt(match[1], 10) : null;
        if (!id) continue;

        const ot = (ordensTrabalho || []).find(o => o && o.id === id);
        if (ot) visiveis.push(ot);
    }

    return visiveis;
}

function garantirAutoTablePronto(doc) {
    // Alguns ambientes mobile/PWA falham ao expor o plugin como doc.autoTable.
    // Este helper tenta resolver e permite fallback para texto simples.
    try {
        if (doc && typeof doc.autoTable === 'function') return true;
        if (window.jspdf && window.jspdf.jsPDF && typeof window.jspdf.jsPDF === 'function') {
            // Tenta pegar o plugin via namespace global (padrão do jspdf-autotable)
            if (window.jspdf.jsPDF && window.jspdf.jsPDF.API && typeof window.jspdf.jsPDF.API.autoTable === 'function') {
                doc.autoTable = window.jspdf.jsPDF.API.autoTable;
                return true;
            }
        }
        if (window.jspdf && typeof window.jspdf.autoTable === 'function') {
            doc.autoTable = window.jspdf.autoTable;
            return true;
        }
        if (typeof window.autoTable === 'function') {
            doc.autoTable = (...args) => window.autoTable(doc, ...args);
            return true;
        }
    } catch (e) {
        console.warn('Falha ao preparar autoTable:', e);
    }
    return false;
}

function gerarPDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('landscape'); // Modo paisagem para mais colunas

    const temAutoTable = garantirAutoTablePronto(doc);
    
    const mesAtual = document.getElementById('filtroMes').value ||
                     `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;

    // IMPORTANTE: este PDF deve refletir exatamente o que está na tabela (após apagar, filtrar, etc)
    const categoriaFiltro = document.getElementById('filtroCategoria').value;
    const redeFiltro = document.getElementById('filtroRede').value;

    let otsMes = obterOTsVisiveisNaTabela();
    
    // Cabeçalho
    doc.setFontSize(18);
    doc.text('Relatório de Ordens de Trabalho', 14, 20);
    doc.setFontSize(11);
    doc.text(`Período: ${new Date(mesAtual + '-01').toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}`, 14, 28);
    
    if (categoriaFiltro || redeFiltro) {
        let filtros = 'Filtros: ';
        if (categoriaFiltro) filtros += `Categoria: ${categoriaFiltro} `;
        if (redeFiltro) filtros += `Rede: ${redeFiltro}`;
        doc.text(filtros, 14, 34);
    }
    
    // Tabela (com Equipamentos)
    const tableData = otsMes.map(ot => {
        const equipamentos = (ot.equipamentos && ot.equipamentos.length > 0)
            ? ot.equipamentos.map(eq => (typeof eq === 'string') ? eq : (eq.mac || '')).filter(Boolean).join(', ')
            : (ot.macEquipamento || '-');

        return [
            new Date(ot.data).toLocaleDateString('pt-BR'),
            ot.numeroOT,
            ot.tipoServico,
            ot.categoria || '-',
            formatarTipoTrabalho(ot.tipoTrabalho).replace(/[🔧⚙️📦]/g, ''),
            equipamentos || '-',
            ot.observacoes || '-',
            `€ ${ot.valorServico.toFixed(2)}`
        ];
    });
    
    if (temAutoTable) {
        doc.autoTable({
            startY: categoriaFiltro || redeFiltro ? 40 : 35,
            head: [['Data', 'OT', 'Serviço', 'Categoria', 'Tipo', 'Equipamentos', 'Observações', 'Valor']],
            body: tableData,
            theme: 'striped',
            headStyles: { fillColor: [102, 126, 234] },
            styles: { fontSize: 8 },
            columnStyles: {
                0: { cellWidth: 18 },
                1: { cellWidth: 20 },
                2: { cellWidth: 35 },
                3: { cellWidth: 30 },
                4: { cellWidth: 20 },
                5: { cellWidth: 55 },
                6: { cellWidth: 45 },
                7: { cellWidth: 22, fontStyle: 'bold' }
            }
        });
    } else {
        // Fallback (mobile): sem tabela, mas pelo menos mostra totais e festivo
        doc.setFontSize(10);
        doc.text('Tabela não suportada neste dispositivo (autoTable indisponível).', 14, categoriaFiltro || redeFiltro ? 44 : 38);
    }
    
    // Resumo
    const totalValor = otsMes.reduce((sum, ot) => sum + ot.valorServico, 0);
    // Prémios festivos: somar 1x por dia e listar datas
    // Fonte principal: OTs do mês. Fallback: mapa premiosFestivosPorDia (para não "sumir" valor em casos antigos/importados)
    const premiosPorDia = {};
    otsMes.forEach(ot => {
        const dataISO = getDataISO(ot.data);
        const val = parseFloat(ot.premioFestivoAplicado) || 0;
        if (val > 0 && !premiosPorDia[dataISO]) {
            premiosPorDia[dataISO] = val;
        }
    });
    // Fallback: se o mês atual tiver dias registrados no mapa, incluir também
    if (premiosFestivosPorDia) {
        Object.keys(premiosFestivosPorDia).forEach(d => {
            if (!d || typeof d !== 'string') return;
            if (d.substring(0, 7) !== mesAtual) return;
            const val = getPremioRegistradoNoDia(d);
            if (val > 0 && !premiosPorDia[d]) {
                premiosPorDia[d] = val;
            }
        });
    }
    const diasPremio = Object.keys(premiosPorDia).sort();
    const totalPremiosFestivos = diasPremio.reduce((sum, d) => sum + (parseFloat(premiosPorDia[d]) || 0), 0);

    // Se houver festivos selecionados mas com valor 0, ainda assim listar os dias no PDF
    // (mantém o comportamento que o usuário espera: mostrar quais dias foram marcados).
    const diasFestivoMarcado = Array.from(new Set(
        otsMes
            .filter(ot => ot && ot.otFestivo)
            .map(ot => getDataISO(ot.data))
    )).sort();
    const totalPontos = otsMes.reduce((sum, ot) => {
        const pServ = parseFloat(ot.pontosServico) || 0;
        const pAdd = parseFloat(ot.pontosAdicional) || 0;
        return sum + pServ + pAdd;
    }, 0);
    
    let finalY = (temAutoTable && doc.lastAutoTable && doc.lastAutoTable.finalY)
        ? (doc.lastAutoTable.finalY + 10)
        : (categoriaFiltro || redeFiltro ? 60 : 55);
    doc.setFontSize(11);
    doc.text(`Total de OTs: ${otsMes.length}`, 14, finalY);
    doc.text(`Total de Pontos: ${totalPontos.toFixed(1)}`, 14, finalY + 7);
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    if (totalPremiosFestivos > 0 || diasFestivoMarcado.length > 0) {
        doc.setFontSize(11);
        doc.setFont(undefined, 'normal');
        doc.text(`Prémios Festivos (extras): € ${totalPremiosFestivos.toFixed(2)}`, 14, finalY + 14);

        // Tabela separada: Data do Festivo + Valor (1x por dia)
        // Se um dia foi marcado como festivo mas o valor do prémio é 0, listamos mesmo assim.
        const diasParaListar = Array.from(new Set([...(diasPremio || []), ...(diasFestivoMarcado || [])])).sort();
        const tableFestivos = diasParaListar.map(d => ([
            formatarDataBRFromISODate(d),
            `€ ${(parseFloat(premiosPorDia[d]) || 0).toFixed(2)}`
        ]));

        if (temAutoTable) {
            doc.autoTable({
                startY: finalY + 18,
                head: [['Data (Festivo)', 'Prémio do Dia']],
                body: tableFestivos,
                theme: 'striped',
                headStyles: { fillColor: [102, 126, 234] },
                styles: { fontSize: 9 },
                columnStyles: {
                    0: { cellWidth: 35 },
                    1: { cellWidth: 30, fontStyle: 'bold' }
                }
            });
            finalY = doc.lastAutoTable.finalY + 6;
        } else {
            // Fallback sem tabela: listar datas/valores como texto
            let y = finalY + 20;
            doc.setFontSize(10);
            doc.text('Datas Festivas:', 14, y);
            y += 6;
            diasParaListar.forEach(d => {
                const v = (parseFloat(premiosPorDia[d]) || 0).toFixed(2);
                doc.text(`${formatarDataBRFromISODate(d)} - € ${v}`, 14, y);
                y += 5;
            });
            finalY = y;
        }
    } else {
        finalY = finalY + 14;
    }

    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    const valorReceber = totalValor + totalPremiosFestivos;
    doc.text(`VALOR A RECEBER: € ${valorReceber.toFixed(2)}`, 14, finalY + 12);
    
    doc.save(`relatorio-ot-${mesAtual}.pdf`);
}

// Gerar PDF com Equipamentos
function gerarPDFComEquipamentos() {
    alert('PDF com equipamentos foi removido. Use o botão "📄 Gerar PDF".');
    return;
    
    // Aplicar filtros adicionais
    if (categoriaFiltro) {
        otsMes = otsMes.filter(ot => ot.categoria === categoriaFiltro);
    }
    if (redeFiltro) {
        otsMes = otsMes.filter(ot => ot.rede === redeFiltro);
    }
    
    // Cabeçalho
    doc.setFontSize(18);
    doc.text('Relatório de OTs com Equipamentos', 14, 20);
    doc.setFontSize(11);
    doc.text(`Período: ${new Date(mesAtual + '-01').toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}`, 14, 28);
    
    if (categoriaFiltro || redeFiltro) {
        let filtros = 'Filtros: ';
        if (categoriaFiltro) filtros += `Categoria: ${categoriaFiltro} `;
        if (redeFiltro) filtros += `Rede: ${redeFiltro}`;
        doc.text(filtros, 14, 34);
    }
    
    // Tabela com equipamentos
    const tableData = otsMes.map(ot => {
        const equipamentos = ot.equipamentos && ot.equipamentos.length > 0
            ? ot.equipamentos.map(eq => typeof eq === 'string' ? eq : `${eq.tipo}: ${eq.mac}`).join(', ')
            : (ot.macEquipamento || '-');
        
        return [
            new Date(ot.data).toLocaleDateString('pt-BR'),
            ot.numeroOT,
            ot.tipoServico,
            ot.rede || '-',
            equipamentos,
            ot.observacoes || '-',
            `€ ${ot.valorServico.toFixed(2)}`
        ];
    });
    
    doc.autoTable({
        startY: categoriaFiltro || redeFiltro ? 40 : 35,
        head: [['Data', 'OT', 'Serviço', 'Rede', 'Equipamentos', 'Observações', 'Valor']],
        body: tableData,
        theme: 'striped',
        headStyles: { fillColor: [39, 174, 96] },
        styles: { fontSize: 8 },
        columnStyles: {
            0: { cellWidth: 22 },
            1: { cellWidth: 20 },
            2: { cellWidth: 45 },
            3: { cellWidth: 20 },
            4: { cellWidth: 55 },
            5: { cellWidth: 50 },
            6: { cellWidth: 25, fontStyle: 'bold' }
        }
    });
    
    // Resumo
    const totalValor = otsMes.reduce((sum, ot) => sum + ot.valorServico, 0);
    // Prémios festivos: somar 1x por dia e listar datas
    // Fonte principal: OTs do mês. Fallback: mapa premiosFestivosPorDia (para não "sumir" valor em casos antigos/importados)
    const premiosPorDia = {};
    otsMes.forEach(ot => {
        const dataISO = getDataISO(ot.data);
        const val = parseFloat(ot.premioFestivoAplicado) || 0;
        if (val > 0 && !premiosPorDia[dataISO]) {
            premiosPorDia[dataISO] = val;
        }
    });
    // Fallback: se o mês atual tiver dias registrados no mapa, incluir também
    if (premiosFestivosPorDia) {
        Object.keys(premiosFestivosPorDia).forEach(d => {
            if (!d || typeof d !== 'string') return;
            if (d.substring(0, 7) !== mesAtual) return;
            const val = getPremioRegistradoNoDia(d);
            if (val > 0 && !premiosPorDia[d]) {
                premiosPorDia[d] = val;
            }
        });
    }
    const diasPremio = Object.keys(premiosPorDia).sort();
    const totalPremiosFestivos = diasPremio.reduce((sum, d) => sum + (parseFloat(premiosPorDia[d]) || 0), 0);
    const totalPontos = otsMes.reduce((sum, ot) => {
        const pServ = parseFloat(ot.pontosServico) || 0;
        const pAdd = parseFloat(ot.pontosAdicional) || 0;
        return sum + pServ + pAdd;
    }, 0);
    
    let finalY = doc.lastAutoTable.finalY + 10;
    doc.setFontSize(11);
    doc.text(`Total de OTs: ${otsMes.length}`, 14, finalY);
    doc.text(`Total de Pontos: ${totalPontos.toFixed(1)}`, 14, finalY + 7);
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    if (totalPremiosFestivos > 0) {
        doc.setFontSize(11);
        doc.setFont(undefined, 'normal');
        doc.text(`Prémios Festivos (extras): € ${totalPremiosFestivos.toFixed(2)}`, 14, finalY + 14);

        // Tabela separada: Data do Festivo + Valor (1x por dia)
        const tableFestivos = diasPremio.map(d => ([
            formatarDataBRFromISODate(d),
            `€ ${(parseFloat(premiosPorDia[d]) || 0).toFixed(2)}`
        ]));

        doc.autoTable({
            startY: finalY + 18,
            head: [['Data (Festivo)', 'Prémio do Dia']],
            body: tableFestivos,
            theme: 'striped',
            headStyles: { fillColor: [39, 174, 96] },
            styles: { fontSize: 9 },
            columnStyles: {
                0: { cellWidth: 35 },
                1: { cellWidth: 30, fontStyle: 'bold' }
            }
        });
        finalY = doc.lastAutoTable.finalY + 6;
    } else {
        finalY = finalY + 14;
    }

    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    const valorReceber = totalValor + totalPremiosFestivos;
    doc.text(`VALOR A RECEBER: € ${valorReceber.toFixed(2)}`, 14, finalY + 12);
    
    // doc.save(`relatorio-ot-equipamentos-${mesAtual}.pdf`);
}

// ==================== BACKUP LOCAL (JSON) ====================
function exportarBackup() {
    try {
        // Carregar configurações de tabelas de serviços com tratamento de erro
        let parsedTabelas = null;
        let parsedMultiplicadores = null;
        
        try {
            const tabelasCustomizadas = localStorage.getItem('tabelasCustomizadas');
            if (tabelasCustomizadas) {
                parsedTabelas = JSON.parse(tabelasCustomizadas);
            }
        } catch (e) {
            console.warn('Erro ao parsear tabelasCustomizadas:', e);
        }
        
        try {
            const multiplicadores = localStorage.getItem('multiplicadores');
            if (multiplicadores) {
                parsedMultiplicadores = JSON.parse(multiplicadores);
            }
        } catch (e) {
            console.warn('Erro ao parsear multiplicadores:', e);
        }
        
        const payload = {
            geradoEm: new Date().toISOString(),
            versao: 2, // Incrementar versão para incluir novos campos
            ordensTrabalho: ordensTrabalho,
            registrosLogistica: registrosLogistica,
            historicoOTPorMes: historicoOTPorMes,
            premiosFestivosPorDia: premiosFestivosPorDia,
            // Novos campos: configurações de tabelas de serviços
            tabelasCustomizadas: parsedTabelas,
            multiplicadores: parsedMultiplicadores,
        };
        const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `backup-app-tecnico-${new Date().toISOString().substring(0,10)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        alert('Backup JSON exportado com sucesso! Guarde o arquivo em local seguro.');
    } catch (e) {
        console.error('Erro ao gerar backup:', e);
        alert('Falha ao gerar backup: ' + (e && e.message ? e.message : e));
    }
}

function importarBackup() {
    try {
        let input = document.getElementById('inputImportBackup');
        if (!input) {
            // fallback: cria dinamicamente se não existir
            input = document.createElement('input');
            input.type = 'file';
            input.accept = 'application/json';
            input.style.display = 'none';
            input.id = 'inputImportBackup';
            document.body.appendChild(input);
        }

        input.onchange = async (evt) => {
            const file = evt.target.files && evt.target.files[0];
            if (!file) return;

            try {
                const text = await file.text();
                const payload = JSON.parse(text);

                // Validação básica
                if (!payload || (typeof payload !== 'object')) {
                    alert('Arquivo inválido.');
                    return;
                }

                const novasOTs = Array.isArray(payload.ordensTrabalho) ? payload.ordensTrabalho : [];
                const novaLogistica = Array.isArray(payload.registrosLogistica) ? payload.registrosLogistica : [];
                const novoHistorico = (payload.historicoOTPorMes && typeof payload.historicoOTPorMes === 'object' && !Array.isArray(payload.historicoOTPorMes)) ? payload.historicoOTPorMes : null;
                const novosPremios = (payload.premiosFestivosPorDia && typeof payload.premiosFestivosPorDia === 'object' && !Array.isArray(payload.premiosFestivosPorDia)) ? payload.premiosFestivosPorDia : null;
                
                // Novos campos: configurações de tabelas de serviços (retrocompatibilidade)
                const novasTabelas = (payload.tabelasCustomizadas && typeof payload.tabelasCustomizadas === 'object' && !Array.isArray(payload.tabelasCustomizadas)) ? payload.tabelasCustomizadas : null;
                const novosMultiplicadores = (payload.multiplicadores && typeof payload.multiplicadores === 'object' && !Array.isArray(payload.multiplicadores)) ? payload.multiplicadores : null;

                // Validação: backup deve conter pelo menos algum dado (OTs, logística, ou configurações)
                if (novasOTs.length === 0 && novaLogistica.length === 0 && !novasTabelas && !novosMultiplicadores) {
                    alert('Backup não contém registros para importar.');
                    return;
                }

                const substituir = confirm('Deseja SUBSTITUIR todos os dados atuais pelos do backup?\nClique em OK para substituir.\nClique em Cancelar para mesclar (sem duplicar por id).');

                if (substituir) {
                    // Substituir: sobrescrever tudo
                    ordensTrabalho = novasOTs;
                    registrosLogistica = novaLogistica;
                    if (novoHistorico) historicoOTPorMes = novoHistorico;
                    if (novosPremios) premiosFestivosPorDia = novosPremios;
                    
                    // Substituir configurações de serviços (se presentes no backup)
                    if (novasTabelas) {
                        localStorage.setItem('tabelasCustomizadas', JSON.stringify(novasTabelas));
                    }
                    if (novosMultiplicadores) {
                        localStorage.setItem('multiplicadores', JSON.stringify(novosMultiplicadores));
                    }
                } else {
                    // Mesclar por id evitando duplicatas
                    const mapOT = new Map();
                    ordensTrabalho.forEach(o => mapOT.set(o.id, o));
                    novasOTs.forEach(o => {
                        if (!mapOT.has(o.id)) mapOT.set(o.id, o);
                    });
                    ordensTrabalho = Array.from(mapOT.values());

                    const mapLog = new Map();
                    registrosLogistica.forEach(r => mapLog.set(r.id, r));
                    novaLogistica.forEach(r => {
                        if (!mapLog.has(r.id)) mapLog.set(r.id, r);
                    });
                    registrosLogistica = Array.from(mapLog.values());

                    // Histórico/premios: por segurança, mescla por mês/chave.
                    if (novoHistorico) {
                        historicoOTPorMes = historicoOTPorMes || {};
                        Object.keys(novoHistorico).forEach(mes => {
                            const cur = Array.isArray(historicoOTPorMes[mes]) ? historicoOTPorMes[mes] : [];
                            const add = Array.isArray(novoHistorico[mes]) ? novoHistorico[mes] : [];
                            const map = new Map();
                            cur.forEach(o => o && map.set(o.id, o));
                            add.forEach(o => o && !map.has(o.id) && map.set(o.id, o));
                            historicoOTPorMes[mes] = Array.from(map.values());
                        });
                    }
                    if (novosPremios) {
                        premiosFestivosPorDia = premiosFestivosPorDia || {};
                        Object.keys(novosPremios).forEach(d => {
                            if (!premiosFestivosPorDia[d]) premiosFestivosPorDia[d] = novosPremios[d];
                        });
                    }
                    
                    // Mesclar: manter configs existentes, não sobrescrever
                    // (Configurações de serviço são diferentes - não têm IDs para mesclar individualmente)
                    // No modo mesclar, preservamos as configs atuais do usuário
                }

                // Persistir OTs e logística
                localStorage.setItem('ordensTrabalho', JSON.stringify(ordensTrabalho));
                localStorage.setItem('registrosLogistica', JSON.stringify(registrosLogistica));
                localStorage.setItem('historicoOTPorMes', JSON.stringify(historicoOTPorMes || {}));
                localStorage.setItem('premiosFestivosPorDia', JSON.stringify(premiosFestivosPorDia || {}));

                notificarMudancaParaSync('importarBackup');

                // Atualizar UI
                atualizarTabela();
                atualizarResumos();
                atualizarTabelaLogistica();
                atualizarUIFestivoPorDia();
                
                // Recarregar serviços nos dropdowns apenas se configurações de serviço foram importadas E substituídas
                // (em modo mesclar, configs são preservadas; em modo substituir, configs são atualizadas se presentes)
                // Nota: recarregarServicos() recarrega todas as configs de localStorage, então uma única chamada é suficiente
                if (substituir && (novasTabelas || novosMultiplicadores)) {
                    try {
                        if (typeof recarregarServicos === 'function') {
                            recarregarServicos();
                        }
                    } catch (e) {
                        console.warn('Não foi possível recarregar serviços:', e);
                    }
                }

                alert('Backup importado com sucesso!');
            } catch (e) {
                console.error('Erro ao importar backup:', e);
                alert('Falha ao importar backup: ' + (e && e.message ? e.message : e));
            } finally {
                // Reset para permitir importar o mesmo arquivo novamente se necessário
                evt.target.value = '';
            }
        };

        input.click();
    } catch (e) {
        console.error('Erro na preparação da importação:', e);
        alert('Não foi possível iniciar a importação: ' + (e && e.message ? e.message : e));
    }
}

// ==================== LOGÍSTICA DIÁRIA ====================

let registrosLogistica = JSON.parse(localStorage.getItem('registrosLogistica')) || [];
let registroDiaAtual = JSON.parse(localStorage.getItem('registroDiaAtual')) || null;

// Inicializar campos de logística ao carregar
document.addEventListener('DOMContentLoaded', function() {
    inicializarLogisticaDiaria();
    // Definir mês atual no filtro de logística (por padrão)
    const mesInput = document.getElementById('filtroMesLogistica');
    if (mesInput) {
        const agora = new Date();
        const mesAtual = `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, '0')}`;
        // Predefinir valor apenas se vazio
        if (!mesInput.value) {
            mesInput.value = mesAtual;
        }
        // Limitar seleção futura: permitir retroativa, bloquear meses futuros
        mesInput.max = mesAtual;
        // Atualizar tabela conforme mês atual se ainda não filtrado
        atualizarTabelaLogistica(mesInput.value);
    }
});

function inicializarLogisticaDiaria() {
    const hoje = getHojeISO();
    const agora = new Date();
    const horaAtual = `${String(agora.getHours()).padStart(2, '0')}:${String(agora.getMinutes()).padStart(2, '0')}`;
    
    // Definir data atual
    const campoData = document.getElementById('dataLogistica');
    if (campoData) {
        campoData.value = hoje;
    }
    
    // Verificar se existe registro do dia atual em andamento
    if (registroDiaAtual && registroDiaAtual.data === hoje) {
        // Restaurar dados do registro em andamento
        document.getElementById('horaInicioJornada').value = registroDiaAtual.horaInicio;
        document.getElementById('kmInicial').value = registroDiaAtual.kmInicial;
        
        // NÃO preencher hora fim automaticamente - usuário clica no botão quando quiser
        
        // Se tiver abastecimento salvo, restaurar
        if (registroDiaAtual.valorAbastecimento) {
            document.getElementById('valorAbastecimento').value = registroDiaAtual.valorAbastecimento;
        }
        if (registroDiaAtual.litrosAbastecidos) {
            document.getElementById('litrosAbastecidos').value = registroDiaAtual.litrosAbastecidos;
        }
        if (registroDiaAtual.observacoes) {
            document.getElementById('observacoesLogistica').value = registroDiaAtual.observacoes;
        }
    } else {
        // Novo dia - definir hora início como hora atual
        document.getElementById('horaInicioJornada').value = horaAtual;
        // NÃO preencher hora fim automaticamente
    }
}

// Função para atualizar hora fim manualmente com botão
function atualizarHoraFim() {
    const agora = new Date();
    const horaAtual = `${String(agora.getHours()).padStart(2, '0')}:${String(agora.getMinutes()).padStart(2, '0')}`;
    document.getElementById('horaFimJornada').value = horaAtual;
    
    // Salvar no registro do dia
    salvarRegistroDiaAtual();
}

// Atualizar campo MAC quando scanner detectar código
function atualizarMACScanner(codigo) {
    document.getElementById('macEquipamento').value = codigo;
}

// Salvar dados automaticamente quando houver mudança nos campos importantes
document.getElementById('horaInicioJornada')?.addEventListener('change', salvarRegistroDiaAtual);
document.getElementById('kmInicial')?.addEventListener('change', salvarRegistroDiaAtual);
document.getElementById('valorAbastecimento')?.addEventListener('change', salvarRegistroDiaAtual);
document.getElementById('litrosAbastecidos')?.addEventListener('change', salvarRegistroDiaAtual);
document.getElementById('observacoesLogistica')?.addEventListener('input', salvarRegistroDiaAtual);

function salvarRegistroDiaAtual() {
    const hoje = getHojeISO();
    const dataForm = document.getElementById('dataLogistica').value;
    
    // Só salva automaticamente se for o dia atual
    if (dataForm === hoje) {
        registroDiaAtual = {
            data: dataForm,
            horaInicio: document.getElementById('horaInicioJornada').value,
            kmInicial: parseFloat(document.getElementById('kmInicial').value) || 0,
            valorAbastecimento: parseFloat(document.getElementById('valorAbastecimento').value) || 0,
            litrosAbastecidos: parseFloat(document.getElementById('litrosAbastecidos').value) || 0,
            observacoes: document.getElementById('observacoesLogistica').value || ''
        };
        
        localStorage.setItem('registroDiaAtual', JSON.stringify(registroDiaAtual));
    }
}

// Atualizar hora fim automaticamente quando abrir a aba
function mostrarAba(aba) {
    // Esconder todas as abas
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Remover classe active de todos os botões
    document.querySelectorAll('.tab-button').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Mostrar aba selecionada
    if (aba === 'ordens') {
        document.getElementById('aba-ordens').classList.add('active');
        document.querySelector('.tab-button:nth-child(1)').classList.add('active');
    } else if (aba === 'logistica') {
        document.getElementById('aba-logistica').classList.add('active');
        document.querySelector('.tab-button:nth-child(2)').classList.add('active');
        atualizarTabelaLogistica();
        
        // NÃO atualizar hora fim automaticamente - usuário clica no botão quando quiser
    }
}

// Atualizar data e hora quando mudar manualmente a data
document.getElementById('dataLogistica')?.addEventListener('change', function() {
    const dataSelecionada = this.value;
    const hoje = getHojeISO();
    
    if (dataSelecionada !== hoje) {
        // Data retroativa - limpar campos
        document.getElementById('horaInicioJornada').value = '';
        document.getElementById('horaFimJornada').value = '';
        document.getElementById('kmInicial').value = '';
        document.getElementById('kmFinal').value = '';
        document.getElementById('valorAbastecimento').value = '';
        document.getElementById('litrosAbastecidos').value = '';
        document.getElementById('observacoesLogistica').value = '';
    } else {
        // Voltou para hoje - restaurar registro do dia
        inicializarLogisticaDiaria();
    }
});

// Calcular KM rodados
document.getElementById('kmFinal')?.addEventListener('input', calcularKMRodados);
document.getElementById('kmInicial')?.addEventListener('input', calcularKMRodados);

function calcularKMRodados() {
    function parseKmValue(val) {
        if (!val) return 0;
        // Troca vírgula por ponto, remove espaços e ignora separadores de milhar
        val = val.replace(/\./g, '').replace(/,/g, '.').replace(/\s/g, '');
        return parseFloat(val) || 0;
    }
    const kmInicial = parseKmValue(document.getElementById('kmInicial').value);
    const kmFinal = parseKmValue(document.getElementById('kmFinal').value);
    if (kmFinal > kmInicial) {
        const kmRodados = kmFinal - kmInicial;
        // Formata com ponto como separador de milhar
        function formatMilhar(n) {
            return n.toFixed(1).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
        }
        document.getElementById('kmRodadosDia').value = `${formatMilhar(kmRodados)} km`;
        calcularConsumo();
    } else {
        document.getElementById('kmRodadosDia').value = '';
    }
}

// Calcular consumo médio e litros gastos
document.getElementById('litrosAbastecidos')?.addEventListener('input', calcularConsumo);

function calcularConsumo() {
    const CONSUMO_MEDIO_PADRAO = obterConsumoConfigurado(); // Usa configuração do usuário
    
    function parseKmValue(val) {
        if (!val) return 0;
        // Troca vírgula por ponto e remove espaços
        return parseFloat(val.replace(',', '.').replace(/\s/g, '')) || 0;
    }
    const kmInicial = parseKmValue(document.getElementById('kmInicial').value);
    const kmFinal = parseKmValue(document.getElementById('kmFinal').value);
    const litrosAbastecidos = parseFloat(document.getElementById('litrosAbastecidos').value) || 0;
    
    if (kmFinal > kmInicial) {
        const kmRodados = kmFinal - kmInicial;
        
        // Calcular litros gastos totais com base no consumo médio padrão
        const litrosGastos = (kmRodados * CONSUMO_MEDIO_PADRAO) / 100;
        
        // Se houve abastecimento, calcular consumo real
        if (litrosAbastecidos > 0) {
            const consumoRealPor100km = (litrosAbastecidos / kmRodados) * 100;
            document.getElementById('consumoMedio').value = `${litrosGastos.toFixed(2)}L consumidos (${consumoRealPor100km.toFixed(2)} L/100km)`;
        } else {
            // Mostrar apenas litros gastos estimados
            document.getElementById('consumoMedio').value = `${litrosGastos.toFixed(2)}L consumidos`;
        }
    } else {
        document.getElementById('consumoMedio').value = '';
    }
}

// Formulário de Logística
document.getElementById('formLogistica')?.addEventListener('submit', function(e) {
    e.preventDefault();
    
    const CONSUMO_MEDIO_PADRAO = obterConsumoConfigurado(); // Usa configuração do usuário
    
    const kmInicial = parseFloat(document.getElementById('kmInicial').value) || 0;
    const kmFinal = parseFloat(document.getElementById('kmFinal').value) || 0;
    
    // Validação apenas se ambos KM forem preenchidos
    if (kmInicial > 0 && kmFinal > 0 && kmFinal <= kmInicial) {
        alert('KM Final deve ser maior que KM Inicial!');
        return;
    }
    
    const kmRodados = (kmFinal > kmInicial) ? (kmFinal - kmInicial) : 0;
    const litrosAbastecidos = parseFloat(document.getElementById('litrosAbastecidos').value) || 0;
    const litrosGastos = kmRodados > 0 ? (kmRodados * CONSUMO_MEDIO_PADRAO) / 100 : 0;
    const consumoReal = (litrosAbastecidos > 0 && kmRodados > 0) ? (litrosAbastecidos / kmRodados) * 100 : CONSUMO_MEDIO_PADRAO;
    
    const registro = {
        id: Date.now(),
        data: document.getElementById('dataLogistica').value || getHojeISO(),
        horaInicio: document.getElementById('horaInicioJornada').value || '-',
        horaFim: document.getElementById('horaFimJornada').value || '-',
        kmInicial: kmInicial,
        kmFinal: kmFinal,
        kmRodados: kmRodados,
        valorAbastecimento: parseFloat(document.getElementById('valorAbastecimento').value) || 0,
        litrosAbastecidos: litrosAbastecidos,
        litrosGastos: litrosGastos,
        consumoMedio: consumoReal,
        observacoes: document.getElementById('observacoesLogistica').value || ''
    };
    
    console.log('Salvando registro de logística:', registro);
    
    registrosLogistica.push(registro);
    localStorage.setItem('registrosLogistica', JSON.stringify(registrosLogistica));
    notificarMudancaParaSync('registrosLogistica');
    
    console.log('Total de registros:', registrosLogistica.length);
    
    // Limpar registro do dia atual após salvar
    registroDiaAtual = null;
    localStorage.removeItem('registroDiaAtual');
    
    atualizarTabelaLogistica();
    limparFormularioLogistica();
    
    alert('Registro de logística salvo com sucesso!');
});

function limparFormularioLogistica() {
    document.getElementById('formLogistica').reset();
    document.getElementById('kmRodadosDia').value = '';
    document.getElementById('consumoMedio').value = '';
    
    // Reinicializar com data e hora atuais
    inicializarLogisticaDiaria();
}

function atualizarTabelaLogistica(filtrarMes = null) {
    const tbody = document.getElementById('corpoTabelaLogistica');
    if (!tbody) {
        console.error('Tabela de logística não encontrada!');
        return;
    }
    
    console.log('Atualizando tabela. Total de registros:', registrosLogistica.length);
    
    tbody.innerHTML = '';
    
    let registrosFiltrados = registrosLogistica;
    
    if (filtrarMes) {
        registrosFiltrados = registrosLogistica.filter(reg => {
            return reg.data.substring(0, 7) === filtrarMes;
        });
    }
    
    console.log('Registros filtrados:', registrosFiltrados.length);
    
    if (registrosFiltrados.length === 0) {
        tbody.innerHTML = '<tr class="empty-state"><td colspan="9">Nenhum registro de logística encontrado</td></tr>';
        return;
    }
    
    registrosFiltrados.reverse().forEach(reg => {
        const tr = document.createElement('tr');
        const dataFormatada = new Date(reg.data + 'T00:00:00').toLocaleDateString('pt-BR');
        const litrosGastos = reg.litrosGastos || ((reg.kmRodados * obterConsumoConfigurado()) / 100);
        
        tr.innerHTML = `
            <td>${dataFormatada}</td>
            <td>${reg.horaInicio} - ${reg.horaFim}</td>
            <td>${reg.kmInicial.toFixed(1)}</td>
            <td>${reg.kmFinal.toFixed(1)}</td>
            <td><strong>${reg.kmRodados.toFixed(1)} km</strong></td>
            <td><strong style='color:#27ae60;'>${reg.valorAbastecimento > 0 ? '€ ' + reg.valorAbastecimento.toFixed(2) + ' <span style="font-weight:bold">(Total abastecido)</span>' : '-'}</strong></td>
            <td>${reg.litrosAbastecidos > 0 ? reg.litrosAbastecidos.toFixed(2) + 'L' : '-'}</td>
            <td>${litrosGastos.toFixed(2)}L consumidos</td>
            <td><button class="btn-delete" onclick="deletarLogistica(${reg.id})">🗑️</button></td>
        `;
        
        tbody.appendChild(tr);
    });
}

function deletarLogistica(id) {
    if (confirm('Deseja realmente excluir este registro de logística?')) {
        registrosLogistica = registrosLogistica.filter(reg => reg.id !== id);
        localStorage.setItem('registrosLogistica', JSON.stringify(registrosLogistica));
        notificarMudancaParaSync('deletarLogistica');
        atualizarTabelaLogistica();
    }
}

function filtrarLogisticaPorMes() {
    const mes = document.getElementById('filtroMesLogistica').value;
    if (mes) {
        atualizarTabelaLogistica(mes);
    } else {
        atualizarTabelaLogistica();
    }
}

function gerarPDFLogistica() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    const mesAtual = document.getElementById('filtroMesLogistica').value || 
                     `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
    
    const registrosMes = registrosLogistica.filter(reg => {
        return reg.data.substring(0, 7) === mesAtual;
    });
    
    // Cabeçalho
    doc.setFontSize(18);
    doc.text('Relatório de Logística Diária', 14, 20);
    doc.setFontSize(11);
    doc.text(`Período: ${new Date(mesAtual + '-01').toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}`, 14, 28);
    
    // Tabela
    const tableData = registrosMes.map(reg => {
        const litrosGastos = reg.litrosGastos || ((reg.kmRodados * obterConsumoConfigurado()) / 100);
        return [
            new Date(reg.data + 'T00:00:00').toLocaleDateString('pt-BR'),
            `${reg.horaInicio}-${reg.horaFim}`,
            reg.kmInicial.toFixed(1),
            reg.kmFinal.toFixed(1),
            reg.kmRodados.toFixed(1) + ' km',
            reg.valorAbastecimento > 0 ? '€ ' + reg.valorAbastecimento.toFixed(2) : '-',
            reg.litrosAbastecidos > 0 ? reg.litrosAbastecidos.toFixed(2) + 'L' : '-',
            litrosGastos.toFixed(2) + 'L'
        ];
    });
    
    doc.autoTable({
        startY: 35,
        head: [['Data', 'Horário', 'KM Ini', 'KM Fim', 'KM Rodados', 'Abastec.', 'L.Abast.', 'L.Consumidos']],
        body: tableData,
        theme: 'striped',
        headStyles: { fillColor: [102, 126, 234] }
    });
    
    // Resumo
    const totalKM = registrosMes.reduce((sum, reg) => sum + reg.kmRodados, 0);
    const totalAbastecimento = registrosMes.reduce((sum, reg) => sum + reg.valorAbastecimento, 0);
    const totalLitrosAbastecidos = registrosMes.reduce((sum, reg) => sum + reg.litrosAbastecidos, 0);
    const totalLitrosGastos = registrosMes.reduce((sum, reg) => {
        const litrosGastos = reg.litrosGastos || ((reg.kmRodados * obterConsumoConfigurado()) / 100);
        return sum + litrosGastos;
    }, 0);
    const consumoMedio = totalLitrosGastos > 0 ? (totalLitrosGastos / totalKM) * 100 : obterConsumoConfigurado();
    
    const finalY = doc.lastAutoTable.finalY + 10;
    doc.setFontSize(12);
    doc.text(`Total de Registros: ${registrosMes.length}`, 14, finalY);
    doc.text(`Total KM Rodados: ${totalKM.toFixed(1)} km`, 14, finalY + 7);
    doc.setFontSize(12);
    doc.setFont(undefined, 'normal');
    doc.text(`Total Litros Consumidos: ${totalLitrosGastos.toFixed(2)} L`, 14, finalY + 14);
    doc.setFontSize(12);
    doc.setFont(undefined, 'normal');
    doc.text(`Total Litros Abastecidos: ${totalLitrosAbastecidos.toFixed(2)} L`, 14, finalY + 21);
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.text(`Total Abastecimento: € ${totalAbastecimento.toFixed(2)}`, 14, finalY + 31);
    doc.setFontSize(11);
    doc.setFont(undefined, 'normal');
    doc.text(`(Motor 1.5 dCi: ${consumoMedio.toFixed(2)} L/100km médio)`, 14, finalY + 38);
    
    doc.save(`logistica-${mesAtual}.pdf`);
}

// Gerar PDF apenas do dia selecionado em Logística Diária
function gerarPDFLogisticaDia() {
    const { jsPDF } = window.jspdf;
    const dataSelecionada = document.getElementById('dataLogistica').value;
    
    if (!dataSelecionada) {
        alert('Selecione a data da logística.');
        return;
    }
    
    const registrosDia = registrosLogistica.filter(reg => reg.data === dataSelecionada);
    if (registrosDia.length === 0) {
        alert('Nenhum registro encontrado para a data selecionada.');
        return;
    }
    
    const doc = new jsPDF();
    const dataBR = new Date(dataSelecionada + 'T00:00:00').toLocaleDateString('pt-BR');
    
    // Cabeçalho
    doc.setFontSize(18);
    doc.text('Logística Diária - Relatório do Dia', 14, 20);
    doc.setFontSize(12);
    doc.text(`Data: ${dataBR}`, 14, 28);
    
    // Tabela (pode haver mais de um registro no mesmo dia)
    const tableData = registrosDia.map(reg => {
        const litrosGastos = reg.litrosGastos || ((reg.kmRodados * obterConsumoConfigurado()) / 100);
        return [
            `${reg.horaInicio}-${reg.horaFim}`,
            reg.kmInicial.toFixed(1),
            reg.kmFinal.toFixed(1),
            reg.kmRodados.toFixed(1) + ' km',
            reg.valorAbastecimento > 0 ? '€ ' + reg.valorAbastecimento.toFixed(2) : '-',
            reg.litrosAbastecidos > 0 ? reg.litrosAbastecidos.toFixed(2) + 'L' : '-',
            litrosGastos.toFixed(2) + 'L'
        ];
    });
    
    doc.autoTable({
        startY: 35,
        head: [['Horário', 'KM Ini', 'KM Fim', 'KM Rodados', 'Abastec.', 'L.Abast.', 'L.Consumidos']],
        body: tableData,
        theme: 'striped',
        headStyles: { fillColor: [102, 126, 234] }
    });
    
    // Resumo
    const totalKM = registrosDia.reduce((sum, reg) => sum + reg.kmRodados, 0);
    const totalAbastecimento = registrosDia.reduce((sum, reg) => sum + reg.valorAbastecimento, 0);
    const totalLitrosAbastecidos = registrosDia.reduce((sum, reg) => sum + reg.litrosAbastecidos, 0);
    const totalLitrosGastos = registrosDia.reduce((sum, reg) => {
        const litrosGastos = reg.litrosGastos || ((reg.kmRodados * obterConsumoConfigurado()) / 100);
        return sum + litrosGastos;
    }, 0);
    const consumoMedio = totalLitrosGastos > 0 ? (totalLitrosGastos / totalKM) * 100 : obterConsumoConfigurado();
    
    const finalY = doc.lastAutoTable.finalY + 10;
    doc.setFontSize(12);
    doc.text(`Registros no dia: ${registrosDia.length}`, 14, finalY);
    doc.text(`KM Rodados: ${totalKM.toFixed(1)} km`, 14, finalY + 7);
    doc.text(`Abastecimento: € ${totalAbastecimento.toFixed(2)}`, 14, finalY + 14);
    doc.text(`Litros Abastecidos: ${totalLitrosAbastecidos.toFixed(2)} L`, 14, finalY + 21);
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.text(`Litros Consumidos: ${totalLitrosGastos.toFixed(2)} L`, 14, finalY + 31);
    doc.setFontSize(11);
    doc.setFont(undefined, 'normal');
    doc.text(`(Motor 1.5 dCi: ${consumoMedio.toFixed(2)} L/100km médio)`, 14, finalY + 38);
    
    doc.save(`logistica-${dataSelecionada}.pdf`);
}

// ==================== SCANNER DE CÓDIGO DE BARRAS ====================

let codeReader = null;
let videoStream = null;
let scannerAtivo = false;
let camerasDisponiveis = [];
let cameraAtualIndex = 0;

function abrirScanner() {
    const modal = document.getElementById('scannerModal');
    const video = document.getElementById('video');
    const resultado = document.getElementById('resultado');
    
    modal.classList.add('active');
    resultado.textContent = 'Iniciando câmera...';
    resultado.style.color = '#333';
    scannerAtivo = true;
    
    // Inicializar o scanner ZXing
    if (!codeReader) {
        codeReader = new ZXing.BrowserMultiFormatReader();
    }
    
    // Listar câmeras disponíveis
    codeReader.listVideoInputDevices()
        .then(videoInputDevices => {
            camerasDisponiveis = videoInputDevices;
            console.log('Câmeras encontradas:', camerasDisponiveis.length);
            
            if (camerasDisponiveis.length === 0) {
                throw new Error('Nenhuma câmera encontrada');
            }
            
            // Selecionar câmera traseira preferencialmente na primeira vez
            if (cameraAtualIndex === 0 && camerasDisponiveis.length > 1) {
                const backCameraIndex = camerasDisponiveis.findIndex(device => 
                    /back|rear|environment/i.test(device.label)
                );
                if (backCameraIndex !== -1) {
                    cameraAtualIndex = backCameraIndex;
                }
            }
            
            iniciarScanner();
        })
        .catch(err => {
            console.error('Erro ao acessar câmera:', err);
            resultado.textContent = '❌ Erro ao acessar câmera. Verifique as permissões.';
            resultado.style.color = '#e74c3c';
            scannerAtivo = false;
        });
}

function iniciarScanner() {
    const resultado = document.getElementById('resultado');
    const selectedDeviceId = camerasDisponiveis[cameraAtualIndex].deviceId;
    
    resultado.textContent = 'Aponte para o código de barras...';
    resultado.style.color = '#667eea';
    
    // Configurar hints para melhor detecção
    const hints = new Map();
    hints.set(ZXing.DecodeHintType.TRY_HARDER, true);
    hints.set(ZXing.DecodeHintType.POSSIBLE_FORMATS, [
        ZXing.BarcodeFormat.EAN_13,
        ZXing.BarcodeFormat.EAN_8,
        ZXing.BarcodeFormat.CODE_128,
        ZXing.BarcodeFormat.CODE_39,
        ZXing.BarcodeFormat.UPC_A,
        ZXing.BarcodeFormat.UPC_E,
        ZXing.BarcodeFormat.QR_CODE
    ]);
    
    codeReader.hints = hints;
    
    // Iniciar decodificação contínua com a câmera selecionada
    codeReader.decodeFromVideoDevice(selectedDeviceId, 'video', (result, err) => {
        if (result && scannerAtivo) {
            // Código detectado!
            const codigoDetectado = result.text;
            console.log('Código detectado:', codigoDetectado);
            
            // Tocar som de beep
            tocarSomBeep();
            
            atualizarMACScanner(codigoDetectado);
            resultado.textContent = `✅ Código: ${codigoDetectado}`;
            resultado.style.color = '#27ae60';
            
            // Vibrar se disponível (feedback tátil)
            if (navigator.vibrate) {
                navigator.vibrate(200);
            }
            
            // Fechar após 1.5 segundos
            setTimeout(() => {
                fecharScanner();
            }, 1500);
        }
        
        if (err && !(err instanceof ZXing.NotFoundException)) {
            console.warn('Erro no scanner:', err);
        }
    });
}

function trocarCamera() {
    if (camerasDisponiveis.length <= 1) {
        alert('Apenas uma câmera disponível.');
        return;
    }
    
    // Parar scanner atual
    if (codeReader) {
        codeReader.reset();
    }
    
    // Trocar para próxima câmera
    cameraAtualIndex = (cameraAtualIndex + 1) % camerasDisponiveis.length;
    
    const resultado = document.getElementById('resultado');
    const cameraLabel = camerasDisponiveis[cameraAtualIndex].label || `Câmera ${cameraAtualIndex + 1}`;
    resultado.textContent = `Trocando para: ${cameraLabel}...`;
    resultado.style.color = '#667eea';
    
    // Reiniciar scanner com nova câmera
    setTimeout(() => {
        iniciarScanner();
    }, 300);
}

function fecharScanner() {
    const modal = document.getElementById('scannerModal');
    scannerAtivo = false;
    
    // Resetar para câmera traseira na próxima vez
    // Procurar índice da câmera traseira
    if (camerasDisponiveis.length > 1) {
        const backCameraIndex = camerasDisponiveis.findIndex(device => 
            /back|rear|environment/i.test(device.label)
        );
        cameraAtualIndex = backCameraIndex !== -1 ? backCameraIndex : 0;
    } else {
        cameraAtualIndex = 0;
    }
    
    // Parar scanner ZXing
    if (codeReader) {
        codeReader.reset();
    }
    
    modal.classList.remove('active');
}

// Função para fechar scanner ao clicar fora do conteúdo
function fecharScannerSeClicarFora(event) {
    if (event.target.id === 'scannerModal') {
        fecharScanner();
    }
}

// ==================== AJUDA (MODAL) ====================
function abrirAjuda() {
    const modal = document.getElementById('ajudaModal');
    if (modal) modal.classList.add('active');
}
function fecharAjuda() {
    const modal = document.getElementById('ajudaModal');
    if (modal) modal.classList.remove('active');
}

// ==================== INSTALAÇÃO PWA ====================
let deferredPrompt = null;
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    const btn = document.getElementById('btnInstallApp');
    if (btn) btn.style.display = 'inline-block';
});

function instalarApp() {
    if (!deferredPrompt) {
        alert('Instalação não suportada neste momento.');
        return;
        }
    deferredPrompt.prompt();
    deferredPrompt.userChoice.then((choice) => {
        if (choice.outcome === 'accepted') {
            console.log('Usuário aceitou instalar');
        } else {
            console.log('Usuário cancelou instalação');
        }
        deferredPrompt = null;
        const btn = document.getElementById('btnInstallApp');
        if (btn) btn.style.display = 'none';
    });
}

// Mostrar dica de instalação para iOS (Safari) quando não estiver standalone
document.addEventListener('DOMContentLoaded', function() {
    try {
        const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
        const isStandalone = window.navigator.standalone === true; // Safari iOS
        const dismissed = localStorage.getItem('iosA2HSBannerDismissed') === '1';
        if (isIOS && !isStandalone && !dismissed) {
            const banner = document.getElementById('iosA2HSBanner');
            if (banner) banner.style.display = 'block';
        }
    } catch {}
});

function fecharBannerIOS() {
    const banner = document.getElementById('iosA2HSBanner');
    if (banner) banner.style.display = 'none';
    localStorage.setItem('iosA2HSBannerDismissed', '1');
}

// ==================== SWIPE ENTRE ABAS ====================
let touchStartX = 0;
let touchEndX = 0;
let touchStartY = 0;
let touchEndY = 0;
const swipeThreshold = 80; // pixels mínimos para considerar swipe

document.addEventListener('DOMContentLoaded', function() {
    const container = document.querySelector('.container');
    if (!container) return;
    
    container.addEventListener('touchstart', function(e) {
        // Ignorar se estiver dentro de tabela (para permitir scroll horizontal)
        if (e.target.closest('.table-responsive')) return;
        // Ignorar se estiver em input/textarea/select
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;
        
        touchStartX = e.changedTouches[0].screenX;
        touchStartY = e.changedTouches[0].screenY;
    }, { passive: true });
    
    container.addEventListener('touchend', function(e) {
        // Ignorar se estiver dentro de tabela
        if (e.target.closest('.table-responsive')) return;
        // Ignorar se estiver em input/textarea/select
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;
        
        touchEndX = e.changedTouches[0].screenX;
        touchEndY = e.changedTouches[0].screenY;
        
        handleSwipe();
    }, { passive: true });
});

function handleSwipe() {
    const diffX = touchEndX - touchStartX;
    const diffY = touchEndY - touchStartY;
    
    // Verificar se é swipe horizontal (e não vertical)
    if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > swipeThreshold) {
        const abaAtual = document.querySelector('.tab-content.active').id;
        
        if (diffX > 0) {
            // Swipe para direita - voltar para aba anterior
            if (abaAtual === 'aba-logistica') {
                mostrarAba('ordens');
            }
        } else {
            // Swipe para esquerda - ir para próxima aba
            if (abaAtual === 'aba-ordens') {
                mostrarAba('logistica');
            }
        }
    }
}

// ==================== SOM DE BEEP ====================
function tocarSomBeep() {
    try {
        // Criar contexto de áudio
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        // Configurar som
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(800, audioContext.currentTime); // Frequência 800Hz
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        // Volume e duração
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
        
        // Tocar beep
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.2);
    } catch (error) {
        console.log('Não foi possível tocar o som:', error);
    }
}




