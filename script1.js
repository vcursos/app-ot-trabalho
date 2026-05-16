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
    // __firebaseSync é sempre criado no DOMContentLoaded (iniciarSyncFirebase).
    // Aguardar até estar pronto (máx 6 s) sem usar import() dinâmico,
    // que falha em alguns Android WebViews com "Unexpected reserved word".
    for (let i = 0; i < 60; i++) {
        if (window.__firebaseSync) return window.__firebaseSync;
        await new Promise(r => setTimeout(r, 100));
    }
    throw new Error('Sync não inicializado. Tente recarregar a página.');
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
        // Forçar UI de "deslogado" imediatamente (sem esperar callbacks)
        setBotoesEntrarVisiveis(true);
        setGoogleControlVisivel(true);
        setBotaoSairVisivel(false);
        setBotaoForcarSyncVisivel(false);
        setBotaoSalvarVisivel(false);
        atualizarUIStatusSync('Sync: a sair...');
        // Limpar cache local de sessão imediatamente
        try { localStorage.removeItem('__syncSessionUid'); localStorage.removeItem('__syncSessionEmail'); } catch {}

        const sync = window.__firebaseSync;
        if (!sync) {
            atualizarUIStatusSync('Sync: desligado (sem login)');
            return;
        }
        await sync.sair();
        atualizarUIStatusSync('Sync: desligado (sem login)');
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
    const checkboxPremioFestivo = document.getElementById('otPremioFestivo');
    const checkboxForaHora = document.getElementById('otForaHora');
    const previewEl = document.getElementById('previewPremios');
    const badgeSabado = document.getElementById('badgeSabado');
    const badgeDomingo = document.getElementById('badgeDomingo');
    const badgeFestivo = document.getElementById('badgeFestivo');
    const badgeBonus = document.getElementById('badgeBonus');
    const badgeForaHora = document.getElementById('badgeForaHora');

    const mult = typeof obterMultiplicadores === 'function' ? obterMultiplicadores() : { premioSabado: 0, premioDomingo: 0, premioFestivo: 0, bonusOTForaHora: 0, bonusOTForaHoraTipo: 'valor' };
    
    // Considera a data selecionada no formulário (se existir)
    const dataFormEl = document.getElementById('dataOT');
    const dataBase = (dataFormEl && dataFormEl.value) ? (dataFormEl.value + 'T00:00:00') : null;
    const hojeISO = getDataISO(dataBase);
    const jaAplicado = premioJaAplicadoNoDia(hojeISO);
    const emEdicao = !!otEmEdicao;
    const bloquearPremioDia = jaAplicado && !emEdicao;

    // O bônus "Fora de Hora" é por OT — nunca é bloqueado pelo prémio diário
    if (checkboxForaHora) checkboxForaHora.disabled = false;
    if (badgeForaHora) badgeForaHora.style.display = (checkboxForaHora && checkboxForaHora.checked) ? 'inline' : 'none';
    if (badgeBonus) badgeBonus.style.display = (checkboxPremioFestivo && checkboxPremioFestivo.checked) ? 'inline' : 'none';

    // Desabilitar checkboxes de prémio diário se já foi aplicado prémio hoje
    if (bloquearPremioDia) {
        if (checkboxSabado) { checkboxSabado.checked = false; checkboxSabado.disabled = true; }
        if (checkboxDomingo) { checkboxDomingo.checked = false; checkboxDomingo.disabled = true; }
        if (checkboxFestivo) { checkboxFestivo.checked = false; checkboxFestivo.disabled = true; }
        if (checkboxPremioFestivo) { checkboxPremioFestivo.checked = false; checkboxPremioFestivo.disabled = true; }
        if (badgeSabado) badgeSabado.style.display = 'none';
        if (badgeDomingo) badgeDomingo.style.display = 'none';
        if (badgeFestivo) badgeFestivo.style.display = 'none';
        if (badgeBonus) badgeBonus.style.display = 'none';
        if (previewEl) {
            const val = parseFloat(premiosFestivosPorDia[hojeISO]?.valor) || 0;
            const bfh = parseFloat(mult.bonusOTForaHora) || 0;
            const bfhTipo = mult.bonusOTForaHoraTipo || 'valor';
            const bfhLabel = bfh > 0
                ? ` | ⏱️ Fora Hora: ${bfhTipo === 'valor' ? '€' + bfh.toFixed(2) : (bfhTipo === 'percentagem' ? bfh + '%' : bfh + 'x')} (por OT)`
                : '';
            previewEl.innerHTML = `<span style="color:#ff9800;">⚠️ Prémio €${val.toFixed(2)} já aplicado em ${formatarDataBRFromISODate(hojeISO)}</span>${bfhLabel}`;
        }
    } else {
        if (checkboxSabado) checkboxSabado.disabled = false;
        if (checkboxDomingo) checkboxDomingo.disabled = false;
        if (checkboxFestivo) checkboxFestivo.disabled = false;
        if (checkboxPremioFestivo) {
            const fest = parseFloat(mult.premioFestivo) || 0;
            const podePremioFestivo = fest > 0;
            checkboxPremioFestivo.disabled = !podePremioFestivo;
            if (!podePremioFestivo) checkboxPremioFestivo.checked = false;
        }
        if (previewEl) {
            const sab = parseFloat(mult.premioSabado) || 0;
            const dom = parseFloat(mult.premioDomingo) || 0;
            const fest = parseFloat(mult.premioFestivo) || 0;
            const bfh = parseFloat(mult.bonusOTForaHora) || 0;
            const bfhTipo = mult.bonusOTForaHoraTipo || 'valor';
            const bfhLabel = bfh > 0
                ? ` | ⏱️ Fora Hora: ${bfhTipo === 'valor' ? '€' + bfh.toFixed(2) : (bfhTipo === 'percentagem' ? bfh + '%' : bfh + 'x')}`
                : '';
            previewEl.innerHTML = `Valores: Sáb €${sab.toFixed(2)} | Dom €${dom.toFixed(2)} | Bônus €${fest.toFixed(2)}${bfhLabel}`;
        }
    }
}

// ── Registar callbacks de sync NO TOPO (fora do DOMContentLoaded) ────────────
// O módulo syncFirebase.js (type="module") aguarda window.__syncCallbacks.
// Tem de existir ANTES do módulo correr — não pode estar dentro do DOMContentLoaded
// porque a ordem de execução entre módulos e DOMContentLoaded é imprevisível.
window.__syncCallbacks = {
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
            if (typeof popularSelectsServicos === 'function') popularSelectsServicos();
            if (typeof recarregarServicos === 'function') recarregarServicos();
            // Recarregar tipos de trabalho e serviços após sync remoto
            if (typeof carregarTiposTrabalho === 'function') carregarTiposTrabalho();
            if (typeof popularTodosServicos === 'function') popularTodosServicos();
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
            if (!st.explicit) {
                const hasCached = !!localStorage.getItem('__syncSessionUid');
                if (hasCached) return;
            }
            try { localStorage.removeItem('__syncSessionUid'); localStorage.removeItem('__syncSessionEmail'); } catch {}
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
};
// ─────────────────────────────────────────────────────────────────────────────

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
    carregarTiposTrabalho();
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

    // Evitar que a tecla Enter em campos de texto submeta o formulário automaticamente
    // (ex: leitor de código de barras que envia Enter no final da leitura)
    const formOT = document.getElementById('formOT');
    if (formOT) {
        formOT.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA' && e.target.tagName !== 'BUTTON') {
                e.preventDefault();
            }
        });
    }
}); // fim DOMContentLoaded


function getHojeISO() {
    return getDataISO(new Date());
}

function sincronizarDataOTComDispositivo() {
    const campo = document.getElementById('dataOT');
    if (!campo) return;

    // Preencher SEMPRE com hoje ao iniciar (não apenas se vazio)
    // Assim fica sincronizado com o dispositivo ao abrir o formulário
    campo.value = getHojeISO();

    // Bloquear datas futuras (data do dispositivo é o máximo)
    campo.max = getHojeISO();

    // Reaplicar estado do festivo quando mudar a data
    // Permite datas retroativas: só bloqueia datas futuras
    campo.addEventListener('change', function() {
        const hojeAgora = getHojeISO();
        if (campo.value && campo.value > hojeAgora) {
            campo.value = hojeAgora;
        }
        campo.max = hojeAgora;
        atualizarUIFestivoPorDia();
    });

    // Se virar o dia com o app aberto, atualiza apenas o atributo max.
    // NÃO sobrescreve o valor — o utilizador pode estar a preencher uma data retroativa.
    setInterval(function() {
        const hojeAgora = getHojeISO();
        if (campo.max !== hojeAgora) campo.max = hojeAgora;
        // Só preenche se o campo estiver mesmo vazio
        if (!campo.value) {
            campo.value = hojeAgora;
            atualizarUIFestivoPorDia();
        }
    }, 60 * 1000);
}

// ==================== CONFIGURAÇÃO DO VEÍCULO ====================
function salvarConfiguracaoVeiculo() {
    const consumoInformado = parseFloat(document.getElementById('consumoCarro').value);
    const config = {
        modelo: document.getElementById('modeloCarro').value || '',
        consumo: (consumoInformado > 0) ? consumoInformado : 0
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
            document.getElementById('consumoCarro').value = (parseFloat(dados.consumo) > 0) ? dados.consumo : '';
        }
    } else {
        // Sem valor padrão: utilizador deve configurar o consumo
        if (document.getElementById('consumoCarro')) {
            document.getElementById('consumoCarro').value = '';
        }
    }
}

function obterConsumoConfigurado() {
    const config = localStorage.getItem('configuracaoVeiculo');
    if (config) {
        const dados = JSON.parse(config);
        return parseFloat(dados.consumo) || 0;
    }
    return 0;
}

function obterModeloVeiculoConfigurado() {
    const config = localStorage.getItem('configuracaoVeiculo');
    if (config) {
        const dados = JSON.parse(config);
        return dados.modelo || '';
    }
    return '';
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

    // Se está editando, obter OT original (usado em preservação de valores)
    const otOriginal = otEmEdicao ? ordensTrabalho.find(o => o.id === otEmEdicao) : null;
    
    // Valores base sem multiplicador
    // Em edição: se o serviço não mudou, preservar valor/pontos originais da OT
    // para evitar alterações inesperadas quando a tabela de serviços muda.
    const codigoServicoSelecionado = servicoInfo ? servicoInfo.item : (tipoServico || '-');
    const servicoMantidoNaEdicao = !!(otOriginal && codigoServicoSelecionado === otOriginal.tipoServico);

    let valorServicoBase = 0;
    let pontosServicoBase = 0;

    if (servicoMantidoNaEdicao) {
        valorServicoBase = parseFloat(otOriginal?.valorServicoBase);
        if (isNaN(valorServicoBase)) valorServicoBase = parseFloat(otOriginal?.valorServico) || 0;
        pontosServicoBase = parseFloat(otOriginal?.pontosServico) || 0;
    } else {
        valorServicoBase = servicoInfo ? (parseFloat(servicoInfo.valor) || 0) : 0;
        pontosServicoBase = servicoInfo ? (parseFloat(servicoInfo.pontos) || 0) : 0;
    }
    
    // Valor total com multiplicador (usar 0 se o campo mostrar "0.00" — não ignorar zero)
    const _valorTotalStr = document.getElementById('valorTotal').value;
    const valorTotalFinal = (_valorTotalStr !== '' && !isNaN(parseFloat(_valorTotalStr)))
        ? parseFloat(_valorTotalStr)
        : (valorServicoBase + valorAdicionalBase);

    // Checkboxes de prémios de saída
    const checkboxSabado = document.getElementById('otSabado');
    const checkboxDomingo = document.getElementById('otDomingo');
    const checkboxFestivo = document.getElementById('otFestivo');
    const checkboxPremioFestivo = document.getElementById('otPremioFestivo');
    const checkboxForaHora = document.getElementById('otForaHora');
    
    const dataFormEl = document.getElementById('dataOT');
    const dataOTISO = (dataFormEl && dataFormEl.value) ? dataFormEl.value : getDataISO();
    const hojeISO = dataOTISO;
    
    const permitirAplicarHoje = otEmEdicao ? true : !premioJaAplicadoNoDia(hojeISO);
    
    // Verificar dia da semana
    const dataOTDate = new Date(dataOTISO + 'T12:00:00');
    const diaSemana = dataOTDate.getDay(); // 0=domingo, 6=sábado
    
    // Calcular prémios baseado nos checkboxes (só aplica se permitido)
    const marcadoSabado = !!(checkboxSabado && checkboxSabado.checked);
    const marcadoDomingo = !!(checkboxDomingo && checkboxDomingo.checked);
    const marcadoFestivo = !!(checkboxFestivo && checkboxFestivo.checked);
    const marcadoPremioFestivo = !!(checkboxPremioFestivo && checkboxPremioFestivo.checked);
    const marcadoForaHora = !!(checkboxForaHora && checkboxForaHora.checked);
    
    let premioSabadoAplicado = 0;
    let premioDomingoAplicado = 0;
    let premioFestivoAplicado = 0;
    let bonusForaHoraAplicado = 0;
    
    if (permitirAplicarHoje) {
        if (marcadoSabado) {
            premioSabadoAplicado = parseFloat(mult?.premioSabado) || 0;
        }
        if (marcadoDomingo) {
            premioDomingoAplicado = parseFloat(mult?.premioDomingo) || 0;
        }
        if (marcadoPremioFestivo) {
            premioFestivoAplicado = parseFloat(mult?.premioFestivo) || 0;
        }
    }

    // Bônus por OT Fora de Hora — aplica por OT (sem restrição de 1x por dia)
    if (marcadoForaHora) {
        const bfhValor = parseFloat(mult?.bonusOTForaHora) || 0;
        const bfhTipo = mult?.bonusOTForaHoraTipo || 'valor';
        if (bfhValor > 0) {
            if (bfhTipo === 'valor') {
                bonusForaHoraAplicado = bfhValor;
            } else if (bfhTipo === 'percentagem') {
                bonusForaHoraAplicado = valorTotalFinal * bfhValor / 100;
            } else if (bfhTipo === 'multiplicador') {
                bonusForaHoraAplicado = valorTotalFinal * bfhValor;
            }
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
            const otAtualizada = {
                ...ordensTrabalho[index],
                data: dataOTISO + 'T00:00:00',
                numeroOT: numeroOT || '-',
                tipoServico: servicoInfo ? servicoInfo.item : (otOriginal?.tipoServico || tipoServico || '-'),
                categoria: categoriaSelecionada,
                rede: servicoInfo ? servicoInfo.red : (otOriginal?.rede || ''),
                tipologia: servicoInfo ? servicoInfo.tipologia : (otOriginal?.tipologia || ''),
                adicional: adicionaisTexto,
                adicionais: [...adicionaisTemp], // Array completo de adicionais
                valorAdicional: valorAdicionalBase,
                valorServicoBase: valorServicoBase, // Valor base do serviço (sem adicionais/multiplicador)
                pontosServico: pontosServicoBase,
                pontosAdicional: pontosAdicionalBase,
                multiplicador: tipoMultiplicador,
                valorMultiplicador: valorMultiplicador,
                otSabado: marcadoSabado,
                otDomingo: marcadoDomingo,
                otFestivo: marcadoFestivo,
                otPremioFestivo: marcadoPremioFestivo,
                otForaHora: marcadoForaHora,
                premioSabadoAplicado: marcadoSabado ? premioSabadoAplicado : 0,
                premioDomingoAplicado: marcadoDomingo ? premioDomingoAplicado : 0,
                premioFestivoAplicado: marcadoPremioFestivo ? premioFestivoAplicado : 0,
                bonusForaHoraAplicado: marcadoForaHora ? bonusForaHoraAplicado : 0,
                diaSemana: diaSemana,
                equipamentos: [...equipamentosTemp],
                tipoTrabalho: document.getElementById('tipoTrabalho').value || '-',
                observacoes: document.getElementById('observacoes').value || '',
                valorServico: valorTotalFinal
            };
            ordensTrabalho[index] = otAtualizada;
            
            salvarDados();

            // Sincronizar histórico para refletir mudanças em relatórios/consultas
            removerOTDoHistorico(otAtualizada.id);
            garantirOTNoHistorico(otAtualizada);
            salvarHistoricoOT();
            
            // Se removeu prémios, limpar do registro do dia (para PDF)
            if (dataAntigaISO) {
                limparPremiosDoDiaSeNaoExistirMaisOT(dataAntigaISO);
            }
            // Também verificar a nova data se mudou
            if (dataOTISO !== dataAntigaISO) {
                limparPremiosDoDiaSeNaoExistirMaisOT(dataOTISO);
            }

            // Regravar prémio do dia conforme o estado atual da OT editada
            if (premioTotalAplicado > 0) {
                setPremioNoDiaSeMaior(dataOTISO, premioTotalAplicado, otAtualizada.data);
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
        valorServicoBase: valorServicoBase, // Valor base do serviço (sem adicionais/multiplicador)
        pontosServico: pontosServicoBase,
        pontosAdicional: pontosAdicionalBase,
        multiplicador: tipoMultiplicador,
        valorMultiplicador: valorMultiplicador,
        // Flags de prémios
        otSabado: (marcadoSabado && permitirAplicarHoje),
        otDomingo: (marcadoDomingo && permitirAplicarHoje),
        otFestivo: (marcadoFestivo && permitirAplicarHoje),
        otPremioFestivo: (marcadoPremioFestivo && permitirAplicarHoje),
        otForaHora: marcadoForaHora,
        // Valores dos prémios aplicados
        premioSabadoAplicado: premioSabadoAplicado,
        premioDomingoAplicado: premioDomingoAplicado,
        premioFestivoAplicado: premioFestivoAplicado,
        bonusForaHoraAplicado: bonusForaHoraAplicado,
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
    // Repor data com hoje (o reset() limpa o campo de data)
    const campoData = document.getElementById('dataOT');
    if (campoData) campoData.value = getHojeISO();
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
    const checkboxPremioFestivo = document.getElementById('otPremioFestivo');
    const checkboxForaHora = document.getElementById('otForaHora');
    if (checkboxSabado) checkboxSabado.checked = false;
    if (checkboxDomingo) checkboxDomingo.checked = false;
    if (checkboxFestivo) checkboxFestivo.checked = false;
    if (checkboxPremioFestivo) checkboxPremioFestivo.checked = false;
    if (checkboxForaHora) checkboxForaHora.checked = false;
    
    // Esconder badges
    const badgeSabado = document.getElementById('badgeSabado');
    const badgeDomingo = document.getElementById('badgeDomingo');
    const badgeFestivo = document.getElementById('badgeFestivo');
    const badgeBonus = document.getElementById('badgeBonus');
    const badgeForaHora = document.getElementById('badgeForaHora');
    if (badgeSabado) badgeSabado.style.display = 'none';
    if (badgeDomingo) badgeDomingo.style.display = 'none';
    if (badgeFestivo) badgeFestivo.style.display = 'none';
    if (badgeBonus) badgeBonus.style.display = 'none';
    if (badgeForaHora) badgeForaHora.style.display = 'none';

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
        atualizarOpcoesFiltroCategoria();
    } else {
        console.error('Sistema de serviços customizados não carregado!');
    }
}

function atualizarOpcoesFiltroCategoria() {
    const filtroEl = document.getElementById('filtroCategoria');
    if (!filtroEl) return;

    const valorAtual = filtroEl.value;
    const categoriasOT = (ordensTrabalho || []).map(o => o.categoria).filter(Boolean);

    let categoriasServicos = [];
    if (typeof carregarServicosCustomizados === 'function') {
        categoriasServicos = carregarServicosCustomizados().map(s => s.categoria).filter(Boolean);
    }

    const categorias = [...new Set([...categoriasServicos, ...categoriasOT])]
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b, 'pt-BR'));

    filtroEl.innerHTML = '<option value="">Todas Categorias</option>';
    categorias.forEach(cat => {
        const opt = document.createElement('option');
        opt.value = cat;
        opt.textContent = cat;
        filtroEl.appendChild(opt);
    });

    if (valorAtual && categorias.includes(valorAtual)) {
        filtroEl.value = valorAtual;
    }
}

// Carrega os tipos de trabalho do localStorage (padrão + personalizados) no select #tipoTrabalho
function carregarTiposTrabalho() {
    const select = document.getElementById('tipoTrabalho');
    if (!select) return;

    const PADRAO = [
        { id: 'instalacao', nome: 'Instalação' },
        { id: 'avaria',     nome: 'Avaria' },
        { id: 'migracao',   nome: 'Migração' }
    ];

    let tipos = PADRAO;
    try {
        const saved = localStorage.getItem('tiposTrabalhoCustom');
        if (saved) {
            const arr = JSON.parse(saved);
            if (arr && arr.length > 0) tipos = arr;
        }
    } catch { tipos = PADRAO; }

    const valorAtual = select.value;
    select.innerHTML = '<option value="">Selecione...</option>';
    tipos.forEach(t => {
        const opt = document.createElement('option');
        opt.value = t.id;
        opt.textContent = t.nome;
        select.appendChild(opt);
    });
    // Restaurar valor se ainda existir
    if (valorAtual) select.value = valorAtual;
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
        const checkboxForaHora = document.getElementById('otForaHora');
        const badgeForaHora = document.getElementById('badgeForaHora');
        if (badgeForaHora) {
            badgeForaHora.style.display = (checkboxForaHora && checkboxForaHora.checked) ? 'inline-flex' : 'none';
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
        option.textContent = `${servico.tipologia}`;
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
                const tipoAssociado = String(servico.tipoTrabalho || '').trim();

                // 1) Prioridade: tipo associado no serviço (Opções)
                if (tipoAssociado) {
                    const norm = (s) => String(s || '')
                        .normalize('NFD')
                        .replace(/[\u0300-\u036f]/g, '')
                        .toLowerCase()
                        .trim();

                    const opts = Array.from(selectTipoTrabalho.options || []);
                    const nAssoc = norm(tipoAssociado);

                    let opt = opts.find(o => o.value === tipoAssociado);
                    if (!opt) {
                        opt = opts.find(o => norm(o.value) === nAssoc || norm(o.textContent).includes(nAssoc));
                    }

                    if (opt) {
                        selectTipoTrabalho.value = opt.value;
                    }
                } else {
                    // 2) Fallback: inferência por código/descrição (retrocompatibilidade)
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
    atualizarOpcoesFiltroCategoria();
    
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
        const isBonus = ot.otPremioFestivo === true || (parseFloat(ot.premioFestivoAplicado) || 0) > 0;
        const isForaHora = ot.otForaHora === true;
        let badgeDia = '';
        if (isFestivo) {
            badgeDia = '<span style="background:#9c27b0;color:#fff;padding:2px 6px;border-radius:4px;font-size:10px;margin-left:5px;">🎉 FESTIVO</span>';
        }
        if (isBonus) {
            badgeDia += '<span style="background:#8e44ad;color:#fff;padding:2px 6px;border-radius:4px;font-size:10px;margin-left:5px;">🎁 BÔNUS</span>';
        }
        if (diaSemana === 0) {
            badgeDia += '<span style="background:#e91e63;color:#fff;padding:2px 6px;border-radius:4px;font-size:10px;margin-left:5px;">DOM</span>';
        } else if (diaSemana === 6) {
            badgeDia += '<span style="background:#ff9800;color:#fff;padding:2px 6px;border-radius:4px;font-size:10px;margin-left:5px;">SÁB</span>';
        }
        if (isForaHora) {
            badgeDia += '<span style="background:#2196f3;color:#fff;padding:2px 6px;border-radius:4px;font-size:10px;margin-left:5px;">⏱️ FORA HORA</span>';
        }

        // Mostrar tipo de trabalho com serviço e categoria como subtexto
        const tipoLabel = formatarTipoTrabalho(ot.tipoTrabalho);
        const tipoCell = tipoLabel || '-';

        // Coluna "Tipo de Serviço": tipologia/descrição do serviço
        const tipologiaTexto = ot.tipologia || '-';
        const servicoCell = `<small>${tipologiaTexto}</small>`;
        
        tr.innerHTML = `
            <td>${data.toLocaleDateString('pt-BR')}${badgeDia}</td>
            <td><strong>${ot.numeroOT}</strong></td>
            <td>${tipoCell}</td>
            <td><small>${ot.adicional ? ot.adicional : '-'}</small></td>
            <td>${servicoCell}</td>
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
    const fixos = {
        'instalacao': '🔧 Instalação',
        'avaria': '⚙️ Avaria',
        'manutencao': '⚙️ Avaria', // compatibilidade com registros antigos
        'migracao': '🔄 Migração'
    };
    if (fixos[tipo]) return fixos[tipo];
    // Verificar nos tipos personalizados guardados
    try {
        const saved = localStorage.getItem('tiposTrabalhoCustom');
        if (saved) {
            const arr = JSON.parse(saved);
            const encontrado = arr && arr.find(t => t.id === tipo || t.nome === tipo);
            if (encontrado) return '🏷️ ' + encontrado.nome;
        }
    } catch {}
    return tipo || '-';
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
            
            // Verificar se tem algum prémio em € aplicado neste dia
            const temSabado = (parseFloat(ot.premioSabadoAplicado) || 0) > 0 || ot.otSabado;
            const temDomingo = (parseFloat(ot.premioDomingoAplicado) || 0) > 0 || ot.otDomingo;
            const temFestivo = (parseFloat(ot.premioFestivoAplicado) || 0) > 0 || ot.otPremioFestivo;
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
    document.getElementById('observacoes').value = ot.observacoes || '';

    // Tipo de Trabalho: garantir que o select está populado antes de atribuir
    const selectTipoTrab = document.getElementById('tipoTrabalho');
    if (selectTipoTrab) {
        carregarTiposTrabalho();
        selectTipoTrab.value = ot.tipoTrabalho || '';
    }

    // Tipo de Serviço: garantir que o select está populado antes de atribuir
    // (pode estar vazio se a página acabou de carregar)
    const valorServicoEl = document.getElementById('valorServico');
    const selectServico = document.getElementById('tipoServico');
    if (selectServico) {
        if (selectServico.options.length <= 1) {
            // Popular selects se ainda estiverem vazios
            if (typeof popularTodosServicos === 'function') popularTodosServicos();
        }
        // As options têm value = JSON.stringify({item, tipologia, ...})
        // ot.tipoServico guarda apenas o código (ex: "INST01")
        // Procurar a option cujo item corresponde ao código guardado
        let encontrou = false;
        for (let i = 0; i < selectServico.options.length; i++) {
            const opt = selectServico.options[i];
            if (!opt.value) continue;
            try {
                const svc = JSON.parse(opt.value);
                if (svc.item === ot.tipoServico) {
                    selectServico.selectedIndex = i;
                    encontrou = true;
                    break;
                }
            } catch (e) { /* ignorar options inválidas */ }
        }
        if (!encontrou) selectServico.value = '';
        // Disparar evento change para atualizar valor/categoria
        selectServico.dispatchEvent(new Event('change'));
        // Se o serviço não foi encontrado no select, restaurar o valor base guardado
        if (!encontrou && valorServicoEl) {
            const baseGuardado = (ot.valorServicoBase !== undefined) ? ot.valorServicoBase : 0;
            if (ot.valorServicoBase === undefined) {
                console.warn('[editarOT] valorServicoBase não guardado na OT id=' + ot.id + '; usando 0 como fallback.');
            }
            valorServicoEl.value = baseGuardado.toFixed(2);
        }
    }
    
    // Categoria
    const categoriaEl = document.getElementById('categoriaServico');
    if (categoriaEl) categoriaEl.value = ot.categoria || '';
    
    // Valor total (usa o valor total guardado na OT)
    const valorTotalEl = document.getElementById('valorTotal');
    if (valorTotalEl) valorTotalEl.value = (ot.valorServico !== undefined && ot.valorServico !== null) ? ot.valorServico.toFixed(2) : '';
    
    // Multiplicador
    const multiplicadorEl = document.getElementById('multiplicadorServico');
    if (multiplicadorEl) multiplicadorEl.value = ot.multiplicador || 'normal';
    
    // Checkboxes de prémios
    const checkSabado = document.getElementById('otSabado');
    const checkDomingo = document.getElementById('otDomingo');
    const checkFestivo = document.getElementById('otFestivo');
    const checkPremioFestivo = document.getElementById('otPremioFestivo');
    const checkForaHora = document.getElementById('otForaHora');
    if (checkSabado) checkSabado.checked = !!ot.otSabado;
    if (checkDomingo) checkDomingo.checked = !!ot.otDomingo;
    if (checkFestivo) checkFestivo.checked = !!ot.otFestivo;
    if (checkPremioFestivo) checkPremioFestivo.checked = !!(ot.otPremioFestivo || (parseFloat(ot.premioFestivoAplicado) || 0) > 0);
    if (checkForaHora) checkForaHora.checked = !!ot.otForaHora;
    
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

function obterDescontoPercentual() {
    try {
        const mult = JSON.parse(localStorage.getItem('multiplicadores') || '{}');
        return parseFloat(mult.descontoPercentual) || 0;
    } catch { return 0; }
}

function aplicarDesconto(valor) {
    const pct = obterDescontoPercentual();
    if (!pct) return valor;
    return valor * (1 - pct / 100);
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

    const descPct = obterDescontoPercentual();
    const valorDiaLiquido = aplicarDesconto(valorDia);
    const valorMesLiquido = aplicarDesconto(valorMes);
    
    document.getElementById('qtdDia').textContent = otsDia.length;
    if (descPct > 0) {
        document.getElementById('valorDia').innerHTML =
            `€ ${valorDia.toFixed(2)} | ${pontosDia.toFixed(1)} pts` +
            `<br><small style="color:rgba(255,255,255,0.85);font-size:11px;">Líquido (-${descPct}%): € ${valorDiaLiquido.toFixed(2)}</small>`;
    } else {
        document.getElementById('valorDia').textContent = `€ ${valorDia.toFixed(2)} | ${pontosDia.toFixed(1)} pts`;
    }
    document.getElementById('qtdMes').textContent = otsMes.length;
    if (descPct > 0) {
        document.getElementById('valorMes').innerHTML =
            `€ ${valorMes.toFixed(2)} | ${pontosMes.toFixed(1)} pts` +
            `<br><small style="color:rgba(255,255,255,0.85);font-size:11px;">Líquido (-${descPct}%): € ${valorMesLiquido.toFixed(2)}</small>`;
    } else {
        document.getElementById('valorMes').textContent = `€ ${valorMes.toFixed(2)} | ${pontosMes.toFixed(1)} pts`;
    }
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
            const isBonus = ot.otPremioFestivo === true || (parseFloat(ot.premioFestivoAplicado) || 0) > 0;
            
            switch (diaSemanaFiltro) {
                case 'sabado':
                    return diaSemana === 6;
                case 'domingo':
                    return diaSemana === 0;
                case 'bonus':
                    return isBonus;
                case 'festivo':
                    return isFestivo;
                case 'fds': // Fins de semana (Sábado + Domingo)
                    return diaSemana === 0 || diaSemana === 6;
                case 'especial': // Todos especiais (Sáb + Dom + Festivo)
                    return diaSemana === 0 || diaSemana === 6 || isFestivo || isBonus;
                case 'foraHora': // OT Fora de Hora
                    return ot.otForaHora === true;
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
        const isBonus = ot.otPremioFestivo === true || (parseFloat(ot.premioFestivoAplicado) || 0) > 0;
        const isForaHora = ot.otForaHora === true;
        let badgeDia = '';
        if (isFestivo) {
            badgeDia = '<span style="background:#9c27b0;color:#fff;padding:2px 6px;border-radius:4px;font-size:10px;margin-left:5px;">🎉 FESTIVO</span>';
        }
        if (isBonus) {
            badgeDia += '<span style="background:#8e44ad;color:#fff;padding:2px 6px;border-radius:4px;font-size:10px;margin-left:5px;">🎁 BÔNUS</span>';
        }
        if (diaSemana === 0) {
            badgeDia += '<span style="background:#e91e63;color:#fff;padding:2px 6px;border-radius:4px;font-size:10px;margin-left:5px;">DOM</span>';
        } else if (diaSemana === 6) {
            badgeDia += '<span style="background:#ff9800;color:#fff;padding:2px 6px;border-radius:4px;font-size:10px;margin-left:5px;">SÁB</span>';
        }
        if (isForaHora) {
            badgeDia += '<span style="background:#2196f3;color:#fff;padding:2px 6px;border-radius:4px;font-size:10px;margin-left:5px;">⏱️ FORA HORA</span>';
        }

        const tipoLabel = formatarTipoTrabalho(ot.tipoTrabalho);
        const tipoCell = tipoLabel || '-';

        const tipologiaTexto = ot.tipologia || '-';
        const servicoCell = `<small>${tipologiaTexto}</small>`;
        
        tr.innerHTML = `
            <td>${data.toLocaleDateString('pt-BR')}${badgeDia}</td>
            <td><strong>${ot.numeroOT}</strong></td>
            <td>${tipoCell}</td>
            <td><small>${ot.adicional ? ot.adicional : '-'}</small></td>
            <td>${servicoCell}</td>
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
        const tipoCell = tipoLabel || '-';

        const tipologiaTexto = ot.tipologia || '-';
        const servicoCell = `<small>${tipologiaTexto}</small>`;

        const diaSemana = data.getDay();
        const isFestivo = ot.otFestivo === true;
        const isForaHora = ot.otForaHora === true;
        let badgeDia = '';
        if (isFestivo) {
            badgeDia = '<span style="background:#9c27b0;color:#fff;padding:2px 6px;border-radius:4px;font-size:10px;margin-left:5px;">🎉 FESTIVO</span>';
        } else if (diaSemana === 0) {
            badgeDia = '<span style="background:#e91e63;color:#fff;padding:2px 6px;border-radius:4px;font-size:10px;margin-left:5px;">DOM</span>';
        } else if (diaSemana === 6) {
            badgeDia = '<span style="background:#ff9800;color:#fff;padding:2px 6px;border-radius:4px;font-size:10px;margin-left:5px;">SÁB</span>';
        }
        if (isForaHora) {
            badgeDia += '<span style="background:#2196f3;color:#fff;padding:2px 6px;border-radius:4px;font-size:10px;margin-left:5px;">⏱️ FORA HORA</span>';
        }
        
        tr.innerHTML = `
            <td>${data.toLocaleDateString('pt-BR')}${badgeDia}</td>
            <td><strong>${ot.numeroOT}</strong></td>
            <td>${tipoCell}</td>
            <td><small>${ot.adicional ? ot.adicional : '-'}</small></td>
            <td>${servicoCell}</td>
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
    // Fonte de verdade: dados atuais em memória + filtros ativos na UI.
    // Evita divergências quando a tabela HTML não refletiu 100% alguma alteração.
    const mesInput = document.getElementById('filtroMes')?.value || '';
    const categoria = document.getElementById('filtroCategoria')?.value || '';
    const diaSemanaFiltro = document.getElementById('filtroDiaSemana')?.value || '';
    const termoMAC = (document.getElementById('pesquisaMAC')?.value || '').toLowerCase().trim();

    const mes = mesInput || getMesAtualISO();
    let otsFiltradas = Array.isArray(ordensTrabalho) ? [...ordensTrabalho] : [];

    // Filtro por mês (padrão mês atual)
    otsFiltradas = otsFiltradas.filter(ot => {
        const dataOT = new Date(ot.data);
        const mesAno = `${dataOT.getFullYear()}-${String(dataOT.getMonth() + 1).padStart(2, '0')}`;
        return mesAno === mes;
    });

    // Filtro por categoria
    if (categoria) {
        otsFiltradas = otsFiltradas.filter(ot => ot.categoria === categoria);
    }

    // Filtro por dia da semana / tipo especial
    if (diaSemanaFiltro) {
        otsFiltradas = otsFiltradas.filter(ot => {
            const dataOT = new Date(ot.data);
            const diaSemana = dataOT.getDay();
            const isFestivo = ot.otFestivo === true;
            const isBonus = ot.otPremioFestivo === true || (parseFloat(ot.premioFestivoAplicado) || 0) > 0;

            switch (diaSemanaFiltro) {
                case 'sabado':
                    return diaSemana === 6;
                case 'domingo':
                    return diaSemana === 0;
                case 'bonus':
                    return isBonus;
                case 'festivo':
                    return isFestivo;
                case 'fds':
                    return diaSemana === 0 || diaSemana === 6;
                case 'especial':
                    return diaSemana === 0 || diaSemana === 6 || isFestivo || isBonus;
                case 'foraHora':
                    return ot.otForaHora === true;
                default:
                    return true;
            }
        });
    }

    // Filtro por pesquisa MAC (quando ativo)
    if (termoMAC) {
        otsFiltradas = otsFiltradas.filter(ot => {
            if (ot.equipamentos && ot.equipamentos.length > 0) {
                return ot.equipamentos.some(eq => {
                    const codigo = typeof eq === 'string' ? eq : eq.mac;
                    return (codigo || '').toLowerCase().includes(termoMAC);
                });
            }
            if (ot.macEquipamento) {
                return ot.macEquipamento.toLowerCase().includes(termoMAC);
            }
            return false;
        });
    }

    return otsFiltradas;
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

function normalizarTextoPDF(valor) {
    if (valor === undefined || valor === null) return '';
    return String(valor)
        .replace(/[•·]/g, '-')
        .replace(/[\u{1F300}-\u{1FAFF}]/gu, '')
        .replace(/[^\x20-\x7EÀ-ÿ€]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function formatarEuroPDF(valor) {
    const n = parseFloat(valor) || 0;
    return `€ ${n.toFixed(2).replace('.', ',')}`;
}

function gerarPDF(comDesconto = false) {
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
        'bonus': 'Bônus',
        'festivo': 'Festivos',
        'fds': 'Fins de Semana',
        'especial': 'Dias Especiais (Sáb+Dom+Festivo+Bônus)',
        'foraHora': 'OT Fora de Hora'
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
    
    // Tabela — espelha exactamente o que está visível em "Ordens de Trabalho"
    const tableData = otsMes.map(ot => {
        // Equipamentos (omitir coluna se todos vazios — tratado depois com hasEquip)
        const equipamentosRaw = (ot.equipamentos && ot.equipamentos.length > 0)
            ? ot.equipamentos.map(eq => (typeof eq === 'string') ? eq : (eq.mac || '')).filter(Boolean).join(', ')
            : (ot.macEquipamento || '');
        const equipamentos = normalizarTextoPDF(equipamentosRaw);

        // Adicionais
        const adicionaisTexto = (ot.adicionais && ot.adicionais.length > 0)
            ? ot.adicionais.map(a => {
                const nome = normalizarTextoPDF(typeof a === 'string' ? a : (a.nome || a.descricao || ''));
                const valNum = (typeof a === 'object') ? (parseFloat(a.valor) || 0) : 0;
                                const val = valNum > 0 ? ` ${formatarEuroPDF(valNum)}` : '';
                return `${nome}${val}`.trim();
              }).filter(Boolean).join(', ')
            : '';

        // Indicador de dia especial
        const dataOT = new Date(ot.data);
        const diaSemana = dataOT.getDay();
        const isFestivo = ot.otFestivo === true;
        let diaIndicador = '';
        if (isFestivo) diaIndicador = ' (FEST)';
        else if (diaSemana === 0) diaIndicador = ' (DOM)';
        else if (diaSemana === 6) diaIndicador = ' (SAB)';

        // Tipo de Trabalho + Tipo de Serviço (espelha as duas colunas da tabela)
        const tipoTrabalhoTexto = normalizarTextoPDF(formatarTipoTrabalho(ot.tipoTrabalho).replace(/[🔧⚙️📦🔌]/g, '').trim());
        const tipoServicoTexto  = normalizarTextoPDF(ot.tipologia || ot.tipoServico || '-');

        return {
            data:        dataOT.toLocaleDateString('pt-BR') + diaIndicador,
            ot:          normalizarTextoPDF(ot.numeroOT || '-'),
            tipoTrab:    tipoTrabalhoTexto || '-',
            tipoServ:    tipoServicoTexto,
            adicionais:  adicionaisTexto,
            equipamentos,
            observacoes: normalizarTextoPDF(ot.observacoes || ''),
            valor:       formatarEuroPDF(ot.valorServico)
        };
    });

    // Verificar se alguma OT tem equipamentos ou observações (só incluir colunas se existirem dados)
    const hasEquip  = tableData.some(r => r.equipamentos);
    const hasObs    = tableData.some(r => r.observacoes);
    const hasAdic   = tableData.some(r => r.adicionais);

    // Construir colunas dinâmicas
    const head = ['Data', 'OT', 'Tipo de Trabalho', 'Tipo de Serviço'];
    if (hasAdic)  head.push('Adicionais');
    if (hasEquip) head.push('Equipamentos');
    if (hasObs)   head.push('Observações');
    head.push('Valor');

    const body = tableData.map(r => {
        const row = [r.data, r.ot, r.tipoTrab, r.tipoServ];
        if (hasAdic)  row.push(r.adicionais);
        if (hasEquip) row.push(r.equipamentos);
        if (hasObs)   row.push(r.observacoes);
        row.push(r.valor);
        return row;
    });

    // Larguras das colunas (total ~270mm em landscape A4)
    const colWidths = {};
    let col = 0;
    colWidths[col++] = { cellWidth: 24 }; // Data
    colWidths[col++] = { cellWidth: 22 }; // OT
    colWidths[col++] = { cellWidth: 30 }; // Tipo de Trabalho
    colWidths[col++] = { cellWidth: 50 }; // Tipo de Serviço
    if (hasAdic)  colWidths[col++] = { cellWidth: 40 }; // Adicionais
    if (hasEquip) colWidths[col++] = { cellWidth: 40 }; // Equipamentos
    if (hasObs)   colWidths[col++] = { cellWidth: 50 }; // Observações
    colWidths[col++] = { cellWidth: 22, fontStyle: 'bold' }; // Valor
    
    if (temAutoTable) {
        doc.autoTable({
            startY: filtrosTexto.length > 0 ? 40 : 35,
            head: [head],
            body,
            theme: 'striped',
            headStyles: { fillColor: [102, 126, 234] },
            styles: { fontSize: 8, overflow: 'linebreak', cellPadding: 2 },
            columnStyles: colWidths
        });
    } else {
        doc.setFontSize(10);
        doc.text('Tabela não suportada neste dispositivo (autoTable indisponível).', 14, filtrosTexto.length > 0 ? 44 : 38);
    }
    
    // Resumo
    const totalValor = otsMes.reduce((sum, ot) => sum + ot.valorServico, 0);
    
    // PRÉMIOS DE SAÍDA: Sábado, Domingo e Festivo (1x por dia)
    // Coletar prémios por dia (apenas 1x por dia, como nas OTs)
    const premiosSaidaPorDia = {};
    otsMes.forEach(ot => {
        const dataISO = getDataISO(ot.data);

        const premioSab = parseFloat(ot.premioSabadoAplicado) || 0;
        const premioDom = parseFloat(ot.premioDomingoAplicado) || 0;
        const premioFest = parseFloat(ot.premioFestivoAplicado) || 0;
        const totalDia = premioSab + premioDom + premioFest;

        const tipoPremio = (premioSab > 0)
            ? 'Sáb'
            : (premioDom > 0)
                ? 'Dom'
                : (premioFest > 0 && ot.otFestivo)
                    ? 'Festivo + Bônus'
                    : (premioFest > 0)
                        ? 'Bônus'
                        : '';

        if (!(totalDia > 0)) return;

        const atual = premiosSaidaPorDia[dataISO];
        if (!atual || totalDia >= (atual.total || 0)) {
            premiosSaidaPorDia[dataISO] = {
                sabado: premioSab,
                domingo: premioDom,
                festivo: premioFest,
                total: totalDia,
                tipo: tipoPremio
            };
        }
    });
    
    const diasPremio = Object.keys(premiosSaidaPorDia).sort();
    const totalPremiosSaida = diasPremio.reduce((sum, d) => sum + (premiosSaidaPorDia[d]?.total || 0), 0);

    // BÔNUS POR OT FORA DE HORA — soma por OT individual
    const totalBonusForaHora = otsMes.reduce((sum, ot) => sum + (parseFloat(ot.bonusForaHoraAplicado) || 0), 0);
    const otsForaHora = otsMes.filter(ot => ot.otForaHora && (parseFloat(ot.bonusForaHoraAplicado) || 0) > 0);
    
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
                formatarEuroPDF(p?.total || 0)
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
                doc.text(`${formatarDataBRFromISODate(d)} (${p?.tipo || '-'}) - ${formatarEuroPDF(p?.total || 0)}`, 14, y);
                y += 5;
            });
            finalY = y;
        }
    } else {
        finalY = finalY + 14;
    }

    // Mostrar bônus OT Fora de Hora se houver
    if (totalBonusForaHora > 0) {
        doc.setFontSize(11);
        doc.setFont(undefined, 'normal');
        doc.text(`⏱️ Bônus Fora de Hora (${otsForaHora.length} OTs): € ${totalBonusForaHora.toFixed(2)}`, 14, finalY + 8);

        const tableForaHora = otsForaHora.map(ot => [
            formatarDataBRFromISODate(getDataISO(ot.data)),
            ot.numeroOT || '-',
            formatarEuroPDF(parseFloat(ot.bonusForaHoraAplicado) || 0)
        ]);

        if (temAutoTable) {
            doc.autoTable({
                startY: finalY + 12,
                head: [['Data', 'OT', 'Bônus Fora Hora']],
                body: tableForaHora,
                theme: 'striped',
                headStyles: { fillColor: [33, 150, 243] },
                styles: { fontSize: 9 },
                columnStyles: {
                    0: { cellWidth: 30 },
                    1: { cellWidth: 30 },
                    2: { cellWidth: 35, fontStyle: 'bold' }
                }
            });
            finalY = doc.lastAutoTable.finalY + 6;
        } else {
            let y = finalY + 14;
            doc.setFontSize(10);
            otsForaHora.forEach(ot => {
                doc.text(`${formatarDataBRFromISODate(getDataISO(ot.data))} OT ${ot.numeroOT || '-'} - ${formatarEuroPDF(parseFloat(ot.bonusForaHoraAplicado) || 0)}`, 14, y);
                y += 5;
            });
            finalY = y;
        }
    }

    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    const valorReceber = totalValor + totalPremiosSaida + totalBonusForaHora;
    if (comDesconto) {
        const descPct = obterDescontoPercentual();
        const valorLiquido = aplicarDesconto(valorReceber);
        doc.text(`VALOR BRUTO: € ${valorReceber.toFixed(2)}`, 14, finalY + 12);
        doc.setFont(undefined, 'normal');
        doc.setFontSize(11);
        doc.text(`Desconto do chefe (${descPct}%): - € ${(valorReceber - valorLiquido).toFixed(2)}`, 14, finalY + 20);
        doc.setFont(undefined, 'bold');
        doc.setFontSize(14);
        doc.text(`VALOR LÍQUIDO A RECEBER: € ${valorLiquido.toFixed(2)}`, 14, finalY + 28);
    } else {
        doc.text(`VALOR A RECEBER: € ${valorReceber.toFixed(2)}`, 14, finalY + 12);
    }
    
    doc.save(`relatorio-ot-${mesAtual}${comDesconto ? '-liquido' : ''}.pdf`);
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

        const premioSab = parseFloat(ot.premioSabadoAplicado) || 0;
        const premioDom = parseFloat(ot.premioDomingoAplicado) || 0;
        const premioFest = parseFloat(ot.premioFestivoAplicado) || 0;
        const totalDia = premioSab + premioDom + premioFest;

        const tipoPremio = (premioSab > 0 || ot.otSabado)
            ? 'Sáb'
            : (premioDom > 0 || ot.otDomingo)
                ? 'Dom'
                : ((premioFest > 0 || ot.otPremioFestivo) && ot.otFestivo)
                    ? 'Festivo + Bônus'
                    : (premioFest > 0 || ot.otPremioFestivo)
                        ? 'Bônus'
                        : (ot.otFestivo ? 'Festivo' : '');

        if (!(totalDia > 0 || ot.otSabado || ot.otDomingo || ot.otFestivo)) return;

        const atual = premiosSaidaPorDia[dataISO];
        if (!atual || totalDia >= (atual.total || 0)) {
            premiosSaidaPorDia[dataISO] = {
                sabado: premioSab,
                domingo: premioDom,
                festivo: premioFest,
                total: totalDia,
                tipo: tipoPremio
            };
        }
    });
    
    const diasPremio = Object.keys(premiosSaidaPorDia).sort();
    const totalPremiosSaida = diasPremio.reduce((sum, d) => sum + (premiosSaidaPorDia[d]?.total || 0), 0);
    const totalBonusForaHora = otsMes.reduce((sum, ot) => sum + (parseFloat(ot.bonusForaHoraAplicado) || 0), 0);
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
    const valorReceber = totalValor + totalPremiosSaida + totalBonusForaHora;
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
let logisticaEmEdicao = null;

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
    const precoPadrao = parseFloat(localStorage.getItem('precoLitroPadrao')) || 0;
    
    // Definir data atual
    const campoData = document.getElementById('dataLogistica');
    if (campoData) {
        campoData.value = hoje;
    }
    
    // Verificar se existe registro do dia atual em andamento
    if (registroDiaAtual && registroDiaAtual.data === hoje) {
        // Restaurar dados do registro em andamento
        document.getElementById('kmInicial').value = registroDiaAtual.kmInicial;
        
        // NÃO preencher hora fim automaticamente - usuário clica no botão quando quiser
        
        // Se tiver abastecimento salvo, restaurar
        if (registroDiaAtual.valorAbastecimento) {
            document.getElementById('valorAbastecimento').value = registroDiaAtual.valorAbastecimento;
        }
        if (registroDiaAtual.precoLitro) {
            document.getElementById('precoLitro').value = registroDiaAtual.precoLitro;
        } else if (precoPadrao > 0) {
            document.getElementById('precoLitro').value = precoPadrao;
        }
        document.getElementById('usarLitrosManual').checked = !!registroDiaAtual.usarLitrosManual;
        if (registroDiaAtual.litrosAbastecidos) {
            document.getElementById('litrosAbastecidos').value = registroDiaAtual.litrosAbastecidos;
        }
        if (registroDiaAtual.observacoes) {
            document.getElementById('observacoesLogistica').value = registroDiaAtual.observacoes;
        }
    } else {
        // Novo dia
        if (precoPadrao > 0) {
            document.getElementById('precoLitro').value = precoPadrao;
        }
        document.getElementById('usarLitrosManual').checked = false;
    }

    atualizarModoLitrosAbastecidos();
    calcularLitrosAbastecidosAutomatico();
    calcularKMRodados();
    calcularConsumo();
}

// Atualizar campo MAC quando scanner detectar código
function atualizarMACScanner(codigo) {
    document.getElementById('macEquipamento').value = codigo;
}

// Salvar dados automaticamente quando houver mudança nos campos importantes
document.getElementById('kmInicial')?.addEventListener('change', salvarRegistroDiaAtual);
document.getElementById('valorAbastecimento')?.addEventListener('change', salvarRegistroDiaAtual);
document.getElementById('precoLitro')?.addEventListener('change', salvarRegistroDiaAtual);
document.getElementById('litrosAbastecidos')?.addEventListener('change', salvarRegistroDiaAtual);
document.getElementById('usarLitrosManual')?.addEventListener('change', salvarRegistroDiaAtual);
document.getElementById('observacoesLogistica')?.addEventListener('input', salvarRegistroDiaAtual);

function salvarRegistroDiaAtual() {
    const hoje = getHojeISO();
    const dataForm = document.getElementById('dataLogistica').value;
    
    // Só salva automaticamente se for o dia atual
    if (dataForm === hoje) {
        registroDiaAtual = {
            data: dataForm,
            kmInicial: parseFloat(document.getElementById('kmInicial').value) || 0,
            valorAbastecimento: parseFloat(document.getElementById('valorAbastecimento').value) || 0,
            precoLitro: parseFloat(document.getElementById('precoLitro').value) || 0,
            usarLitrosManual: !!document.getElementById('usarLitrosManual').checked,
            litrosAbastecidos: parseFloat(document.getElementById('litrosAbastecidos').value) || 0,
            observacoes: document.getElementById('observacoesLogistica').value || ''
        };

        if (registroDiaAtual.precoLitro > 0) {
            localStorage.setItem('precoLitroPadrao', String(registroDiaAtual.precoLitro));
        }
        
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
        document.getElementById('kmInicial').value = '';
        document.getElementById('kmFinal').value = '';
        document.getElementById('valorAbastecimento').value = '';
        document.getElementById('precoLitro').value = '';
        document.getElementById('usarLitrosManual').checked = false;
        document.getElementById('litrosAbastecidos').value = '';
        document.getElementById('observacoesLogistica').value = '';
        atualizarModoLitrosAbastecidos();
        calcularConsumo();
    } else {
        // Voltou para hoje - restaurar registro do dia
        inicializarLogisticaDiaria();
    }
});

// Calcular KM rodados
function parseDecimalInput(val) {
    if (val === undefined || val === null) return 0;
    const texto = String(val).trim();
    if (!texto) return 0;

    if (texto.includes(',') && texto.includes('.')) {
        const normalizado = texto.replace(/\./g, '').replace(',', '.');
        return parseFloat(normalizado) || 0;
    }

    return parseFloat(texto.replace(',', '.')) || 0;
}

function formatarKm(valor) {
    const n = parseFloat(valor) || 0;
    if (Number.isInteger(n)) return String(n);
    return n.toFixed(3).replace(/\.0+$/, '').replace(/(\.\d*?)0+$/, '$1');
}

document.getElementById('kmFinal')?.addEventListener('input', calcularKMRodados);
document.getElementById('kmInicial')?.addEventListener('input', calcularKMRodados);
document.getElementById('kmInicial')?.addEventListener('change', function() {
    const kmInicialAtual = parseDecimalInput(document.getElementById('kmInicial')?.value);
    const dataAtual = document.getElementById('dataLogistica')?.value || getHojeISO();
    if (kmInicialAtual > 0) {
        atualizarRegistroAnteriorPendente(kmInicialAtual, dataAtual, logisticaEmEdicao);
    }
    salvarRegistroDiaAtual();
});

function ordenarRegistrosLogisticaAsc(lista) {
    return [...lista].sort((a, b) => {
        const dataA = String(a.data || '');
        const dataB = String(b.data || '');
        if (dataA === dataB) {
            return (parseInt(a.id, 10) || 0) - (parseInt(b.id, 10) || 0);
        }
        return dataA.localeCompare(dataB);
    });
}

function atualizarRegistroAnteriorPendente(kmInicialAtual, dataAtualISO, registroIgnorarId = null) {
    const consumoPadrao = obterConsumoConfigurado();
    const candidatos = registrosLogistica.filter(reg => {
        const kmIni = parseFloat(reg.kmInicial) || 0;
        const kmFim = parseFloat(reg.kmFinal) || 0;
        const pendente = !(kmFim > kmIni);
        const naoIgnorar = (registroIgnorarId === null || Number(reg.id) !== Number(registroIgnorarId));
        // Só pode fechar registro anterior (km inicial menor que o atual)
        return naoIgnorar && kmIni > 0 && pendente && kmIni < kmInicialAtual && String(reg.data || '') <= String(dataAtualISO || '');
    });

    if (candidatos.length === 0) return;

    const ultimoPendente = ordenarRegistrosLogisticaAsc(candidatos).pop();
    if (!ultimoPendente) return;

    const kmInicialAnterior = parseFloat(ultimoPendente.kmInicial) || 0;
    const kmRodados = kmInicialAtual - kmInicialAnterior;
    const litrosAbastecidosAnterior = parseFloat(ultimoPendente.litrosAbastecidos) || 0;

    ultimoPendente.kmFinal = kmInicialAtual;
    ultimoPendente.kmRodados = kmRodados;
    ultimoPendente.litrosGastos = (kmRodados * consumoPadrao) / 100;
    ultimoPendente.custoPorKm = kmRodados > 0 ? (parseFloat(ultimoPendente.valorAbastecimento) || 0) / kmRodados : 0;
    ultimoPendente.consumoMedio = (litrosAbastecidosAnterior > 0 && kmRodados > 0)
        ? (litrosAbastecidosAnterior / kmRodados) * 100
        : consumoPadrao;

    localStorage.setItem('registrosLogistica', JSON.stringify(registrosLogistica));
    notificarMudancaParaSync('autoCompletarKmFinalAnterior');

    const filtroAtual = document.getElementById('filtroMesLogistica')?.value || null;
    atualizarTabelaLogistica(filtroAtual);
}

function obterDadosTrechoAtualizados(registro, listaOrdenada = null) {
    const consumoPadrao = obterConsumoConfigurado();
    const registrosOrdenados = listaOrdenada || ordenarRegistrosLogisticaAsc(registrosLogistica);
    const idx = registrosOrdenados.findIndex(r => Number(r.id) === Number(registro.id));
    const proximo = idx >= 0
        ? registrosOrdenados.slice(idx + 1).find(r => (parseFloat(r.kmInicial) || 0) > 0)
        : null;

    const kmInicial = parseFloat(registro.kmInicial) || 0;
    const kmFinalOriginal = parseFloat(registro.kmFinal) || 0;
    const litrosAbastecidos = parseFloat(registro.litrosAbastecidos) || 0;
    // Regra principal: o KM inicial do próximo registro fecha o registro anterior.
    // Só usa KM final manual quando não existir próximo registro válido.
    const kmFinalConsiderado = proximo
        ? (parseFloat(proximo.kmInicial) || 0)
        : ((kmFinalOriginal > kmInicial) ? kmFinalOriginal : 0);

    const kmRodados = (kmInicial > 0 && kmFinalConsiderado > kmInicial) ? (kmFinalConsiderado - kmInicial) : 0;
    // Se não houver KM inicial válido, não calcular km rodado e usar apenas litros abastecidos
    const litrosGastos = kmRodados > 0
        ? ((consumoPadrao > 0) ? (kmRodados * consumoPadrao) / 100 : litrosAbastecidos)
        : litrosAbastecidos;
    const custoPorKm = kmRodados > 0 ? (parseFloat(registro.valorAbastecimento) || 0) / kmRodados : 0;
    const origemFinal = proximo
        ? 'próximo registro'
        : ((kmFinalOriginal > kmInicial) ? 'próprio registro' : 'pendente');

    return {
        kmInicial,
        kmFinalConsiderado,
        kmRodados,
        litrosGastos,
        custoPorKm,
        origemFinal,
        proximo
    };
}

function atualizarModoLitrosAbastecidos() {
    const usarManual = !!document.getElementById('usarLitrosManual')?.checked;
    const campoLitros = document.getElementById('litrosAbastecidos');
    if (!campoLitros) return;

    campoLitros.readOnly = !usarManual;
    campoLitros.title = usarManual
        ? 'Edição manual ativada'
        : 'Valor calculado automaticamente por Abastecimento/Preço por Litro';
}

function calcularLitrosAbastecidosAutomatico() {
    const usarManual = !!document.getElementById('usarLitrosManual')?.checked;
    if (usarManual) return;

    const valorAbastecimento = parseDecimalInput(document.getElementById('valorAbastecimento')?.value);
    const precoLitro = parseDecimalInput(document.getElementById('precoLitro')?.value);
    const campoLitros = document.getElementById('litrosAbastecidos');

    if (!campoLitros) return;

    if (valorAbastecimento > 0 && precoLitro > 0) {
        campoLitros.value = (valorAbastecimento / precoLitro).toFixed(2);
    } else {
        campoLitros.value = '';
    }
}

function calcularKMRodados() {
    const kmInicial = parseDecimalInput(document.getElementById('kmInicial').value);
    const kmFinal = parseDecimalInput(document.getElementById('kmFinal').value);
    if (kmFinal > kmInicial) {
        const kmRodados = kmFinal - kmInicial;
        document.getElementById('kmRodadosDia').value = `${formatarKm(kmRodados)} km`;
        calcularConsumo();
    } else if (kmInicial > 0) {
        document.getElementById('kmRodadosDia').value = 'Pendente (será fechado no próximo KM inicial)';
        calcularConsumo();
    } else {
        document.getElementById('kmRodadosDia').value = '';
        calcularConsumo();
    }
}

// Calcular consumo médio e litros gastos
document.getElementById('litrosAbastecidos')?.addEventListener('input', calcularConsumo);
document.getElementById('valorAbastecimento')?.addEventListener('input', function() {
    calcularLitrosAbastecidosAutomatico();
    calcularConsumo();
    salvarRegistroDiaAtual();
});
document.getElementById('precoLitro')?.addEventListener('input', function() {
    calcularLitrosAbastecidosAutomatico();
    calcularConsumo();
    salvarRegistroDiaAtual();
});
document.getElementById('usarLitrosManual')?.addEventListener('change', function() {
    atualizarModoLitrosAbastecidos();
    calcularLitrosAbastecidosAutomatico();
    calcularConsumo();
    salvarRegistroDiaAtual();
});

function calcularConsumo() {
    const CONSUMO_MEDIO_PADRAO = obterConsumoConfigurado(); // Usa configuração do usuário
    const kmInicial = parseDecimalInput(document.getElementById('kmInicial').value);
    const kmFinal = parseDecimalInput(document.getElementById('kmFinal').value);

    if (kmInicial > 0) {
        const dataAtual = document.getElementById('dataLogistica').value || getHojeISO();
        atualizarRegistroAnteriorPendente(kmInicial, dataAtual, logisticaEmEdicao);
    }
    const litrosAbastecidos = parseDecimalInput(document.getElementById('litrosAbastecidos').value);
    const modeloCarro = obterModeloVeiculoConfigurado();
    const sufixoModelo = modeloCarro ? ` • ${modeloCarro}` : '';
    
    if (CONSUMO_MEDIO_PADRAO <= 0) {
        document.getElementById('consumoMedio').value = 'Configure o consumo do carro (L/100km) para calcular.';
        return;
    }

    if (kmFinal > kmInicial) {
        const kmRodados = kmFinal - kmInicial;
        
        // Calcular litros gastos totais com base no consumo médio padrão
        const litrosGastos = (kmRodados * CONSUMO_MEDIO_PADRAO) / 100;
        
        // Se houve abastecimento, calcular consumo real
        if (litrosAbastecidos > 0) {
            const consumoRealPor100km = (litrosAbastecidos / kmRodados) * 100;
            document.getElementById('consumoMedio').value = `${litrosGastos.toFixed(2)}L consumidos (${consumoRealPor100km.toFixed(2)} L/100km${sufixoModelo})`;
        } else {
            // Mostrar apenas litros gastos estimados
            document.getElementById('consumoMedio').value = `${litrosGastos.toFixed(2)}L consumidos (${CONSUMO_MEDIO_PADRAO.toFixed(2)} L/100km${sufixoModelo})`;
        }
    } else {
        document.getElementById('consumoMedio').value = kmInicial > 0
            ? `Aguardando próximo KM inicial (${CONSUMO_MEDIO_PADRAO.toFixed(2)} L/100km${sufixoModelo})`
            : (litrosAbastecidos > 0 ? `${litrosAbastecidos.toFixed(2)}L abastecidos (sem KM inicial para calcular consumo)` : '');
    }
}

// Formulário de Logística
document.getElementById('formLogistica')?.addEventListener('submit', function(e) {
    e.preventDefault();
    const estavaEmEdicao = !!logisticaEmEdicao;
    const registroBase = logisticaEmEdicao
        ? (registrosLogistica.find(r => Number(r.id) === Number(logisticaEmEdicao)) || {})
        : {};
    
    const CONSUMO_MEDIO_PADRAO = obterConsumoConfigurado(); // Usa configuração do usuário

    if (!(CONSUMO_MEDIO_PADRAO > 0)) {
        alert('Defina o consumo do carro (L/100km) na configuração do veículo antes de registrar logística.');
        const campoConsumo = document.getElementById('consumoCarro');
        if (campoConsumo) campoConsumo.focus();
        return;
    }
    
    const kmInicial = parseDecimalInput(document.getElementById('kmInicial').value);
    // KM Final não é preenchido manualmente: fica pendente para novos registros
    // e preserva o valor já encadeado automaticamente quando estiver em edição.
    const kmFinal = logisticaEmEdicao ? (parseFloat(registroBase.kmFinal) || 0) : 0;
    
    const kmRodados = (kmFinal > kmInicial) ? (kmFinal - kmInicial) : 0;
    const valorAbastecimento = parseDecimalInput(document.getElementById('valorAbastecimento').value);
    const precoLitro = parseDecimalInput(document.getElementById('precoLitro').value);
    const usarLitrosManual = !!document.getElementById('usarLitrosManual').checked;
    const litrosAbastecidos = parseDecimalInput(document.getElementById('litrosAbastecidos').value);
    const litrosGastos = kmRodados > 0
        ? (kmRodados * CONSUMO_MEDIO_PADRAO) / 100
        : litrosAbastecidos;
    const consumoReal = (litrosAbastecidos > 0 && kmRodados > 0) ? (litrosAbastecidos / kmRodados) * 100 : CONSUMO_MEDIO_PADRAO;
    const custoPorKm = kmRodados > 0 ? valorAbastecimento / kmRodados : 0;
    
    const registro = {
        ...registroBase,
        id: logisticaEmEdicao || Date.now(),
        data: document.getElementById('dataLogistica').value || getHojeISO(),
        horaInicio: '-',
        horaFim: '-',
        kmInicial: kmInicial,
        kmFinal: kmFinal,
        kmRodados: kmRodados,
        valorAbastecimento: valorAbastecimento,
        precoLitro: precoLitro,
        usarLitrosManual: usarLitrosManual,
        litrosOrigem: litrosAbastecidos > 0 ? (usarLitrosManual ? 'manual' : 'automatico') : '-',
        litrosAbastecidos: litrosAbastecidos,
        litrosGastos: litrosGastos,
        consumoMedio: consumoReal,
        custoPorKm: custoPorKm,
        observacoes: document.getElementById('observacoesLogistica').value || ''
    };

    if (precoLitro > 0) {
        localStorage.setItem('precoLitroPadrao', String(precoLitro));
    }
    
    console.log('Salvando registro de logística:', registro);

    const dataAtual = registro.data || getHojeISO();
    if (kmInicial > 0) {
        // Primeiro fecha o registro anterior; só depois salva o atual.
        atualizarRegistroAnteriorPendente(kmInicial, dataAtual, registro.id);
    }

    if (logisticaEmEdicao) {
        const idxEdicao = registrosLogistica.findIndex(r => Number(r.id) === Number(logisticaEmEdicao));
        if (idxEdicao >= 0) {
            registrosLogistica[idxEdicao] = registro;
        }
    } else {
        registrosLogistica.push(registro);
    }

    localStorage.setItem('registrosLogistica', JSON.stringify(registrosLogistica));
    notificarMudancaParaSync('registrosLogistica');
    
    console.log('Total de registros:', registrosLogistica.length);
    
    // Limpar registro do dia atual após salvar
    registroDiaAtual = null;
    localStorage.removeItem('registroDiaAtual');
    logisticaEmEdicao = null;
    
    atualizarTabelaLogistica();
    limparFormularioLogistica();
    
    alert(estavaEmEdicao ? 'Registro atualizado com sucesso!' : 'Registro de logística salvo com sucesso!');
});

function limparFormularioLogistica() {
    document.getElementById('formLogistica').reset();
    document.getElementById('kmRodadosDia').value = '';
    document.getElementById('consumoMedio').value = '';
    document.getElementById('usarLitrosManual').checked = false;
    atualizarModoLitrosAbastecidos();
    logisticaEmEdicao = null;

    const btnSalvar = document.getElementById('btnSalvarLogistica');
    if (btnSalvar) btnSalvar.textContent = 'Registrar Jornada';
    const btnCancelar = document.getElementById('btnCancelarEdicaoLogistica');
    if (btnCancelar) btnCancelar.style.display = 'none';
    
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

    atualizarResumoRapidoLogistica(registrosFiltrados);
    
    console.log('Registros filtrados:', registrosFiltrados.length);
    
    if (registrosFiltrados.length === 0) {
        tbody.innerHTML = '<tr class="empty-state"><td colspan="8">Nenhum registro de logística encontrado</td></tr>';
        return;
    }

    const ordenadosAsc = ordenarRegistrosLogisticaAsc(registrosFiltrados);
    const todosOrdenadosAsc = ordenarRegistrosLogisticaAsc(registrosLogistica);
    [...ordenadosAsc].reverse().forEach(reg => {
        const tr = document.createElement('tr');
        const dataFormatada = new Date(reg.data + 'T00:00:00').toLocaleDateString('pt-BR');
        const trecho = obterDadosTrechoAtualizados(reg, todosOrdenadosAsc);
        const precoLitro = parseFloat(reg.precoLitro) || 0;
        const litrosOrigem = reg.litrosOrigem || '-';
        const kmFinalTexto = trecho.kmFinalConsiderado > 0
            ? formatarKm(trecho.kmFinalConsiderado)
            : 'Pendente';
        
        tr.innerHTML = `
            <td>${dataFormatada}</td>
            <td>${formatarKm(trecho.kmInicial)}</td>
            <td>${kmFinalTexto}${trecho.origemFinal === 'próximo registro' ? '<br><small>auto</small>' : ''}</td>
            <td><strong>${formatarKm(trecho.kmRodados)} km</strong></td>
            <td><strong style='color:#27ae60;'>${reg.valorAbastecimento > 0 ? '€ ' + reg.valorAbastecimento.toFixed(2) : '-'}</strong>${precoLitro > 0 ? `<br><small>€ ${precoLitro.toFixed(3)}/L</small>` : ''}</td>
            <td>${reg.litrosAbastecidos > 0 ? reg.litrosAbastecidos.toFixed(2) + 'L' : '-'}${reg.litrosAbastecidos > 0 ? `<br><small>${litrosOrigem}</small>` : ''}</td>
            <td>${trecho.litrosGastos.toFixed(2)}L${trecho.custoPorKm > 0 ? `<br><small>€ ${trecho.custoPorKm.toFixed(3)}/km</small>` : ''}</td>
            <td>
                <button class="btn-small" onclick="editarLogistica(${reg.id})" title="Editar registro" style="margin-right:6px;">✏️</button>
                <button class="btn-small" onclick="visualizarLogistica(${reg.id})" title="Visualizar registro" style="margin-right:6px;">👁️</button>
                <button class="btn-delete" onclick="deletarLogistica(${reg.id})">🗑️</button>
            </td>
        `;
        
        tbody.appendChild(tr);
    });
}

function editarLogistica(id) {
    const reg = registrosLogistica.find(r => Number(r.id) === Number(id));
    if (!reg) {
        alert('Registro não encontrado para edição.');
        return;
    }

    logisticaEmEdicao = reg.id;
    document.getElementById('dataLogistica').value = reg.data || '';
    document.getElementById('kmInicial').value = (parseFloat(reg.kmInicial) || 0) > 0 ? parseFloat(reg.kmInicial) : '';
    document.getElementById('kmFinal').value = (parseFloat(reg.kmFinal) || 0) > 0 ? parseFloat(reg.kmFinal) : '';
    document.getElementById('valorAbastecimento').value = (parseFloat(reg.valorAbastecimento) || 0) > 0 ? parseFloat(reg.valorAbastecimento) : '';
    document.getElementById('precoLitro').value = (parseFloat(reg.precoLitro) || 0) > 0 ? parseFloat(reg.precoLitro) : '';
    document.getElementById('usarLitrosManual').checked = !!reg.usarLitrosManual;
    document.getElementById('litrosAbastecidos').value = (parseFloat(reg.litrosAbastecidos) || 0) > 0 ? parseFloat(reg.litrosAbastecidos) : '';
    document.getElementById('observacoesLogistica').value = reg.observacoes || '';

    atualizarModoLitrosAbastecidos();
    calcularKMRodados();
    calcularConsumo();

    const btnSalvar = document.getElementById('btnSalvarLogistica');
    if (btnSalvar) btnSalvar.textContent = 'Atualizar Registro';
    const btnCancelar = document.getElementById('btnCancelarEdicaoLogistica');
    if (btnCancelar) btnCancelar.style.display = 'inline-block';
}

function cancelarEdicaoLogistica() {
    limparFormularioLogistica();
    fecharVisualizacaoLogistica();
}

function visualizarLogistica(id) {
    const registro = registrosLogistica.find(r => Number(r.id) === Number(id));
    if (!registro) {
        alert('Registro não encontrado.');
        return;
    }

    const todosOrdenados = ordenarRegistrosLogisticaAsc(registrosLogistica);
    const idx = todosOrdenados.findIndex(r => Number(r.id) === Number(id));
    const proximo = idx >= 0
        ? todosOrdenados.slice(idx + 1).find(r => (parseFloat(r.kmInicial) || 0) > 0)
        : null;

    const kmInicial = parseFloat(registro.kmInicial) || 0;
    const trecho = obterDadosTrechoAtualizados(registro, todosOrdenados);

    const origemFinal = trecho.origemFinal === 'próprio registro'
        ? 'Informado no próprio registro'
        : (trecho.proximo
            ? `Auto-completado pelo KM inicial do próximo registro (${new Date(trecho.proximo.data + 'T00:00:00').toLocaleDateString('pt-BR')})`
            : 'Pendente (aguardando próximo registro)');

    const painel = document.getElementById('painelVisualizacaoLogistica');
    if (!painel) return;

    const setText = (idEl, texto) => {
        const el = document.getElementById(idEl);
        if (el) el.textContent = texto;
    };

    setText('visLogData', new Date(registro.data + 'T00:00:00').toLocaleDateString('pt-BR'));
    setText('visLogKmInicial', `${formatarKm(trecho.kmInicial)} km`);
    setText('visLogKmFinal', trecho.kmFinalConsiderado > 0 ? `${formatarKm(trecho.kmFinalConsiderado)} km` : '-');
    setText('visLogOrigemFinal', origemFinal);
    setText('visLogKmRodados', `${formatarKm(trecho.kmRodados)} km`);
    setText('visLogLitrosTrecho', `${trecho.litrosGastos.toFixed(2)} L`);
    setText('visLogCustoTrecho', trecho.custoPorKm > 0 ? `€ ${trecho.custoPorKm.toFixed(3)}` : '-');

    painel.style.display = 'block';
}

function fecharVisualizacaoLogistica() {
    const painel = document.getElementById('painelVisualizacaoLogistica');
    if (painel) painel.style.display = 'none';
}

function validarConsistenciaLitros(totalLitrosConsumidos, totalLitrosAbastecidos, totalKM, totalRegistros) {
    const totalCons = parseFloat(totalLitrosConsumidos) || 0;
    const totalAbast = parseFloat(totalLitrosAbastecidos) || 0;
    const km = parseFloat(totalKM) || 0;
    const consumoConfig = parseFloat(obterConsumoConfigurado()) || 0;
    const litrosNecessarios = (km > 0 && consumoConfig > 0) ? ((km * consumoConfig) / 100) : 0;

    if (totalRegistros <= 0) {
        return { temErro: false, mensagem: '' };
    }

    if (km > 0 && litrosNecessarios > 0 && totalAbast > 0) {
        const diferenca = Math.abs(totalAbast - litrosNecessarios);
        const margem = litrosNecessarios * 0.35; // 35% de tolerância
        if (diferenca > margem) {
            return {
                temErro: true,
                mensagem: `⚠️ Para consumo configurado de ${consumoConfig.toFixed(2)} L/100km e ${formatarKm(km)} km, seriam necessários ~${litrosNecessarios.toFixed(2)} L, mas foram abastecidos ${totalAbast.toFixed(2)} L.`
            };
        }
    }

    if (totalAbast > 0 && totalCons > 0) {
        const razao = totalCons / totalAbast;
        if (razao > 3 || razao < 0.25) {
            return {
                temErro: true,
                mensagem: `⚠️ Erro na soma dos litros consumidos: estimado ${totalCons.toFixed(2)} L não bate com abastecido ${totalAbast.toFixed(2)} L. Verifique os KM iniciais entre registros e abastecimentos.`
            };
        }
    }

    if (totalAbast > 0 && totalCons <= 0) {
        return {
            temErro: true,
            mensagem: '⚠️ Erro na soma dos litros consumidos: há abastecimento informado, mas consumo calculado é zero. Verifique encadeamento dos KM iniciais.'
        };
    }

    if (km > 0 && totalCons <= 0) {
        return {
            temErro: true,
            mensagem: '⚠️ Erro na soma dos litros consumidos: há KM rodados sem consumo válido calculado.'
        };
    }

    return { temErro: false, mensagem: '' };
}

function atualizarAlertaResumoLogistica(mensagem, temErro) {
    const box = document.getElementById('resumoRapidoLogistica');
    if (!box) return;

    let alerta = document.getElementById('resumoLogAlerta');
    if (!alerta) {
        alerta = document.createElement('div');
        alerta.id = 'resumoLogAlerta';
        alerta.style.marginTop = '10px';
        alerta.style.fontSize = '12px';
        alerta.style.fontWeight = '600';
        box.appendChild(alerta);
    }

    if (temErro) {
        alerta.style.display = 'block';
        alerta.style.color = '#c0392b';
        alerta.textContent = mensagem;
    } else {
        alerta.style.display = 'none';
        alerta.textContent = '';
    }
}

function atualizarResumoRapidoLogistica(registrosFiltrados = []) {
    const totalRegistros = registrosFiltrados.length;
    const todosOrdenadosAsc = ordenarRegistrosLogisticaAsc(registrosLogistica);
    const totalKM = registrosFiltrados.reduce((sum, reg) => sum + obterDadosTrechoAtualizados(reg, todosOrdenadosAsc).kmRodados, 0);
    const totalAbastecimento = registrosFiltrados.reduce((sum, reg) => sum + (parseFloat(reg.valorAbastecimento) || 0), 0);
    const totalLitrosAbastecidos = registrosFiltrados.reduce((sum, reg) => sum + (parseFloat(reg.litrosAbastecidos) || 0), 0);
    const totalLitrosGastos = registrosFiltrados.reduce((sum, reg) => sum + obterDadosTrechoAtualizados(reg, todosOrdenadosAsc).litrosGastos, 0);

    const custoPorKm = totalKM > 0 ? totalAbastecimento / totalKM : 0;

    const elReg = document.getElementById('resumoLogRegistros');
    const elKm = document.getElementById('resumoLogKm');
    const elAbs = document.getElementById('resumoLogAbastecimento');
    const elLab = document.getElementById('resumoLogLitrosAbastecidos');
    const elLco = document.getElementById('resumoLogLitrosConsumidos');
    const elCkm = document.getElementById('resumoLogCustoKm');
    const consistencia = validarConsistenciaLitros(totalLitrosGastos, totalLitrosAbastecidos, totalKM, totalRegistros);

    if (elReg) elReg.textContent = String(totalRegistros);
    if (elKm) elKm.textContent = `${formatarKm(totalKM)} km`;
    if (elAbs) elAbs.textContent = `€ ${totalAbastecimento.toFixed(2)}`;
    if (elLab) elLab.textContent = `${totalLitrosAbastecidos.toFixed(2)} L`;
    if (elLco) elLco.textContent = consistencia.temErro ? 'ERRO DE SOMA' : `${totalLitrosGastos.toFixed(2)} L`;
    if (elCkm) elCkm.textContent = consistencia.temErro ? 'Verificar dados' : `€ ${custoPorKm.toFixed(3)}`;

    atualizarAlertaResumoLogistica(consistencia.mensagem, consistencia.temErro);
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
    const registrosMesOrdenados = ordenarRegistrosLogisticaAsc(registrosMes);
    const todosOrdenadosAsc = ordenarRegistrosLogisticaAsc(registrosLogistica);
    const tableData = registrosMesOrdenados.map(reg => {
        const trecho = obterDadosTrechoAtualizados(reg, todosOrdenadosAsc);
        const precoLitro = parseFloat(reg.precoLitro) || 0;
        return [
            new Date(reg.data + 'T00:00:00').toLocaleDateString('pt-BR'),
            formatarKm(trecho.kmInicial),
            trecho.kmFinalConsiderado > 0 ? formatarKm(trecho.kmFinalConsiderado) : 'Pendente',
            formatarKm(trecho.kmRodados) + ' km',
            reg.valorAbastecimento > 0 ? '€ ' + reg.valorAbastecimento.toFixed(2) : '-',
            precoLitro > 0 ? '€ ' + precoLitro.toFixed(3) : '-',
            reg.litrosAbastecidos > 0 ? reg.litrosAbastecidos.toFixed(2) + 'L' : '-',
            (reg.litrosOrigem || '-'),
            trecho.litrosGastos.toFixed(2) + 'L',
            trecho.custoPorKm > 0 ? '€ ' + trecho.custoPorKm.toFixed(3) : '-'
        ];
    });
    
    doc.autoTable({
        startY: 35,
    head: [['Data', 'KM Ini', 'KM Fim', 'KM Rodados', 'Abastec.', '€/L', 'L.Abast.', 'Origem L', 'L.Consumidos', 'Custo/KM']],
        body: tableData,
        theme: 'striped',
        headStyles: { fillColor: [102, 126, 234] },
        styles: { fontSize: 8 }
    });
    
    // Resumo
    const totalKM = registrosMesOrdenados.reduce((sum, reg) => sum + obterDadosTrechoAtualizados(reg, todosOrdenadosAsc).kmRodados, 0);
    const totalAbastecimento = registrosMes.reduce((sum, reg) => sum + reg.valorAbastecimento, 0);
    const totalLitrosAbastecidos = registrosMes.reduce((sum, reg) => sum + reg.litrosAbastecidos, 0);
    const totalLitrosGastos = registrosMesOrdenados.reduce((sum, reg) => sum + obterDadosTrechoAtualizados(reg, todosOrdenadosAsc).litrosGastos, 0);
    const consistencia = validarConsistenciaLitros(totalLitrosGastos, totalLitrosAbastecidos, totalKM, registrosMes.length);
    const totalCustoPorKm = totalKM > 0 ? totalAbastecimento / totalKM : 0;
    const consumoMedio = (!consistencia.temErro && totalLitrosGastos > 0 && totalKM > 0)
        ? (totalLitrosGastos / totalKM) * 100
        : obterConsumoConfigurado();
    const modeloCarro = obterModeloVeiculoConfigurado();
    
    const finalY = doc.lastAutoTable.finalY + 10;
    doc.setFontSize(12);
    doc.text(`Total de Registros: ${registrosMes.length}`, 14, finalY);
    doc.text(`Total KM Rodados: ${formatarKm(totalKM)} km`, 14, finalY + 7);
    doc.setFontSize(12);
    doc.setFont(undefined, 'normal');
    if (consistencia.temErro) {
        doc.text('Total Litros Consumidos: ERRO DE CONSISTÊNCIA', 14, finalY + 14);
    } else {
        doc.text(`Total Litros Consumidos: ${totalLitrosGastos.toFixed(2)} L`, 14, finalY + 14);
    }
    doc.setFontSize(12);
    doc.setFont(undefined, 'normal');
    doc.text(`Total Litros Abastecidos: ${totalLitrosAbastecidos.toFixed(2)} L`, 14, finalY + 21);
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.text(`Total Abastecimento: € ${totalAbastecimento.toFixed(2)}`, 14, finalY + 31);
    doc.setFontSize(11);
    doc.setFont(undefined, 'normal');
    if (consistencia.temErro) {
        doc.text('Custo médio por KM: Verificar dados', 14, finalY + 38);
        doc.text(consistencia.mensagem, 14, finalY + 45);
    } else {
        doc.text(`Custo médio por KM: € ${totalCustoPorKm.toFixed(3)}`, 14, finalY + 38);
        doc.text(`Consumo médio: ${consumoMedio.toFixed(2)} L/100km${modeloCarro ? ' • ' + modeloCarro : ''}`, 14, finalY + 45);
    }
    
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
    const registrosDiaOrdenados = ordenarRegistrosLogisticaAsc(registrosDia);
    const todosOrdenadosAsc = ordenarRegistrosLogisticaAsc(registrosLogistica);
    const tableData = registrosDiaOrdenados.map(reg => {
        const trecho = obterDadosTrechoAtualizados(reg, todosOrdenadosAsc);
        const precoLitro = parseFloat(reg.precoLitro) || 0;
        return [
            formatarKm(trecho.kmInicial),
            trecho.kmFinalConsiderado > 0 ? formatarKm(trecho.kmFinalConsiderado) : 'Pendente',
            formatarKm(trecho.kmRodados) + ' km',
            reg.valorAbastecimento > 0 ? '€ ' + reg.valorAbastecimento.toFixed(2) : '-',
            precoLitro > 0 ? '€ ' + precoLitro.toFixed(3) : '-',
            reg.litrosAbastecidos > 0 ? reg.litrosAbastecidos.toFixed(2) + 'L' : '-',
            (reg.litrosOrigem || '-'),
            trecho.litrosGastos.toFixed(2) + 'L',
            trecho.custoPorKm > 0 ? '€ ' + trecho.custoPorKm.toFixed(3) : '-'
        ];
    });
    
    doc.autoTable({
        startY: 35,
    head: [['KM Ini', 'KM Fim', 'KM Rodados', 'Abastec.', '€/L', 'L.Abast.', 'Origem L', 'L.Consumidos', 'Custo/KM']],
        body: tableData,
        theme: 'striped',
        headStyles: { fillColor: [102, 126, 234] },
        styles: { fontSize: 8 }
    });
    
    // Resumo
    const totalKM = registrosDiaOrdenados.reduce((sum, reg) => sum + obterDadosTrechoAtualizados(reg, todosOrdenadosAsc).kmRodados, 0);
    const totalAbastecimento = registrosDia.reduce((sum, reg) => sum + reg.valorAbastecimento, 0);
    const totalLitrosAbastecidos = registrosDia.reduce((sum, reg) => sum + reg.litrosAbastecidos, 0);
    const totalLitrosGastos = registrosDiaOrdenados.reduce((sum, reg) => sum + obterDadosTrechoAtualizados(reg, todosOrdenadosAsc).litrosGastos, 0);
    const consistencia = validarConsistenciaLitros(totalLitrosGastos, totalLitrosAbastecidos, totalKM, registrosDia.length);
    const totalCustoPorKm = totalKM > 0 ? totalAbastecimento / totalKM : 0;
    const consumoMedio = (!consistencia.temErro && totalLitrosGastos > 0 && totalKM > 0)
        ? (totalLitrosGastos / totalKM) * 100
        : obterConsumoConfigurado();
    const modeloCarro = obterModeloVeiculoConfigurado();
    
    const finalY = doc.lastAutoTable.finalY + 10;
    doc.setFontSize(12);
    doc.text(`Registros no dia: ${registrosDia.length}`, 14, finalY);
    doc.text(`KM Rodados: ${formatarKm(totalKM)} km`, 14, finalY + 7);
    doc.text(`Abastecimento: € ${totalAbastecimento.toFixed(2)}`, 14, finalY + 14);
    doc.text(`Litros Abastecidos: ${totalLitrosAbastecidos.toFixed(2)} L`, 14, finalY + 21);
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    if (consistencia.temErro) {
        doc.text('Litros Consumidos: ERRO DE CONSISTÊNCIA', 14, finalY + 31);
    } else {
        doc.text(`Litros Consumidos: ${totalLitrosGastos.toFixed(2)} L`, 14, finalY + 31);
    }
    doc.setFontSize(11);
    doc.setFont(undefined, 'normal');
    if (consistencia.temErro) {
        doc.text('Custo médio por KM: Verificar dados', 14, finalY + 38);
        doc.text(consistencia.mensagem, 14, finalY + 45);
    } else {
        doc.text(`Custo médio por KM: € ${totalCustoPorKm.toFixed(3)}`, 14, finalY + 38);
        doc.text(`Consumo médio: ${consumoMedio.toFixed(2)} L/100km${modeloCarro ? ' • ' + modeloCarro : ''}`, 14, finalY + 45);
    }
    
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




