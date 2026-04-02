let ordensTrabalho = JSON.parse(localStorage.getItem('ordensTrabalho')) || [];
let equipamentosTemp = []; // Array temporário para equipamentos antes de salvar OT
let adicionaisTemp = []; // Array temporário para adicionais antes de salvar OT

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

// Salvar dados agora (manual ou auto-save)
window.salvarAgora = async function(silencioso = false) {
    try {
        if (window.__firebaseSync && typeof window.__firebaseSync.pushLocal === 'function') {
            const uid = window.__firebaseSync.getUserInfo?.()?.uid;
            if (!uid) {
                if (!silencioso) alert('Precisa de estar com sessão iniciada (Google) para guardar na nuvem.');
                return;
            }
            const btn = document.getElementById('btnSyncSalvar');
            if (btn) { btn.textContent = '⏳ A guardar...'; btn.disabled = true; }
            await window.__firebaseSync.pushLocal('manual-save');
            if (btn) { btn.textContent = '✅ Guardado!'; btn.disabled = false; }
            setTimeout(() => { if (btn) btn.textContent = '💾 Salvar'; }, 2000);
            if (!silencioso) atualizarUIStatusSync('✅ Dados guardados na nuvem');
        } else {
            if (!silencioso) alert('Sincronização não disponível. Os dados estão guardados localmente.');
        }
    } catch (e) {
        console.error('Erro ao guardar:', e);
        const btn = document.getElementById('btnSyncSalvar');
        if (btn) { btn.textContent = '💾 Salvar'; btn.disabled = false; }
    }
};

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
                        const hasCached = !!localStorage.getItem('__syncSessionUid');
                        if (hasCached) return;
                        atualizarUIStatusSync('Sync: desligado (sem login)');
                        setAuthPanelsVisibilidade({ mostrarAuthPanel: true });
                        setBotoesEntrarVisiveis(true);
                        setBotaoSairVisivel(false);
                        setBotaoForcarSyncVisivel(false);
                        setGoogleControlVisivel(true);
                        mostrarPromptLoginSeNecessario();
                        return;
                    }
                    if (st.state === 'ready') {
                        const email = st.email ? ` | ${st.email}` : '';
                        const label = st.fromCache ? '🔄 A verificar sessão...' : `✅ Sync ativo${email}`;
                        atualizarUIStatusSync(label);
                        setAuthPanelsVisibilidade({ mostrarAuthPanel: true });
                        setBotoesEntrarVisiveis(false);
                        setBotaoSairVisivel(true);
                        setBotaoForcarSyncVisivel(true);
                        setBotaoSalvarVisivel(true);
                        setGoogleControlVisivel(false);
                        return;
                    }
                    if (st.state === 'pushed') {
                        atualizarUIStatusSync('✅ Sync: ok');
                        return;
                    }
                    if (st.state === 'remote-applied') {
                        atualizarUIStatusSync('✅ Dados restaurados');
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

// Auto-sync leve: a cada 10 minutos, puxa/envia dados se estiver logado.
// Não mostra alertas e não bloqueia o usuário.
(function iniciarAutoSync10min() {
    const INTERVAL_MS = 10 * 60 * 1000;
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
    // Repetição a cada 10 minutos
    setInterval(tick, INTERVAL_MS);
})();

function notificarMudancaParaSync(motivo) {
    try {
        if (window.__firebaseSync && typeof window.__firebaseSync.pushLocal === 'function') {
            window.__firebaseSync.pushLocal(motivo || 'change');
        }
    } catch (e) {
        console.warn('Falha ao notificar sync:', e);
    }
}

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

function getMesAtualISO() {
    // Retorna YYYY-MM do mês atual
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
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
    const checkboxSabado = document.getElementById('otSabado');
    const checkboxDomingo = document.getElementById('otDomingo');
    const checkboxFestivo = document.getElementById('otFestivo');
    const previewEl = document.getElementById('previewPremios');
    const badgeSabado = document.getElementById('badgeSabado');
    const badgeDomingo = document.getElementById('badgeDomingo');
    const badgeFestivo = document.getElementById('badgeFestivo');

    const mult = typeof obterMultiplicadores === 'function' ? obterMultiplicadores() : { premioSabado: 0, premioDomingo: 0, premioFestivo: 0 };
    
    // Considera a data selecionada no formulário (se existir)
    const dataFormEl = document.getElementById('dataOT');
    const dataBase = (dataFormEl && dataFormEl.value) ? (dataFormEl.value + 'T00:00:00') : null;
    const hojeISO = getDataISO(dataBase);
    const jaAplicado = premioJaAplicadoNoDia(hojeISO);

    // Desabilitar todos os checkboxes se já foi aplicado prémio hoje
    if (jaAplicado) {
        if (checkboxSabado) { checkboxSabado.checked = false; checkboxSabado.disabled = true; }
        if (checkboxDomingo) { checkboxDomingo.checked = false; checkboxDomingo.disabled = true; }
        if (checkboxFestivo) { checkboxFestivo.checked = false; checkboxFestivo.disabled = true; }
        if (badgeSabado) badgeSabado.style.display = 'none';
        if (badgeDomingo) badgeDomingo.style.display = 'none';
        if (badgeFestivo) badgeFestivo.style.display = 'none';
        if (previewEl) {
            const val = parseFloat(premiosFestivosPorDia[hojeISO]?.valor) || 0;
            previewEl.innerHTML = `<span style="color:#ff9800;">⚠️ Prémio €${val.toFixed(2)} já aplicado em ${formatarDataBRFromISODate(hojeISO)}</span>`;
        }
    } else {
        if (checkboxSabado) checkboxSabado.disabled = false;
        if (checkboxDomingo) checkboxDomingo.disabled = false;
        if (checkboxFestivo) checkboxFestivo.disabled = false;
        if (previewEl) {
            const sab = parseFloat(mult.premioSabado) || 0;
            const dom = parseFloat(mult.premioDomingo) || 0;
            const fest = parseFloat(mult.premioFestivo) || 0;
            previewEl.innerHTML = `Valores: Sáb €${sab.toFixed(2)} | Dom €${dom.toFixed(2)} | Fest €${fest.toFixed(2)}`;
        }
    }
}

// Inicialização
document.addEventListener('DOMContentLoaded', function() {
    // Não bloquear os botões de login: se ficarem "disabled", o clique não dispara.
    // O fluxo de sync já lida com init sob demanda.
    setBotoesAuthHabilitados(true);

    // ── Restaurar UI de sessão imediatamente (evitar flash "deslogado") ──────
    // Antes do Firebase carregar (~1-3s), mostrar já o estado logado se existia sessão.
    try {
        const cachedUid = localStorage.getItem('__syncSessionUid');
        const cachedEmail = localStorage.getItem('__syncSessionEmail') || '';
        if (cachedUid) {
            setBotoesEntrarVisiveis(false);
            setGoogleControlVisivel(false);
            setBotaoSairVisivel(true);
            setBotaoForcarSyncVisivel(true);
            setBotaoSalvarVisivel(true);
            atualizarUIStatusSync(`🔄 A verificar sessão...`);
        }
    } catch {}
    // ─────────────────────────────────────────────────────────────────────────

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
                        // Recarregar serviços (tabelas e multiplicadores podem ter mudado)
                        if (typeof popularSelectsServicos === 'function') popularSelectsServicos();
                        if (typeof recarregarServicos === 'function') recarregarServicos();
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
                        // Só mostrar "sem login" se não houver sessão cached.
                        // Enquanto o Firebase ainda está a verificar (IndexedDB),
                        // pode emitir logged-out antes de confirmar. A cache evita o flash.
                        const hasCached = !!localStorage.getItem('__syncSessionUid');
                        if (hasCached) return; // Firebase ainda está a validar; aguardar 'ready'
                        atualizarUIStatusSync('Sync: desligado (sem login)');
                        setBotoesAuthHabilitados(true);
                        setAuthPanelsVisibilidade({ mostrarAuthPanel: true });
                        setBotoesEntrarVisiveis(true);
                        setGoogleControlVisivel(true);
                        setBotaoSairVisivel(false);
                        setBotaoForcarSyncVisivel(false);
                        setBotaoSalvarVisivel(false);
                        return;
                    }
                    if (st.state === 'ready') {
                        const email = st.email ? ` | ${st.email}` : '';
                        // fromCache: true = restauração rápida antes do Firebase confirmar
                        const label = st.fromCache ? '🔄 A verificar sessão...' : `✅ Sync ativo${email}`;
                        atualizarUIStatusSync(label);
                        setBotoesAuthHabilitados(true);
                        setAuthPanelsVisibilidade({ mostrarAuthPanel: true });
                        setBotoesEntrarVisiveis(false);
                        setGoogleControlVisivel(false);
                        setBotaoSairVisivel(true);
                        setBotaoForcarSyncVisivel(true);
                        setBotaoSalvarVisivel(true);
                        return;
                    }
                    if (st.state === 'syncing') {
                        atualizarUIStatusSync('🔄 Sincronizando...');
                        return;
                    }
                    if (st.state === 'pushed' || st.state === 'sync-ok') {
                        atualizarUIStatusSync('✅ Sync: ok');
                        return;
                    }
                    if (st.state === 'remote-applied') {
                        atualizarUIStatusSync('✅ Dados restaurados');
                        return;
                    }
                    if (String(st.state).includes('error')) {
                        atualizarUIStatusSync('⚠️ Sync: erro (ver console)');
                        setBotoesAuthHabilitados(true);
                        return;
                    }
                }
            });

            await window.__firebaseSync.init();

            // ── AUTO-SAVE ────────────────────────────────────────────
            // 1) Ao minimizar/trocar de aba (visibilitychange)
            document.addEventListener('visibilitychange', () => {
                if (document.visibilityState === 'hidden') {
                    salvarAgora(true); // silencioso
                }
            });
            // 2) Ao fechar o browser/app (beforeunload)
            window.addEventListener('beforeunload', () => {
                salvarAgora(true); // silencioso
            });
            // 3) Em PWA iOS (pagehide é mais fiável que beforeunload)
            window.addEventListener('pagehide', () => {
                salvarAgora(true); // silencioso
            });
            // ─────────────────────────────────────────────────────────

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

// ==================== ADICIONAIS MÚLTIPLOS ====================

// Adicionar adicional à lista
function adicionarAdicional() {
    const select = document.getElementById('adicionalServico');
    const valorSelecionado = select.value;
    
    if (!valorSelecionado) {
        alert('Selecione um adicional para adicionar.');
        return;
    }
    
    try {
        const adicionalInfo = JSON.parse(valorSelecionado);
        
        // Verificar se já foi adicionado
        const jaExiste = adicionaisTemp.some(a => a.item === adicionalInfo.item);
        if (jaExiste) {
            alert('Este adicional já foi adicionado.');
            return;
        }
        
        adicionaisTemp.push(adicionalInfo);
        atualizarListaAdicionais();
        calcularValorTotal();
        
        // Resetar o select
        select.value = '';
    } catch (e) {
        console.error('Erro ao adicionar adicional:', e);
        alert('Erro ao processar adicional.');
    }
}

// Atualizar visualização da lista de adicionais
function atualizarListaAdicionais() {
    const lista = document.getElementById('listaAdicionais');
    const valorAdicionalEl = document.getElementById('valorAdicional');
    
    if (!lista) return;
    
    if (adicionaisTemp.length === 0) {
        lista.innerHTML = '<span style="color: #999; font-size: 12px;">Nenhum adicional selecionado</span>';
        if (valorAdicionalEl) valorAdicionalEl.value = '0.00';
        return;
    }
    
    // Calcular valor total dos adicionais
    const valorTotal = adicionaisTemp.reduce((sum, a) => sum + (parseFloat(a.valor) || 0), 0);
    if (valorAdicionalEl) valorAdicionalEl.value = valorTotal.toFixed(2);
    
    lista.innerHTML = adicionaisTemp.map((adicional, index) => `
        <div style="display: inline-flex; align-items: center; gap: 5px; padding: 5px 10px; background: #9c27b0; color: white; border-radius: 5px; margin: 2px; font-size: 12px;">
            <span>➕ ${adicional.item} (€${(adicional.valor || 0).toFixed(2)})</span>
            <button type="button" onclick="removerAdicional(${index})" style="background: rgba(255,255,255,0.3); color: white; border: none; padding: 2px 6px; border-radius: 3px; cursor: pointer; font-weight: bold;">✕</button>
        </div>
    `).join('');
}

// Remover adicional da lista
function removerAdicional(index) {
    adicionaisTemp.splice(index, 1);
    atualizarListaAdicionais();
    calcularValorTotal();
}

// Obter texto dos adicionais para exibição
function getAdicionaisTexto() {
    if (adicionaisTemp.length === 0) return '-';
    return adicionaisTemp.map(a => a.item).join(', ');
}

// Obter valor total dos adicionais
function getValorTotalAdicionais() {
    return adicionaisTemp.reduce((sum, a) => sum + (parseFloat(a.valor) || 0), 0);
}

// Obter pontos total dos adicionais
function getPontosTotalAdicionais() {
    return adicionaisTemp.reduce((sum, a) => sum + (parseFloat(a.pontos) || 0), 0);
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
    
    // Usar múltiplos adicionais
    const valorAdicionalBase = getValorTotalAdicionais();
    const pontosAdicionalBase = getPontosTotalAdicionais();
    const adicionaisTexto = getAdicionaisTexto();
    
    // Obter multiplicador selecionado
    const multiplicadorEl = document.getElementById('multiplicadorServico');
    const tipoMultiplicador = multiplicadorEl ? multiplicadorEl.value : 'normal';
    const mult = obterMultiplicadores();
    const valorMultiplicador = mult[tipoMultiplicador] || 1.0;
    
    // Valores base sem multiplicador
    const valorServicoBase = servicoInfo ? servicoInfo.valor : 0;

    // Pontos base
    const pontosServicoBase = servicoInfo ? (parseFloat(servicoInfo.pontos) || 0) : 0;
    
    // Valor total com multiplicador
    const valorTotalFinal = parseFloat(document.getElementById('valorTotal').value) || (valorServicoBase + valorAdicionalBase);

    // Checkboxes de prémios de saída
    const checkboxSabado = document.getElementById('otSabado');
    const checkboxDomingo = document.getElementById('otDomingo');
    const checkboxFestivo = document.getElementById('otFestivo');
    
    const dataFormEl = document.getElementById('dataOT');
    const dataOTISO = (dataFormEl && dataFormEl.value) ? dataFormEl.value : getDataISO();
    const hojeISO = dataOTISO;
    
    // Se está editando, verificar prémios da OT original
    const otOriginal = otEmEdicao ? ordensTrabalho.find(o => o.id === otEmEdicao) : null;
    const permitirAplicarHoje = otEmEdicao ? true : !premioJaAplicadoNoDia(hojeISO);
    
    // Verificar dia da semana
    const dataOTDate = new Date(dataOTISO + 'T12:00:00');
    const diaSemana = dataOTDate.getDay(); // 0=domingo, 6=sábado
    
    // Calcular prémios baseado nos checkboxes (só aplica se permitido)
    const marcadoSabado = !!(checkboxSabado && checkboxSabado.checked);
    const marcadoDomingo = !!(checkboxDomingo && checkboxDomingo.checked);
    const marcadoFestivo = !!(checkboxFestivo && checkboxFestivo.checked);
    
    let premioSabadoAplicado = 0;
    let premioDomingoAplicado = 0;
    let premioFestivoAplicado = 0;
    
    if (permitirAplicarHoje) {
        if (marcadoSabado) {
            premioSabadoAplicado = parseFloat(mult?.premioSabado) || 0;
        }
        if (marcadoDomingo) {
            premioDomingoAplicado = parseFloat(mult?.premioDomingo) || 0;
        }
        if (marcadoFestivo) {
            premioFestivoAplicado = parseFloat(mult?.premioFestivo) || 0;
        }
    }
    
    // Total de prémios aplicados
    const premioTotalAplicado = premioSabadoAplicado + premioDomingoAplicado + premioFestivoAplicado;
    
    // Se está em modo edição, atualizar ao invés de criar nova
    if (otEmEdicao) {
        const index = ordensTrabalho.findIndex(o => o.id === otEmEdicao);
        if (index !== -1) {
            // Capturar dados antigos para verificar se precisa limpar prémios
            const otAntiga = ordensTrabalho[index];
            const dataAntigaISO = otAntiga ? getDataISO(otAntiga.data) : null;
            
            // Manter o ID original
            ordensTrabalho[index] = {
                ...ordensTrabalho[index],
                data: dataOTISO + 'T00:00:00',
                numeroOT: numeroOT || '-',
                tipoServico: servicoInfo ? servicoInfo.item : (tipoServico || '-'),
                categoria: categoriaSelecionada,
                rede: servicoInfo ? servicoInfo.red : '',
                tipologia: servicoInfo ? servicoInfo.tipologia : '',
                adicional: adicionaisTexto,
                adicionais: [...adicionaisTemp], // Array completo de adicionais
                valorAdicional: valorAdicionalBase,
                pontosServico: pontosServicoBase,
                pontosAdicional: pontosAdicionalBase,
                multiplicador: tipoMultiplicador,
                valorMultiplicador: valorMultiplicador,
                otSabado: marcadoSabado,
                otDomingo: marcadoDomingo,
                otFestivo: marcadoFestivo,
                premioSabadoAplicado: marcadoSabado ? premioSabadoAplicado : 0,
                premioDomingoAplicado: marcadoDomingo ? premioDomingoAplicado : 0,
                premioFestivoAplicado: marcadoFestivo ? premioFestivoAplicado : 0,
                diaSemana: diaSemana,
                equipamentos: [...equipamentosTemp],
                tipoTrabalho: document.getElementById('tipoTrabalho').value || '-',
                observacoes: document.getElementById('observacoes').value || '',
                valorServico: valorTotalFinal
            };
            
            salvarDados();
            
            // Se removeu prémios, limpar do registro do dia (para PDF)
            if (dataAntigaISO) {
                limparPremiosDoDiaSeNaoExistirMaisOT(dataAntigaISO);
            }
            // Também verificar a nova data se mudou
            if (dataOTISO !== dataAntigaISO) {
                limparPremiosDoDiaSeNaoExistirMaisOT(dataOTISO);
            }
            
            atualizarTabela();
            atualizarResumos();
            atualizarUIFestivoPorDia();
            
            // Limpar modo edição
            cancelarEdicao();
            
            alert('Ordem de trabalho atualizada com sucesso!');
            return;
        }
    }
    
    const ot = {
        id: Date.now(),
        // Guardar a data da OT (não a data/hora de cadastro), para o PDF sempre mostrar correto
        data: dataOTISO + 'T00:00:00',
        numeroOT: numeroOT || '-',
        tipoServico: servicoInfo ? servicoInfo.item : (tipoServico || '-'),
        categoria: categoriaSelecionada,
        rede: servicoInfo ? servicoInfo.red : '',
        tipologia: servicoInfo ? servicoInfo.tipologia : '',
        adicional: adicionaisTexto,
        adicionais: [...adicionaisTemp], // Array completo de adicionais
        valorAdicional: valorAdicionalBase,
        pontosServico: pontosServicoBase,
        pontosAdicional: pontosAdicionalBase,
        multiplicador: tipoMultiplicador,
        valorMultiplicador: valorMultiplicador,
        // Flags de prémios
        otSabado: (marcadoSabado && permitirAplicarHoje),
        otDomingo: (marcadoDomingo && permitirAplicarHoje),
        otFestivo: (marcadoFestivo && permitirAplicarHoje),
        // Valores dos prémios aplicados
        premioSabadoAplicado: premioSabadoAplicado,
        premioDomingoAplicado: premioDomingoAplicado,
        premioFestivoAplicado: premioFestivoAplicado,
        diaSemana: diaSemana, // Guardar dia da semana para referência
        equipamentos: [...equipamentosTemp], // Copiar array de equipamentos
        tipoTrabalho: document.getElementById('tipoTrabalho').value || '-',
        observacoes: document.getElementById('observacoes').value || '',
        valorServico: valorTotalFinal
    };
    
    ordensTrabalho.push(ot);

    // Arquivar no histórico do mês (não apagar meses antigos)
    garantirOTNoHistorico(ot);
    salvarHistoricoOT();

    // Se aplicou algum prémio hoje, registrar que o prémio do dia já foi usado
    if (premioTotalAplicado > 0) {
        setPremioNoDiaSeMaior(hojeISO, premioTotalAplicado, ot.data);
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
    
    // Resetar multiplicador para normal
    const multiplicadorEl = document.getElementById('multiplicadorServico');
    if (multiplicadorEl) {
        multiplicadorEl.value = 'normal';
    }

    // Resetar checkboxes de prémios
    const checkboxSabado = document.getElementById('otSabado');
    const checkboxDomingo = document.getElementById('otDomingo');
    const checkboxFestivo = document.getElementById('otFestivo');
    if (checkboxSabado) checkboxSabado.checked = false;
    if (checkboxDomingo) checkboxDomingo.checked = false;
    if (checkboxFestivo) checkboxFestivo.checked = false;
    
    // Esconder badges
    const badgeSabado = document.getElementById('badgeSabado');
    const badgeDomingo = document.getElementById('badgeDomingo');
    const badgeFestivo = document.getElementById('badgeFestivo');
    if (badgeSabado) badgeSabado.style.display = 'none';
    if (badgeDomingo) badgeDomingo.style.display = 'none';
    if (badgeFestivo) badgeFestivo.style.display = 'none';

    // Atualizar preview do prémio
    calcularValorTotal();

    // Atualizar estado dos checkboxes (pode ficar desabilitado se já aplicado hoje)
    atualizarUIFestivoPorDia();
    
    equipamentosTemp = [];
    atualizarListaEquipamentos();
    
    adicionaisTemp = [];
    atualizarListaAdicionais();
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
        option.value = JSON.stringify(servico);
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
    document.getElementById('categoriaServico').value = '';
    document.getElementById('valorTotal').value = '';
}

function atualizarValorServico() {
    const select = document.getElementById('tipoServico');
    
    if (select.value) {
        try {
            const servico = JSON.parse(select.value);
            const valor = parseFloat(servico.valor) || 0;
            const categoria = servico.categoria || '';
            const codigo = servico.item || '';
            const descricao = servico.tipologia || '';
            
            // Atualizar campos readonly
            document.getElementById('valorServico').value = valor.toFixed(2);
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

function atualizarTabela(filtrarMes = null) {
    const tbody = document.getElementById('corpoTabela');
    tbody.innerHTML = '';
    
    let otsFiltradas = ordensTrabalho;
    
    // Se não foi especificado filtro, usar o mês atual por padrão
    const mesParaFiltrar = filtrarMes || getMesAtualISO();
    
    // Aplicar filtro de mês (sempre filtra)
    otsFiltradas = otsFiltradas.filter(ot => {
        const dataOT = new Date(ot.data);
        const mesAno = `${dataOT.getFullYear()}-${String(dataOT.getMonth() + 1).padStart(2, '0')}`;
        return mesAno === mesParaFiltrar;
    });
    
    // Atualizar o select do filtro para mostrar o mês atual
    const filtroMesEl = document.getElementById('filtroMes');
    if (filtroMesEl && !filtrarMes) {
        filtroMesEl.value = mesParaFiltrar;
    }
    
    if (otsFiltradas.length === 0) {
        tbody.innerHTML = '<tr class="empty-state"><td colspan="7">Nenhuma ordem de trabalho encontrada neste mês</td></tr>';
        return;
    }
    
    otsFiltradas.reverse().forEach(ot => {
        const tr = document.createElement('tr');
        const data = new Date(ot.data);
        
        // Formatar equipamentos para exibição
        const equipamentosTexto = ot.equipamentos && ot.equipamentos.length > 0
            ? ot.equipamentos.map(eq => typeof eq === 'string' ? eq : `${eq.tipo}: ${eq.mac}`).join(', ')
            : (ot.macEquipamento || '-');
        
        // Identificar se é dia especial para destacar na tabela
        const diaSemana = data.getDay();
        const isFestivo = ot.otFestivo === true;
        let badgeDia = '';
        if (isFestivo) {
            badgeDia = '<span style="background:#9c27b0;color:#fff;padding:2px 6px;border-radius:4px;font-size:10px;margin-left:5px;">🎉 FESTIVO</span>';
        } else if (diaSemana === 0) {
            badgeDia = '<span style="background:#e91e63;color:#fff;padding:2px 6px;border-radius:4px;font-size:10px;margin-left:5px;">DOM</span>';
        } else if (diaSemana === 6) {
            badgeDia = '<span style="background:#ff9800;color:#fff;padding:2px 6px;border-radius:4px;font-size:10px;margin-left:5px;">SÁB</span>';
        }

        // Mostrar tipo de trabalho com serviço e categoria como subtexto
        const tipoLabel = formatarTipoTrabalho(ot.tipoTrabalho);
        const subtexto = [ot.tipoServico, ot.categoria].filter(Boolean).join(' · ');
        const tipoCell = subtexto
            ? `${tipoLabel}<br><small style="color:#888;font-size:10px;">${subtexto}</small>`
            : tipoLabel;
        
        tr.innerHTML = `
            <td>${data.toLocaleDateString('pt-BR')}${badgeDia}</td>
            <td><strong>${ot.numeroOT}</strong></td>
            <td>${tipoCell}</td>
            <td><small>${ot.adicional ? ot.adicional : '-'}</small></td>
            <td><small>${equipamentosTexto}</small></td>
            <td><strong style="color: #27ae60;">€ ${ot.valorServico.toFixed(2)}</strong></td>
            <td>
                <button class="btn-edit" onclick="editarOT(${ot.id})" title="Editar">✏️</button>
                <button class="btn-delete" onclick="deletarOT(${ot.id})" title="Excluir">🗑️</button>
            </td>
        `;
        
        tbody.appendChild(tr);
    });
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

function limparPremiosDoDiaSeNaoExistirMaisOT(dataISO) {
    try {
        if (!dataISO) return;

        // Verificar se ainda existe alguma OT neste dia com prémios (Sábado, Domingo ou Festivo)
        const aindaExistePremioNoDia = ordensTrabalho.some(ot => {
            if (!ot) return false;
            const dataOT = getDataISO(ot.data);
            if (dataOT !== dataISO) return false;
            
            // Verificar se tem algum prémio aplicado
            const temSabado = (parseFloat(ot.premioSabadoAplicado) || 0) > 0 || ot.otSabado;
            const temDomingo = (parseFloat(ot.premioDomingoAplicado) || 0) > 0 || ot.otDomingo;
            const temFestivo = (parseFloat(ot.premioFestivoAplicado) || 0) > 0 || ot.otFestivo;
            
            return temSabado || temDomingo || temFestivo;
        });

        // Se não existe mais nenhuma OT com prémio neste dia, limpar o registro
        if (!aindaExistePremioNoDia && premiosFestivosPorDia && premiosFestivosPorDia[dataISO]) {
            delete premiosFestivosPorDia[dataISO];
            salvarPremiosFestivosPorDia();
        }
    } catch (e) {
        console.warn('Falha ao limpar prémios do dia:', e);
    }
}

// Manter compatibilidade com nome antigo
function limparPremioFestivoDoDiaSeNaoExistirMaisOTFestiva(dataISO) {
    limparPremiosDoDiaSeNaoExistirMaisOT(dataISO);
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

// Variável para guardar ID da OT sendo editada
let otEmEdicao = null;

function editarOT(id) {
    const ot = ordensTrabalho.find(o => o.id === id);
    if (!ot) {
        alert('OT não encontrada!');
        return;
    }
    
    // Guardar ID para saber que está em modo edição
    otEmEdicao = id;
    
    // Preencher o formulário com os dados da OT
    document.getElementById('dataOT').value = ot.data ? ot.data.substring(0, 10) : '';
    document.getElementById('numeroOT').value = ot.numeroOT || '';
    document.getElementById('tipoTrabalho').value = ot.tipoTrabalho || '';
    document.getElementById('observacoes').value = ot.observacoes || '';
    
    // Categoria
    const categoriaEl = document.getElementById('categoriaServico');
    if (categoriaEl) categoriaEl.value = ot.categoria || '';
    
    // Valor do serviço (readonly, só para mostrar)
    const valorServicoEl = document.getElementById('valorServico');
    if (valorServicoEl) valorServicoEl.value = ot.pontosServico ? ot.pontosServico : '';
    
    // Valor total
    const valorTotalEl = document.getElementById('valorTotal');
    if (valorTotalEl) valorTotalEl.value = ot.valorServico ? ot.valorServico.toFixed(2) : '';
    
    // Multiplicador
    const multiplicadorEl = document.getElementById('multiplicadorServico');
    if (multiplicadorEl) multiplicadorEl.value = ot.multiplicador || 'normal';
    
    // Checkboxes de prémios
    const checkSabado = document.getElementById('otSabado');
    const checkDomingo = document.getElementById('otDomingo');
    const checkFestivo = document.getElementById('otFestivo');
    if (checkSabado) checkSabado.checked = !!ot.otSabado;
    if (checkDomingo) checkDomingo.checked = !!ot.otDomingo;
    if (checkFestivo) checkFestivo.checked = !!ot.otFestivo;
    
    // Equipamentos
    equipamentosTemp = ot.equipamentos ? [...ot.equipamentos] : [];
    atualizarListaEquipamentos();
    
    // Adicionais
    adicionaisTemp = ot.adicionais ? [...ot.adicionais] : [];
    atualizarListaAdicionais();
    
    // Mudar botão de "Registrar" para "Atualizar"
    const btnSubmit = document.querySelector('#formOT button[type="submit"]');
    if (btnSubmit) {
        btnSubmit.textContent = '✏️ Atualizar OT';
        btnSubmit.style.background = 'linear-gradient(135deg, #f39c12, #e67e22)';
    }
    
    // Mostrar botão de cancelar edição
    mostrarBotaoCancelarEdicao();
    
    // Scroll para o topo do formulário
    document.getElementById('formOT').scrollIntoView({ behavior: 'smooth' });
    
    // Destacar que está em modo edição
    document.getElementById('formOT').style.boxShadow = '0 0 15px rgba(243, 156, 18, 0.5)';
}

function mostrarBotaoCancelarEdicao() {
    // Remover botão existente se houver
    const btnExistente = document.getElementById('btnCancelarEdicao');
    if (btnExistente) btnExistente.remove();
    
    // Criar botão de cancelar
    const btnCancelar = document.createElement('button');
    btnCancelar.type = 'button';
    btnCancelar.id = 'btnCancelarEdicao';
    btnCancelar.textContent = '❌ Cancelar Edição';
    btnCancelar.style.cssText = 'margin-left: 10px; padding: 12px 20px; background: #e74c3c; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600;';
    btnCancelar.onclick = cancelarEdicao;
    
    const btnSubmit = document.querySelector('#formOT button[type="submit"]');
    if (btnSubmit && btnSubmit.parentElement) {
        btnSubmit.parentElement.appendChild(btnCancelar);
    }
}

function cancelarEdicao() {
    otEmEdicao = null;
    limparFormulario();
    
    // Restaurar botão
    const btnSubmit = document.querySelector('#formOT button[type="submit"]');
    if (btnSubmit) {
        btnSubmit.textContent = '✅ Registrar OT';
        btnSubmit.style.background = '';
    }
    
    // Remover botão de cancelar
    const btnCancelar = document.getElementById('btnCancelarEdicao');
    if (btnCancelar) btnCancelar.remove();
    
    // Remover destaque
    document.getElementById('formOT').style.boxShadow = '';
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
    const mesInput = document.getElementById('filtroMes').value;
    const categoria = document.getElementById('filtroCategoria').value;
    const diaSemanaFiltro = document.getElementById('filtroDiaSemana')?.value || '';
    
    // Se não selecionou mês, usar mês atual
    const mes = mesInput || getMesAtualISO();
    
    const tbody = document.getElementById('corpoTabela');
    tbody.innerHTML = '';
    
    let otsFiltradas = ordensTrabalho;
    
    // Filtro por mês (sempre aplica, usando mês atual como padrão)
    otsFiltradas = otsFiltradas.filter(ot => {
        const dataOT = new Date(ot.data);
        const mesAno = `${dataOT.getFullYear()}-${String(dataOT.getMonth() + 1).padStart(2, '0')}`;
        return mesAno === mes;
    });
    
    // Filtro por categoria
    if (categoria) {
        otsFiltradas = otsFiltradas.filter(ot => ot.categoria === categoria);
    }
    
    // Filtro por dia da semana (Sábado, Domingo, Festivo)
    if (diaSemanaFiltro) {
        otsFiltradas = otsFiltradas.filter(ot => {
            const dataOT = new Date(ot.data);
            const diaSemana = dataOT.getDay(); // 0 = Domingo, 6 = Sábado
            const isFestivo = ot.otFestivo === true;
            
            switch (diaSemanaFiltro) {
                case 'sabado':
                    return diaSemana === 6;
                case 'domingo':
                    return diaSemana === 0;
                case 'festivo':
                    return isFestivo;
                case 'fds': // Fins de semana (Sábado + Domingo)
                    return diaSemana === 0 || diaSemana === 6;
                case 'especial': // Todos especiais (Sáb + Dom + Festivo)
                    return diaSemana === 0 || diaSemana === 6 || isFestivo;
                default:
                    return true;
            }
        });
    }
    
    if (otsFiltradas.length === 0) {
        tbody.innerHTML = '<tr class="empty-state"><td colspan="7">Nenhuma ordem de trabalho encontrada neste mês</td></tr>';
        return;
    }
    
    otsFiltradas.reverse().forEach(ot => {
        const tr = document.createElement('tr');
        const data = new Date(ot.data);
        
        // Identificar se é dia especial para destacar na tabela
        const diaSemana = data.getDay();
        const isFestivo = ot.otFestivo === true;
        let badgeDia = '';
        if (isFestivo) {
            badgeDia = '<span style="background:#9c27b0;color:#fff;padding:2px 6px;border-radius:4px;font-size:10px;margin-left:5px;">🎉 FESTIVO</span>';
        } else if (diaSemana === 0) {
            badgeDia = '<span style="background:#e91e63;color:#fff;padding:2px 6px;border-radius:4px;font-size:10px;margin-left:5px;">DOM</span>';
        } else if (diaSemana === 6) {
            badgeDia = '<span style="background:#ff9800;color:#fff;padding:2px 6px;border-radius:4px;font-size:10px;margin-left:5px;">SÁB</span>';
        }

        const tipoLabel = formatarTipoTrabalho(ot.tipoTrabalho);
        const subtexto = [ot.tipoServico, ot.categoria].filter(Boolean).join(' · ');
        const tipoCell = subtexto
            ? `${tipoLabel}<br><small style="color:#888;font-size:10px;">${subtexto}</small>`
            : tipoLabel;
        
        tr.innerHTML = `
            <td>${data.toLocaleDateString('pt-BR')}${badgeDia}</td>
            <td><strong>${ot.numeroOT}</strong></td>
            <td>${tipoCell}</td>
            <td><small>${ot.adicional ? ot.adicional : '-'}</small></td>
            <td><small>${ot.macEquipamento || '-'}</small></td>
            <td><strong style="color: #27ae60;">€ ${ot.valorServico.toFixed(2)}</strong></td>
            <td><button class="btn-delete" onclick="deletarOT(${ot.id})">🗑️</button></td>
        `;
        
        tbody.appendChild(tr);
    });
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
        tbody.innerHTML = '<tr class="empty-state"><td colspan="7">Nenhum equipamento encontrado com este MAC</td></tr>';
        return;
    }
    
    resultados.reverse().forEach(ot => {
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

        const tipoLabel = formatarTipoTrabalho(ot.tipoTrabalho);
        const subtexto = [ot.tipoServico, ot.categoria].filter(Boolean).join(' · ');
        const tipoCell = subtexto
            ? `${tipoLabel}<br><small style="color:#888;font-size:10px;">${subtexto}</small>`
            : tipoLabel;
        
        tr.innerHTML = `
            <td>${data.toLocaleDateString('pt-BR')}</td>
            <td><strong>${ot.numeroOT}</strong></td>
            <td>${tipoCell}</td>
            <td><small>${ot.adicional ? ot.adicional : '-'}</small></td>
            <td><small>${equipamentosTexto}</small></td>
            <td><strong style="color: #27ae60;">€ ${ot.valorServico.toFixed(2)}</strong></td>
            <td><button class="btn-delete" onclick="deletarOT(${ot.id})">🗑️</button></td>
        `;
        
        tbody.appendChild(tr);
    });
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
    const diaSemanaFiltro = document.getElementById('filtroDiaSemana')?.value || '';
    
    // Mapeamento do filtro de dia para texto legível
    const diaSemanaTexto = {
        'sabado': 'Sábados',
        'domingo': 'Domingos',
        'festivo': 'Festivos',
        'fds': 'Fins de Semana',
        'especial': 'Dias Especiais (Sáb+Dom+Festivo)'
    };

    let otsMes = obterOTsVisiveisNaTabela();
    
    // Cabeçalho
    doc.setFontSize(18);
    doc.text('Relatório de Ordens de Trabalho', 14, 20);
    doc.setFontSize(11);
    doc.text(`Período: ${new Date(mesAtual + '-01').toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}`, 14, 28);
    
    // Mostrar filtros aplicados
    let filtrosTexto = [];
    if (categoriaFiltro) filtrosTexto.push(`Categoria: ${categoriaFiltro}`);
    if (diaSemanaFiltro) filtrosTexto.push(`Dias: ${diaSemanaTexto[diaSemanaFiltro] || diaSemanaFiltro}`);
    
    if (filtrosTexto.length > 0) {
        doc.text(`Filtros: ${filtrosTexto.join(' | ')}`, 14, 34);
    }
    
    // Tabela (com Equipamentos)
    const tableData = otsMes.map(ot => {
        const equipamentos = (ot.equipamentos && ot.equipamentos.length > 0)
            ? ot.equipamentos.map(eq => (typeof eq === 'string') ? eq : (eq.mac || '')).filter(Boolean).join(', ')
            : (ot.macEquipamento || '-');
        
        // Adicionar indicador de dia especial
        const dataOT = new Date(ot.data);
        const diaSemana = dataOT.getDay();
        const isFestivo = ot.otFestivo === true;
        let diaIndicador = '';
        if (isFestivo) diaIndicador = ' (FEST)';
        else if (diaSemana === 0) diaIndicador = ' (DOM)';
        else if (diaSemana === 6) diaIndicador = ' (SAB)';

        return [
            dataOT.toLocaleDateString('pt-BR') + diaIndicador,
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
            startY: filtrosTexto.length > 0 ? 40 : 35,
            head: [['Data', 'OT', 'Serviço', 'Categoria', 'Tipo', 'Equipamentos', 'Observações', 'Valor']],
            body: tableData,
            theme: 'striped',
            headStyles: { fillColor: [102, 126, 234] },
            styles: { fontSize: 8 },
            columnStyles: {
                0: { cellWidth: 22 },
                1: { cellWidth: 20 },
                2: { cellWidth: 35 },
                3: { cellWidth: 30 },
                4: { cellWidth: 20 },
                5: { cellWidth: 50 },
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
    
    // PRÉMIOS DE SAÍDA: Sábado, Domingo e Festivo (1x por dia)
    // Coletar prémios por dia (apenas 1x por dia, como nas OTs)
    const premiosSaidaPorDia = {};
    otsMes.forEach(ot => {
        const dataISO = getDataISO(ot.data);
        if (premiosSaidaPorDia[dataISO]) return; // Já registrado para este dia
        
        const premioSab = parseFloat(ot.premioSabadoAplicado) || 0;
        const premioDom = parseFloat(ot.premioDomingoAplicado) || 0;
        const premioFest = parseFloat(ot.premioFestivoAplicado) || 0;
        const totalDia = premioSab + premioDom + premioFest;
        
        if (totalDia > 0 || ot.otSabado || ot.otDomingo || ot.otFestivo) {
            premiosSaidaPorDia[dataISO] = {
                sabado: premioSab,
                domingo: premioDom,
                festivo: premioFest,
                total: totalDia,
                tipo: ot.otSabado ? 'Sáb' : (ot.otDomingo ? 'Dom' : (ot.otFestivo ? 'Festivo' : ''))
            };
        }
    });
    
    // Fallback: verificar mapa premiosFestivosPorDia para dados antigos
    if (premiosFestivosPorDia) {
        Object.keys(premiosFestivosPorDia).forEach(d => {
            if (!d || typeof d !== 'string') return;
            if (d.substring(0, 7) !== mesAtual) return;
            const val = getPremioRegistradoNoDia(d);
            if (val > 0 && !premiosSaidaPorDia[d]) {
                premiosSaidaPorDia[d] = {
                    sabado: 0,
                    domingo: 0,
                    festivo: val,
                    total: val,
                    tipo: 'Festivo'
                };
            }
        });
    }
    
    const diasPremio = Object.keys(premiosSaidaPorDia).sort();
    const totalPremiosSaida = diasPremio.reduce((sum, d) => sum + (premiosSaidaPorDia[d]?.total || 0), 0);
    
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
    
    // Mostrar prémios de saída se houver
    if (totalPremiosSaida > 0 || diasPremio.length > 0) {
        doc.setFontSize(11);
        doc.setFont(undefined, 'normal');
        doc.text(`Prémios de Saída (1x por dia): € ${totalPremiosSaida.toFixed(2)}`, 14, finalY + 14);

        // Tabela separada: Data + Tipo + Valor (1x por dia)
        const tablePremios = diasPremio.map(d => {
            const p = premiosSaidaPorDia[d];
            return [
                formatarDataBRFromISODate(d),
                p?.tipo || '-',
                `€ ${(p?.total || 0).toFixed(2)}`
            ];
        });

        if (temAutoTable) {
            doc.autoTable({
                startY: finalY + 18,
                head: [['Data', 'Tipo', 'Prémio']],
                body: tablePremios,
                theme: 'striped',
                headStyles: { fillColor: [102, 126, 234] },
                styles: { fontSize: 9 },
                columnStyles: {
                    0: { cellWidth: 30 },
                    1: { cellWidth: 25 },
                    2: { cellWidth: 25, fontStyle: 'bold' }
                }
            });
            finalY = doc.lastAutoTable.finalY + 6;
        } else {
            // Fallback sem tabela: listar datas/valores como texto
            let y = finalY + 20;
            doc.setFontSize(10);
            doc.text('Prémios de Saída:', 14, y);
            y += 6;
            diasPremio.forEach(d => {
                const p = premiosSaidaPorDia[d];
                doc.text(`${formatarDataBRFromISODate(d)} (${p?.tipo || '-'}) - € ${(p?.total || 0).toFixed(2)}`, 14, y);
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
    const valorReceber = totalValor + totalPremiosSaida;
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
    
    // PRÉMIOS DE SAÍDA: Sábado, Domingo e Festivo (1x por dia)
    const premiosSaidaPorDia = {};
    otsMes.forEach(ot => {
        const dataISO = getDataISO(ot.data);
        if (premiosSaidaPorDia[dataISO]) return;
        
        const premioSab = parseFloat(ot.premioSabadoAplicado) || 0;
        const premioDom = parseFloat(ot.premioDomingoAplicado) || 0;
        const premioFest = parseFloat(ot.premioFestivoAplicado) || 0;
        const totalDia = premioSab + premioDom + premioFest;
        
        if (totalDia > 0 || ot.otSabado || ot.otDomingo || ot.otFestivo) {
            premiosSaidaPorDia[dataISO] = {
                sabado: premioSab,
                domingo: premioDom,
                festivo: premioFest,
                total: totalDia,
                tipo: ot.otSabado ? 'Sáb' : (ot.otDomingo ? 'Dom' : (ot.otFestivo ? 'Festivo' : ''))
            };
        }
    });
    
    if (premiosFestivosPorDia) {
        Object.keys(premiosFestivosPorDia).forEach(d => {
            if (!d || typeof d !== 'string') return;
            if (d.substring(0, 7) !== mesAtual) return;
            const val = getPremioRegistradoNoDia(d);
            if (val > 0 && !premiosSaidaPorDia[d]) {
                premiosSaidaPorDia[d] = {
                    sabado: 0, domingo: 0, festivo: val,
                    total: val, tipo: 'Festivo'
                };
            }
        });
    }
    
    const diasPremio = Object.keys(premiosSaidaPorDia).sort();
    const totalPremiosSaida = diasPremio.reduce((sum, d) => sum + (premiosSaidaPorDia[d]?.total || 0), 0);
    const totalPontos = otsMes.reduce((sum, ot) => {
        const pServ = parseFloat(ot.pontosServico) || 0;
        const pAdd = parseFloat(ot.pontosAdicional) || 0;
        return sum + pServ + pAdd;
    }, 0);
    
    let finalY = doc.lastAutoTable.finalY + 10;
    doc.setFontSize(11);
    doc.text(`Total de OTs: ${otsMes.length}`, 14, finalY);
    doc.text(`Total de Pontos: ${totalPontos.toFixed(1)}`, 14, finalY + 7);
    
    if (totalPremiosSaida > 0 || diasPremio.length > 0) {
        doc.setFontSize(11);
        doc.setFont(undefined, 'normal');
        doc.text(`Prémios de Saída (1x por dia): € ${totalPremiosSaida.toFixed(2)}`, 14, finalY + 14);

        const tablePremios = diasPremio.map(d => {
            const p = premiosSaidaPorDia[d];
            return [
                formatarDataBRFromISODate(d),
                p?.tipo || '-',
                `€ ${(p?.total || 0).toFixed(2)}`
            ];
        });

        doc.autoTable({
            startY: finalY + 18,
            head: [['Data', 'Tipo', 'Prémio']],
            body: tablePremios,
            theme: 'striped',
            headStyles: { fillColor: [39, 174, 96] },
            styles: { fontSize: 9 },
            columnStyles: {
                0: { cellWidth: 30 },
                1: { cellWidth: 25 },
                2: { cellWidth: 25, fontStyle: 'bold' }
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
    const valorReceber = totalValor + totalPremiosSaida;
    doc.text(`VALOR A RECEBER: € ${valorReceber.toFixed(2)}`, 14, finalY + 12);
    
    // doc.save(`relatorio-ot-equipamentos-${mesAtual}.pdf`);
}

// ==================== BACKUP LOCAL (JSON) ====================
function exportarBackup() {
    try {
        const payload = {
            geradoEm: new Date().toISOString(),
            versao: 1,
            ordensTrabalho: ordensTrabalho,
            registrosLogistica: registrosLogistica,
            historicoOTPorMes: historicoOTPorMes,
            premiosFestivosPorDia: premiosFestivosPorDia,
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
                const novoHistorico = (payload.historicoOTPorMes && typeof payload.historicoOTPorMes === 'object') ? payload.historicoOTPorMes : null;
                const novosPremios = (payload.premiosFestivosPorDia && typeof payload.premiosFestivosPorDia === 'object') ? payload.premiosFestivosPorDia : null;

                if (novasOTs.length === 0 && novaLogistica.length === 0) {
                    alert('Backup não contém registros para importar.');
                    return;
                }

                const substituir = confirm('Deseja SUBSTITUIR todos os dados atuais pelos do backup?\nClique em OK para substituir.\nClique em Cancelar para mesclar (sem duplicar por id).');

                if (substituir) {
                    ordensTrabalho = novasOTs;
                    registrosLogistica = novaLogistica;
                    if (novoHistorico) historicoOTPorMes = novoHistorico;
                    if (novosPremios) premiosFestivosPorDia = novosPremios;
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
                }

                // Persistir
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




