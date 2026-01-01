let ordensTrabalho = JSON.parse(localStorage.getItem('ordensTrabalho')) || [];
let equipamentosTemp = []; // Array temporário para equipamentos antes de salvar OT

// Inicialização
document.addEventListener('DOMContentLoaded', function() {
    popularTodosServicos();
    popularAdicionais();
    atualizarTabela();
    atualizarResumos();
    definirDataAtual();
    atualizarListaEquipamentos();
    carregarConfiguracaoVeiculo();
    
    // Listener para atualizar valor quando serviço for selecionado
    document.getElementById('tipoServico').addEventListener('change', atualizarValorServico);
    
    // Listener para adicional
    document.getElementById('adicionalServico').addEventListener('change', atualizarValorAdicional);
});

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
    
    // Valor total com multiplicador
    const valorTotalFinal = parseFloat(document.getElementById('valorTotal').value) || (valorServicoBase + valorAdicionalBase);
    
    const ot = {
        id: Date.now(),
        data: new Date().toISOString(),
        numeroOT: numeroOT || '-',
        tipoServico: servicoInfo ? servicoInfo.item : (tipoServico || '-'),
        categoria: categoriaSelecionada,
        rede: servicoInfo ? servicoInfo.red : '',
        tipologia: servicoInfo ? servicoInfo.tipologia : '',
        adicional: adicionalInfo ? adicionalInfo.item : (adicionalSelecionado || ''),
        adicionalDesc: adicionalInfo ? adicionalInfo.tipologia : '',
        valorAdicional: valorAdicionalBase,
        multiplicador: tipoMultiplicador,
        valorMultiplicador: valorMultiplicador,
        equipamentos: [...equipamentosTemp], // Copiar array de equipamentos
        tipoTrabalho: document.getElementById('tipoTrabalho').value || '-',
        observacoes: document.getElementById('observacoes').value || '',
        valorServico: valorTotalFinal
    };
    
    ordensTrabalho.push(ot);
    salvarDados();
    atualizarTabela();
    atualizarResumos();
    limparFormulario();
    
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
    
    equipamentosTemp = [];
    atualizarListaEquipamentos();
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
    } else {
        // Fallback para cálculo simples
        const valorServico = parseFloat(document.getElementById('valorServico').value.replace(' ', '').replace(',', '.')) || 0;
        const valorAdicional = parseFloat(document.getElementById('valorAdicional').value.replace(' ', '').replace(',', '.')) || 0;
        const total = valorServico + valorAdicional;
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
    
    otsFiltradas.reverse().forEach(ot => {
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
            <td><button class="btn-delete" onclick="deletarOT(${ot.id})">🗑️</button></td>
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

function deletarOT(id) {
    if (confirm('Deseja realmente excluir esta ordem de trabalho?')) {
        ordensTrabalho = ordensTrabalho.filter(ot => ot.id !== id);
        salvarDados();
        atualizarTabela();
        atualizarResumos();
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
    
    document.getElementById('qtdDia').textContent = otsDia.length;
    document.getElementById('valorDia').textContent = `€ ${valorDia.toFixed(2)}`;
    document.getElementById('qtdMes').textContent = otsMes.length;
    document.getElementById('valorMes').textContent = `€ ${valorMes.toFixed(2)}`;
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
    
    otsFiltradas.reverse().forEach(ot => {
        const tr = document.createElement('tr');
        const data = new Date(ot.data);
        
        tr.innerHTML = `
            <td>${data.toLocaleDateString('pt-BR')}</td>
            <td><strong>${ot.numeroOT}</strong></td>
            <td><small>${ot.tipoServico}</small></td>
            <td><small>${ot.adicional ? ot.adicional : '-'}</small></td>
            <td><small>${ot.categoria || '-'}</small></td>
            <td><span class="badge-rede">${ot.rede || '-'}</span></td>
            <td>${formatarTipoTrabalho(ot.tipoTrabalho)}</td>
            <td><small>${ot.macEquipamento}</small></td>
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
        tbody.innerHTML = '<tr class="empty-state"><td colspan="10">Nenhum equipamento encontrado com este MAC</td></tr>';
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
            <td><button class="btn-delete" onclick="deletarOT(${ot.id})">🗑️</button></td>
        `;
        
        tbody.appendChild(tr);
    });
}

function gerarPDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('landscape'); // Modo paisagem para mais colunas
    
    const mesAtual = document.getElementById('filtroMes').value || 
                     `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
    
    const categoriaFiltro = document.getElementById('filtroCategoria').value;
    const redeFiltro = document.getElementById('filtroRede').value;
    
    let otsMes = ordensTrabalho.filter(ot => {
        const dataOT = new Date(ot.data);
        const mesAno = `${dataOT.getFullYear()}-${String(dataOT.getMonth() + 1).padStart(2, '0')}`;
        return mesAno === mesAtual;
    });
    
    // Aplicar filtros adicionais
    if (categoriaFiltro) {
        otsMes = otsMes.filter(ot => ot.categoria === categoriaFiltro);
    }
    if (redeFiltro) {
        otsMes = otsMes.filter(ot => ot.rede === redeFiltro);
    }
    
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
    
    // Tabela
    const tableData = otsMes.map(ot => {
        return [
            new Date(ot.data).toLocaleDateString('pt-BR'),
            ot.numeroOT,
            ot.tipoServico,
            ot.categoria || '-',
            formatarTipoTrabalho(ot.tipoTrabalho).replace(/[🔧⚙️📦]/g, ''),
            ot.observacoes || '-',
            `€ ${ot.valorServico.toFixed(2)}`
        ];
    });
    
    doc.autoTable({
        startY: categoriaFiltro || redeFiltro ? 40 : 35,
        head: [['Data', 'OT', 'Serviço', 'Categoria', 'Tipo', 'Observações', 'Valor']],
        body: tableData,
        theme: 'striped',
        headStyles: { fillColor: [102, 126, 234] },
        styles: { fontSize: 8 },
        columnStyles: {
            0: { cellWidth: 22 },
            1: { cellWidth: 20 },
            2: { cellWidth: 50 },
            3: { cellWidth: 40 },
            4: { cellWidth: 25 },
            5: { cellWidth: 60 },
            6: { cellWidth: 25, fontStyle: 'bold' }
        }
    });
    
    // Resumo
    const totalValor = otsMes.reduce((sum, ot) => sum + ot.valorServico, 0);
    
    const finalY = doc.lastAutoTable.finalY + 10;
    doc.setFontSize(11);
    doc.text(`Total de OTs: ${otsMes.length}`, 14, finalY);
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.text(`VALOR A RECEBER: € ${totalValor.toFixed(2)}`, 14, finalY + 10);
    
    doc.save(`relatorio-ot-${mesAtual}.pdf`);
}

// Gerar PDF com Equipamentos
function gerarPDFComEquipamentos() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('landscape'); // Modo paisagem para mais colunas
    
    const mesAtual = document.getElementById('filtroMes').value || 
                     `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
    
    const categoriaFiltro = document.getElementById('filtroCategoria').value;
    const redeFiltro = document.getElementById('filtroRede').value;
    
    let otsMes = ordensTrabalho.filter(ot => {
        const dataOT = new Date(ot.data);
        const mesAno = `${dataOT.getFullYear()}-${String(dataOT.getMonth() + 1).padStart(2, '0')}`;
        return mesAno === mesAtual;
    });
    
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
    
    const finalY = doc.lastAutoTable.finalY + 10;
    doc.setFontSize(11);
    doc.text(`Total de OTs: ${otsMes.length}`, 14, finalY);
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.text(`VALOR A RECEBER: € ${totalValor.toFixed(2)}`, 14, finalY + 10);
    
    doc.save(`relatorio-ot-equipamentos-${mesAtual}.pdf`);
}

// ==================== BACKUP LOCAL (JSON) ====================
function exportarBackup() {
    try {
        const payload = {
            geradoEm: new Date().toISOString(),
            versao: 1,
            ordensTrabalho: ordensTrabalho,
            registrosLogistica: registrosLogistica,
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

                if (novasOTs.length === 0 && novaLogistica.length === 0) {
                    alert('Backup não contém registros para importar.');
                    return;
                }

                const substituir = confirm('Deseja SUBSTITUIR todos os dados atuais pelos do backup?\nClique em OK para substituir.\nClique em Cancelar para mesclar (sem duplicar por id).');

                if (substituir) {
                    ordensTrabalho = novasOTs;
                    registrosLogistica = novaLogistica;
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
                }

                // Persistir
                localStorage.setItem('ordensTrabalho', JSON.stringify(ordensTrabalho));
                localStorage.setItem('registrosLogistica', JSON.stringify(registrosLogistica));

                // Atualizar UI
                atualizarTabela();
                atualizarResumos();
                atualizarTabelaLogistica();

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
    const hoje = new Date().toISOString().split('T')[0];
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
        if (typeof registroDiaAtual.premioFestivoDia !== 'undefined' && document.getElementById('premioFestivoDia')) {
            document.getElementById('premioFestivoDia').value = registroDiaAtual.premioFestivoDia;
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
document.getElementById('premioFestivoDia')?.addEventListener('change', salvarRegistroDiaAtual);
document.getElementById('litrosAbastecidos')?.addEventListener('change', salvarRegistroDiaAtual);
document.getElementById('observacoesLogistica')?.addEventListener('input', salvarRegistroDiaAtual);

function salvarRegistroDiaAtual() {
    const hoje = new Date().toISOString().split('T')[0];
    const dataForm = document.getElementById('dataLogistica').value;
    
    // Só salva automaticamente se for o dia atual
    if (dataForm === hoje) {
        registroDiaAtual = {
            data: dataForm,
            horaInicio: document.getElementById('horaInicioJornada').value,
            kmInicial: parseFloat(document.getElementById('kmInicial').value) || 0,
            valorAbastecimento: parseFloat(document.getElementById('valorAbastecimento').value) || 0,
            premioFestivoDia: parseFloat(document.getElementById('premioFestivoDia')?.value) || 0,
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
    const hoje = new Date().toISOString().split('T')[0];
    
    if (dataSelecionada !== hoje) {
        // Data retroativa - limpar campos
        document.getElementById('horaInicioJornada').value = '';
        document.getElementById('horaFimJornada').value = '';
        document.getElementById('kmInicial').value = '';
        document.getElementById('kmFinal').value = '';
        document.getElementById('valorAbastecimento').value = '';
        if (document.getElementById('premioFestivoDia')) document.getElementById('premioFestivoDia').value = '';
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
        data: document.getElementById('dataLogistica').value || new Date().toISOString().split('T')[0],
        horaInicio: document.getElementById('horaInicioJornada').value || '-',
        horaFim: document.getElementById('horaFimJornada').value || '-',
        kmInicial: kmInicial,
        kmFinal: kmFinal,
        kmRodados: kmRodados,
        valorAbastecimento: parseFloat(document.getElementById('valorAbastecimento').value) || 0,
        premioFestivoDia: parseFloat(document.getElementById('premioFestivoDia')?.value) || 0,
        litrosAbastecidos: litrosAbastecidos,
        litrosGastos: litrosGastos,
        consumoMedio: consumoReal,
        observacoes: document.getElementById('observacoesLogistica').value || ''
    };
    
    console.log('Salvando registro de logística:', registro);
    
    registrosLogistica.push(registro);
    localStorage.setItem('registrosLogistica', JSON.stringify(registrosLogistica));
    
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
        tbody.innerHTML = '<tr class="empty-state"><td colspan="10">Nenhum registro de logística encontrado</td></tr>';
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
            <td><strong style='color:#8e44ad;'>${(reg.premioFestivoDia || 0) > 0 ? '€ ' + (reg.premioFestivoDia || 0).toFixed(2) : '-'}</strong></td>
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




