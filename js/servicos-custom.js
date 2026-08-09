// Sistema Integrado de Serviços com Tabelas Customizadas
// Substitui servicosMOI.js e integra com config-tabelas.js

// Carregar serviços das tabelas customizadas
function carregarServicosCustomizados() {
    const tabelasCustom = localStorage.getItem('tabelasCustomizadas');
    
    if (!tabelasCustom) {
        // Se não houver tabelas customizadas, inicializar com dados padrão
        inicializarTabelasPadrao();
    }
    
    const tabelas = JSON.parse(localStorage.getItem('tabelasCustomizadas'));
    
    // Converter para formato compatível com o sistema existente
    const servicos = [];
    
    // Adicionar instalações
    if (tabelas.instalacoes) {
        tabelas.instalacoes.forEach(item => {
            servicos.push({
                item: item.codigo,
                red: item.rede,
                tipologia: item.descricao,
                valor: parseFloat(item.valor) || 0,
                pontos: parseFloat(item.pontos) || 0,
                categoria: item.categoria || 'INSTALACIONES',
                tipoTrabalho: item.tipoTrabalho || 'instalacao'
            });
        });
    }
    
    // Adicionar avarias
    if (tabelas.avarias) {
        tabelas.avarias.forEach(item => {
            servicos.push({
                item: item.codigo,
                red: item.rede,
                tipologia: item.descricao,
                valor: parseFloat(item.valor) || 0,
                pontos: parseFloat(item.pontos) || 0,
                categoria: item.categoria || 'AVERIAS + POSTVENTAS',
                tipoTrabalho: item.tipoTrabalho || 'avaria'
            });
        });
    }
    
    // Adicionar adicionais
    if (tabelas.adicionais) {
        tabelas.adicionais.forEach(item => {
            servicos.push({
                item: item.codigo,
                red: item.rede,
                tipologia: item.descricao,
                valor: parseFloat(item.valor) || 0,
                pontos: parseFloat(item.pontos) || 0,
                categoria: item.categoria || 'ADICIONALES',
                tipoTrabalho: item.tipoTrabalho || ''
            });
        });
    }
    
    return servicos;
}

// Inicializar tabelas padrão (primeira vez)
function inicializarTabelasPadrao() {
    const tabelasPadrao = {
        instalacoes: [
            { codigo: 'INST01', rede: 'AMBAS', descricao: 'Nova exterior até 60m', valor: 44.00 },
            { codigo: 'INST02', rede: 'AMBAS', descricao: 'Nova exterior desde 80m', valor: 53.00 },
            { codigo: 'INST03', rede: 'Propia', descricao: 'Nova interior até 60m', valor: 40.00 },
            { codigo: 'INST04', rede: 'Propia', descricao: 'Nova interior desde 80m', valor: 48.00 },
            { codigo: 'INST05', rede: 'AMBAS', descricao: 'Reutilizada int/ext', valor: 27.00 },
            { codigo: 'INST06', rede: 'MOVISTAR', descricao: 'Nova interior até 60m', valor: 40.00 },
            { codigo: 'INST07', rede: 'MOVISTAR', descricao: 'Nova interior desde 80m', valor: 49.00 },
            { codigo: 'INST08', rede: 'AMBAS', descricao: 'Nova postes até 60m', valor: 82.00 },
            { codigo: 'INST09', rede: 'AMBAS', descricao: 'Nova postes desde 80m a 220M', valor: 91.00 },
            { codigo: 'INST10', rede: 'AMBAS', descricao: 'Nova postes > 220M', valor: 95.00 },
        ],
        avarias: [
            { codigo: 'AVAR01', rede: 'AMBAS', descricao: 'Avería Laborable (FTTH + ADSL)', valor: 16.00 },
            { codigo: 'AVAR02', rede: 'AMBAS', descricao: 'Postventa (Visita sem averia)', valor: 16.00 },
            { codigo: 'AVAR03', rede: 'AMBAS', descricao: 'Manutenção Cliente HFC', valor: 16.00 },
            { codigo: 'AVAR04', rede: 'AMBAS', descricao: 'Postventa a petição de cliente', valor: 16.00 },
            { codigo: 'AVAR05', rede: 'AMBAS', descricao: 'Manutenção Cliente sem deslocamento', valor: 0.00 },
            { codigo: 'AVAR06', rede: 'AMBAS', descricao: 'Complemento subida Poste Laborable', valor: 16.00 },
            { codigo: 'AVAR07', rede: 'AMBAS', descricao: 'Complemento subida Poste Festivo', valor: 24.00 },
        ],
        adicionais: [
            { codigo: 'ADIC01', rede: 'AMBAS', descricao: 'Instalação STB', valor: 4.00 },
            { codigo: 'ADIC02', rede: 'AMBAS', descricao: 'Prescrição + Instalação REPE e MESH', valor: 6.00 },
            { codigo: 'ADIC03', rede: 'AMBAS', descricao: 'Instalação REPE e MESH provisionado', valor: 3.00 },
        ]
    };
    
    localStorage.setItem('tabelasCustomizadas', JSON.stringify(tabelasPadrao));
    
    // Inicializar multiplicadores
    const multiplicadoresPadrao = {
        normal: 1.0,
        domingoFeriado: 1.5,
        dobrado: 2.0
    };
    localStorage.setItem('multiplicadores', JSON.stringify(multiplicadoresPadrao));
}

// Popular os selects com serviços
function popularSelectsServicos() {
    const servicos = carregarServicosCustomizados();
    
    // Popular select principal de serviços (SEM adicionales)
    const selectTipoServico = document.getElementById('tipoServico');
    if (selectTipoServico) {
        selectTipoServico.innerHTML = '<option value="">Selecione o serviço...</option>';
        
        // Agrupar por categoria, excluindo ADICIONALES
        const categorias = [...new Set(servicos.map(s => s.categoria))].filter(cat => cat !== 'ADICIONALES');
        
        categorias.forEach(categoria => {
            const optgroup = document.createElement('optgroup');
            optgroup.label = categoria;
            
            servicos
                .filter(s => s.categoria === categoria)
                .forEach(servico => {
                    const option = document.createElement('option');
                    option.value = JSON.stringify(servico);
                    option.textContent = `${servico.tipologia}`;
                    optgroup.appendChild(option);
                });
            
            selectTipoServico.appendChild(optgroup);
        });
    }
    
    // Popular select de adicionais
    const selectAdicional = document.getElementById('adicionalServico');
    if (selectAdicional) {
        selectAdicional.innerHTML = '<option value="">Nenhum adicional</option>';
        
        servicos
            .filter(s => s.categoria === 'ADICIONALES')
            .forEach(servico => {
                const option = document.createElement('option');
                option.value = JSON.stringify(servico);
                option.textContent = `${servico.tipologia}`;
                selectAdicional.appendChild(option);
            });
    }
}

// Obter multiplicadores
function obterMultiplicadores() {
    const mult = localStorage.getItem('multiplicadores');
    if (!mult) {
        return {
            normal: 1.0,
            domingoFeriado: 1.5,
            dobrado: 2.0,
            bonusDomingo: 1.0,    // Multiplicador (1.0 = sem alteração)
            bonusFeriado: 1.0,    // Multiplicador (1.0 = sem alteração)
            premioSabado: 0,
            premioDomingo: 0,
            premioFestivo: 0,
            bonusOTForaHora: 0,
            bonusOTForaHoraTipo: 'valor'
        };
    }
    const parsed = JSON.parse(mult);
    return {
        normal: 1.0,
        domingoFeriado: 1.5,
        dobrado: 2.0,
        bonusDomingo: 1.0,
        bonusFeriado: 1.0,
        premioSabado: 0,
        premioDomingo: 0,
        premioFestivo: 0,
        bonusOTForaHora: 0,
        bonusOTForaHoraTipo: 'valor',
        ...parsed
    };
}

// Verificar se uma data é sábado (6) ou domingo (0)
function getDiaSemana(dataStr) {
    if (!dataStr) return null;
    const d = new Date(dataStr + 'T12:00:00');
    return d.getDay(); // 0=domingo, 6=sábado
}

// Aplicar multiplicador a um valor
function aplicarMultiplicador(valor, tipo) {
    const mult = obterMultiplicadores();
    return valor * (mult[tipo] || 1.0);
}

// Calcular valor total com multiplicador + prémios selecionados manualmente
// IMPORTANTE: O prémio de saída só é aplicado 1x por dia (na primeira OT)
// O bónus percentual de domingo é aplicado AUTOMATICAMENTE quando a data é domingo
function calcularValorTotalComMultiplicador() {
    const valorServicoEl = document.getElementById('valorServico');
    const valorAdicionalEl = document.getElementById('valorAdicional');
    const multiplicadorEl = document.getElementById('multiplicadorServico');
    const valorTotalEl = document.getElementById('valorTotal');
    const dataOTEl = document.getElementById('dataOT');
    
    // Checkboxes de prémios
    const checkSabado = document.getElementById('otSabado');
    const checkDomingo = document.getElementById('otDomingo');
    const checkFestivo = document.getElementById('otFestivo');
    const checkPremioFestivo = document.getElementById('otPremioFestivo');
    
    if (!valorServicoEl || !valorTotalEl) return;
    
    const valorServico = parseFloat(valorServicoEl.value) || 0;
    const valorAdicional = parseFloat(valorAdicionalEl ? valorAdicionalEl.value : 0) || 0;
    const tipoMult = multiplicadorEl ? multiplicadorEl.value : 'normal';
    
    // Somar valores base
    const valorBase = valorServico + valorAdicional;
    
    // Aplicar multiplicador selecionado
    const mult = obterMultiplicadores();
    let valorFinal = valorBase * (mult[tipoMult] || 1.0);
    
    // Verificar se o prémio já foi aplicado neste dia
    const dataOT = dataOTEl ? dataOTEl.value : null;
    const dataISO = dataOT; // formato YYYY-MM-DD
    const premioJaAplicado = (typeof premioJaAplicadoNoDia === 'function' && dataISO) 
        ? premioJaAplicadoNoDia(dataISO) 
        : false;
    
    // Verificar dia da semana da data selecionada
    const diaSemana = getDiaSemana(dataOT); // 0=domingo, 6=sábado
    
    // Para mostrar prémios no preview (só para PDF)
    let premiosAplicados = [];
    let bonusAutoAplicado = false;
    
    // BÓNUS DOMINGO AUTOMÁTICO (MULTIPLICADOR) - aplica sempre que a data for domingo
    if (diaSemana === 0) {
        const multDomingo = parseFloat(mult.bonusDomingo) || 1.0;
        if (multDomingo > 0 && multDomingo !== 1.0) {
            valorFinal = valorFinal * multDomingo;
            premiosAplicados.push(`🅳 Auto x${multDomingo}`);
            bonusAutoAplicado = true;
        }
    }
    
    // PRÉMIOS DE SAÍDA: Apenas mostrar no preview, NÃO somar ao valor do serviço
    // Os prémios vão aparecer separados no PDF
    
    // Sábado (prémio de saída manual - só para PDF)
    if (checkSabado && checkSabado.checked && !premioJaAplicado) {
        const premioSab = parseFloat(mult.premioSabado) || 0;
        if (premioSab > 0) premiosAplicados.push(`Sáb: €${premioSab.toFixed(2)} (PDF)`);
    }
    
    // Domingo (prémio de saída manual - só para PDF)
    if (checkDomingo && checkDomingo.checked) {
        if (!premioJaAplicado) {
            const premioDom = parseFloat(mult.premioDomingo) || 0;
            if (premioDom > 0) premiosAplicados.push(`Dom: €${premioDom.toFixed(2)} (PDF)`);
        }
    }
    
    // Festivo: aplicar multiplicador no valor
    if (checkFestivo && checkFestivo.checked) {
        // Multiplicador feriado aplica-se ao valor final
        const multFeriado = parseFloat(mult.bonusFeriado) || 1.0;
        if (multFeriado > 0 && multFeriado !== 1.0) {
            valorFinal = valorFinal * multFeriado;
            premiosAplicados.push(`Festivo: x${multFeriado}`);
        }
    }

    // Prémio festivo opcional (independente do checkbox Festivo)
    if (checkPremioFestivo && checkPremioFestivo.checked && !premioJaAplicado) {
        // Permitir que o operador escolha tipo e valor do prémio (percentual/valor/multiplicador)
        const premioTipoEl = document.getElementById('bonusTipo');
        const premioValorEl = document.getElementById('bonusValor');
        let premioTipo = premioTipoEl ? premioTipoEl.value : 'valor';
        let premioFestRaw = premioValorEl ? parseFloat(premioValorEl.value) || 0 : (parseFloat(mult.premioFestivo) || 0);

        if (premioFestRaw > 0) {
            let premioCalculado = 0;
            if (premioTipo === 'valor') {
                premioCalculado = premioFestRaw;
                premiosAplicados.push(`Bônus: €${premioCalculado.toFixed(2)} (adicionado)`);
            } else if (premioTipo === 'percentual') {
                premioCalculado = valorFinal * premioFestRaw / 100;
                premiosAplicados.push(`Bônus: ${premioFestRaw}%=€${premioCalculado.toFixed(2)} (adicionado)`);
            } else if (premioTipo === 'multiplicador') {
                premioCalculado = valorFinal * premioFestRaw;
                premiosAplicados.push(`Bônus: x${premioFestRaw}=€${premioCalculado.toFixed(2)} (adicionado)`);
            }
            // Somar o prémio opcional ao valor final exibido (é um prémio escolhido pelo operador)
            valorFinal = valorFinal + premioCalculado;
        }
    }

    // BÔNUS POR OT FORA DE HORA - calcular e SOMAR ao valor final (por OT)
    const checkForaHora = document.getElementById('otForaHora');
    if (checkForaHora && checkForaHora.checked) {
        const bonusValor = parseFloat(mult.bonusOTForaHora) || 0;
        const bonusTipo = mult.bonusOTForaHoraTipo || 'valor';
        if (bonusValor > 0) {
            let bonusCalculado = 0;
            if (bonusTipo === 'valor') {
                bonusCalculado = bonusValor;
                premiosAplicados.push(`⏱️ Fora Hora: €${bonusCalculado.toFixed(2)} (PDF)`);
            } else if (bonusTipo === 'percentagem') {
                // percentagem aplicada sobre o valor já multiplicado (antes do próprio bónus)
                bonusCalculado = valorFinal * bonusValor / 100;
                premiosAplicados.push(`⏱️ Fora Hora: ${bonusValor}%=€${bonusCalculado.toFixed(2)} (PDF)`);
            } else if (bonusTipo === 'multiplicador') {
                bonusCalculado = valorFinal * bonusValor;
                premiosAplicados.push(`⏱️ Fora Hora: x${bonusValor}=€${bonusCalculado.toFixed(2)} (PDF)`);
            }
            // Somar o bônus ao valor final mostrado (é por OT)
            valorFinal = valorFinal + bonusCalculado;
        }
    }

    // Somar prémios de saída não — continuam separados no PDF. Já somamos apenas o bónus por OT aqui.
    valorTotalEl.value = valorFinal.toFixed(2);
    
    // Atualizar UI dos checkboxes e preview
    atualizarUICheckboxesPremios(mult, premioJaAplicado, premiosAplicados);
    
    // Atualizar label do multiplicador para mostrar o valor
    if (multiplicadorEl) {
        const options = multiplicadorEl.options;
        for (let i = 0; i < options.length; i++) {
            const tipo = options[i].value;
            const valorMult = mult[tipo] || 1.0;
            const label = tipo === 'normal' ? 'Normal' : 'Dobrado';
            options[i].text = `${label} (${valorMult}x)`;
        }
    }
    
    // Atualizar indicador de bónus automático de domingo
    atualizarIndicadorBonusAuto(diaSemana, mult);

    // Durante edição, manter botão de atualizar sempre disponível
    garantirBotaoAtualizacaoDisponivel();
}

// Mostrar indicador quando bónus domingo é aplicado automaticamente
function atualizarIndicadorBonusAuto(diaSemana, mult) {
    let indicador = document.getElementById('indicadorBonusAuto');
    const valorTotalEl = document.getElementById('valorTotal');
    
    if (!indicador && valorTotalEl && valorTotalEl.parentElement) {
        // Criar indicador se não existir
        indicador = document.createElement('div');
        indicador.id = 'indicadorBonusAuto';
        indicador.style.cssText = 'font-size: 11px; margin-top: 4px; font-weight: 600;';
        valorTotalEl.parentElement.appendChild(indicador);
    }
    
    if (indicador) {
        if (diaSemana === 0) {
            const multDomingo = parseFloat(mult.bonusDomingo) || 1.0;
            if (multDomingo > 0 && multDomingo !== 1.0) {
                indicador.innerHTML = `<span style="color:#e91e63;">🅳 Domingo: Multiplicador x${multDomingo} aplicado automaticamente</span>`;
                indicador.style.display = 'block';
            } else {
                indicador.style.display = 'none';
            }
        } else {
            indicador.style.display = 'none';
        }
    }
}

// Atualizar UI dos checkboxes de prémios
function atualizarUICheckboxesPremios(mult, premioJaAplicado, premiosAplicados) {
    const checkSabado = document.getElementById('otSabado');
    const checkDomingo = document.getElementById('otDomingo');
    const checkFestivo = document.getElementById('otFestivo');
    const checkPremioFestivo = document.getElementById('otPremioFestivo');
    const badgeSabado = document.getElementById('badgeSabado');
    const badgeDomingo = document.getElementById('badgeDomingo');
    const badgeFestivo = document.getElementById('badgeFestivo');
    const badgeBonus = document.getElementById('badgeBonus');
    const badgeForaHora = document.getElementById('badgeForaHora');
    const checkForaHora = document.getElementById('otForaHora');
    const previewEl = document.getElementById('previewPremios');
    const emEdicao = estaEmModoEdicaoOT();
    const bloquearPremioDia = premioJaAplicado && !emEdicao;

    // Mostrar/esconder badges
    if (badgeSabado) badgeSabado.style.display = (checkSabado && checkSabado.checked) ? 'inline' : 'none';
    if (badgeDomingo) badgeDomingo.style.display = (checkDomingo && checkDomingo.checked) ? 'inline' : 'none';
    if (badgeFestivo) badgeFestivo.style.display = (checkFestivo && checkFestivo.checked) ? 'inline' : 'none';
    if (badgeBonus) badgeBonus.style.display = (checkPremioFestivo && checkPremioFestivo.checked) ? 'inline' : 'none';
    if (badgeForaHora) badgeForaHora.style.display = (checkForaHora && checkForaHora.checked) ? 'inline' : 'none';
    
    // Desabilitar checkboxes de prémio diário se prémio já foi aplicado no dia
    if (bloquearPremioDia) {
        if (checkSabado) { checkSabado.disabled = true; checkSabado.checked = false; }
        if (checkDomingo) { checkDomingo.disabled = true; checkDomingo.checked = false; }
        if (checkFestivo) { checkFestivo.disabled = true; checkFestivo.checked = false; }
        if (checkPremioFestivo) { checkPremioFestivo.disabled = true; checkPremioFestivo.checked = false; }
        if (badgeBonus) badgeBonus.style.display = 'none';
    } else {
        if (checkSabado) checkSabado.disabled = false;
        if (checkDomingo) checkDomingo.disabled = false;
        if (checkFestivo) checkFestivo.disabled = false;

        if (checkPremioFestivo) {
            // Permitir que o operador marque manualmente o Bônus
            // O único bloqueio deve ser se o prémio do dia já foi aplicado (bloquearPremioDia)
            const bloquearPremioDia = premioJaAplicado && !emEdicao;
            checkPremioFestivo.disabled = !!bloquearPremioDia;
            if (bloquearPremioDia) checkPremioFestivo.checked = false;
            // Não forçar desmarcar quando não bloqueado — o operador decide
        }
    }
    // O bônus "Fora de Hora" é por OT — nunca é bloqueado pelo prémio diário
    if (checkForaHora) checkForaHora.disabled = false;
    
    // Atualizar preview
    if (previewEl) {
        if (premioJaAplicado) {
            const foraHoraMsg = (checkForaHora && checkForaHora.checked && (parseFloat(mult.bonusOTForaHora) || 0) > 0)
                ? ' | ⏱️ Fora Hora ativo'
                : '';
            previewEl.innerHTML = `<span style="color:#ff9800;">⚠️ Prémio de saída já aplicado hoje</span>${foraHoraMsg}`;
        } else if (premiosAplicados.length > 0) {
            previewEl.innerHTML = `<span style="color:#27ae60;">✓ ${premiosAplicados.join(' + ')}</span>`;
        } else {
            const sab = parseFloat(mult.premioSabado) || 0;
            const dom = parseFloat(mult.premioDomingo) || 0;
            const fest = parseFloat(mult.premioFestivo) || 0;
            const bfh = parseFloat(mult.bonusOTForaHora) || 0;
            const bfhTipo = mult.bonusOTForaHoraTipo || 'valor';
            const bfhLabel = bfh > 0
                ? ` | ⏱️ Fora Hora: ${bfhTipo === 'valor' ? '€' + bfh.toFixed(2) : (bfhTipo === 'percentagem' ? bfh + '%' : bfh + 'x')}`
                : '';
            previewEl.innerHTML = `Valores: Sáb €${sab.toFixed(2)} | Dom €${dom.toFixed(2)} | Festivo €${fest.toFixed(2)}${bfhLabel}`;
        }
    }
}

// Detectar de forma robusta se estamos editando uma OT já lançada
function estaEmModoEdicaoOT() {
    const globalEdit =
        (typeof otEmEdicao !== 'undefined' && !!otEmEdicao) ||
        (typeof window !== 'undefined' && (
            !!window.otEmEdicao ||
            !!window.otEditando ||
            !!window.modoEdicao ||
            !!window.isEditing
        ));

    if (globalEdit) return true;

    // Flags/inputs comuns de edição na página inicial
    const inputEdicao = document.getElementById('otEmEdicao')
        || document.getElementById('indiceEdicao')
        || document.getElementById('otIdEditando')
        || document.querySelector('input[name="otEmEdicao"], input[name="indiceEdicao"], input[name="otIdEditando"]');

    if (inputEdicao && String(inputEdicao.value || '').trim() !== '') return true;

    // URL com parâmetro de edição (fallback)
    try {
        const url = new URL(window.location.href);
        if (url.searchParams.has('edit') || url.searchParams.has('otEdit')) return true;
    } catch (_) {}

    const btnAtualizar = document.getElementById('btnAtualizarOT')
        || document.getElementById('btnAtualizar')
        || document.getElementById('atualizarOT')
        || document.querySelector('button[data-acao="atualizar"]');

    return !!btnAtualizar;
}

// Garantir que botão de atualizar fique sempre disponível durante edição
function garantirBotaoAtualizacaoDisponivel() {
    if (!estaEmModoEdicaoOT()) return;

    const seletores = [
        '#btnAtualizarOT',
        '#btnAtualizar',
        '#atualizarOT',
        'button[data-acao="atualizar"]',
        'button[id*="Atualizar"]',
        'button[name*="atualizar"]'
    ];

    seletores.forEach(sel => {
        const btn = document.querySelector(sel);
        if (!btn) return;

        btn.disabled = false;
        btn.removeAttribute('disabled');
        btn.removeAttribute('aria-disabled');
        btn.removeAttribute('hidden');
        btn.classList.remove('disabled', 'btn-disabled', 'is-disabled', 'd-none', 'hidden');
        btn.style.pointerEvents = 'auto';
        btn.style.opacity = '';
        if (btn.style.display === 'none') btn.style.display = '';
        if (btn.type === 'submit') btn.formNoValidate = true; // evita travas por validação indevida na edição
    });
}

// Monitorar alterações no botão de atualizar para evitar que outros scripts bloqueiem novamente.
// IMPORTANTE: observar SOMENTE o botão (sem subtree/childList em document.body), pois observar
// a página inteira dispara este callback a cada renderização da tabela de OTs/listas —
// com muitos registros salvos isso trava a tela inicial (alto custo de CPU a cada mutação).
let observerBotaoAtualizarOT = null;
function iniciarMonitorBotaoAtualizarOT() {
    if (observerBotaoAtualizarOT) return;

    const btnAlvo = document.getElementById('btnSalvarOuAtualizarOT')
        || document.getElementById('btnAtualizarOT')
        || document.getElementById('btnAtualizar')
        || document.getElementById('atualizarOT');

    if (!btnAlvo) return;

    observerBotaoAtualizarOT = new MutationObserver(() => {
        garantirBotaoAtualizacaoDisponivel();
    });

    observerBotaoAtualizarOT.observe(btnAlvo, {
        attributes: true,
        attributeFilter: ['disabled', 'class', 'style', 'hidden', 'aria-disabled']
    });
}

// Event listeners
document.addEventListener('DOMContentLoaded', function() {
    popularSelectsServicos();
    
    // Atualizar multiplicadores no select com valores das Opções
    const multiplicadorEl = document.getElementById('multiplicadorServico');
    if (multiplicadorEl) {
        const mult = obterMultiplicadores();
        multiplicadorEl.innerHTML = `
            <option value="normal">Normal (${mult.normal}x)</option>
            <option value="dobrado">Dobrado (${mult.dobrado}x)</option>
        `;
    }
    
    // Listener para mudança de serviço
    const selectTipoServico = document.getElementById('tipoServico');
    if (selectTipoServico) {
        selectTipoServico.addEventListener('change', function() {
            if (this.value) {
                try {
                    const servico = JSON.parse(this.value);
                    const categoriaEl = document.getElementById('categoriaServico');
                    const redeEl = document.getElementById('redeServico');
                    const valorEl = document.getElementById('valorServico');
                    if (categoriaEl) categoriaEl.value = servico.categoria || '';
                    if (redeEl) redeEl.value = servico.red || '';
                    if (valorEl) valorEl.value = (parseFloat(servico.valor) || 0).toFixed(2);

                    // Auto-preencher Tipo de Trabalho se o serviço tiver associação
                    if (servico.tipoTrabalho) {
                        const selectTrab = document.getElementById('tipoTrabalho');
                        if (selectTrab) selectTrab.value = servico.tipoTrabalho;
                    }

                    calcularValorTotalComMultiplicador();
                } catch (e) {
                    console.error('Erro ao processar serviço:', e);
                }
            } else {
                // Limpar campos quando desselecionar
                const categoriaEl = document.getElementById('categoriaServico');
                const valorEl = document.getElementById('valorServico');
                const valorTotalEl = document.getElementById('valorTotal');
                if (categoriaEl) categoriaEl.value = '';
                if (valorEl) valorEl.value = '';
                if (valorTotalEl) valorTotalEl.value = '';
            }
        });
    }
    
    // Listener para mudança de adicional (desabilitado - agora usa botão "Adicionar")
    // Os adicionais são geridos pelo adicionarAdicional() no script1.js
    
    // Listener para mudança de multiplicador
    if (multiplicadorEl) {
        multiplicadorEl.addEventListener('change', calcularValorTotalComMultiplicador);
    }
    
    // Listener para mudança de data da OT (recalcular prémios de sábado/domingo)
    const dataOTEl = document.getElementById('dataOT');
    if (dataOTEl) {
        dataOTEl.addEventListener('change', calcularValorTotalComMultiplicador);
    }

    // Reforço: qualquer alteração em campos do formulário mantém botão de atualizar habilitado em edição
    document.addEventListener('input', function() {
        garantirBotaoAtualizacaoDisponivel();
    });
    document.addEventListener('change', function() {
        garantirBotaoAtualizacaoDisponivel();
    });

    // DEBUG: ouvir mudança do checkbox de Bônus para diagnosticar efeitos colaterais (remoção posterior)
    const debugBonusCheck = document.getElementById('otPremioFestivo');
    if (debugBonusCheck) {
        debugBonusCheck.addEventListener('change', function(e) {
            console.log('[DEBUG] otPremioFestivo change:', this.checked, 'event target:', e.target);
        });
    }

    // Estado inicial + reforço para carregamento assíncrono na página inicial
    garantirBotaoAtualizacaoDisponivel();
    setTimeout(garantirBotaoAtualizacaoDisponivel, 50);
    setTimeout(garantirBotaoAtualizacaoDisponivel, 250);
    setTimeout(garantirBotaoAtualizacaoDisponivel, 600);

    iniciarMonitorBotaoAtualizarOT();
});

// Compatibilidade: manter nome da variável global para não quebrar código existente
const servicosMOI = carregarServicosCustomizados();

// Função para recarregar serviços (útil após atualizar tabelas)
function recarregarServicos() {
    const servicos = carregarServicosCustomizados();
    popularSelectsServicos();
    return servicos;
}
