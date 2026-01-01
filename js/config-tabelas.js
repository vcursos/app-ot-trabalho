// Gerenciador de Tabelas de Preços Customizadas
// Sistema de configuração de serviços, valores e multiplicadores

// Dados padrão das tabelas (MOI - pode ser usado como base inicial)
const tabelasPadrao = {
    instalacoes: [
        { codigo: 'INST01', rede: 'AMBAS', descricao: 'Nova exterior até 60m', valor: 44.00 },
        { codigo: 'INST02', rede: 'AMBAS', descricao: 'Nova exterior desde 80m', valor: 53.00 },
        { codigo: 'INST03', rede: 'Propia', descricao: 'Nova interior até 60m', valor: 40.00 },
        { codigo: 'INST04', rede: 'Propia', descricao: 'Nova interior desde 80m', valor: 48.00 },
        { codigo: 'INST05', rede: 'AMBAS', descricao: 'Reutilizada int/ext', valor: 27.00 },
    ],
    avarias: [
        { codigo: 'AVAR01', rede: 'AMBAS', descricao: 'Avería Laborable', valor: 16.00 },
        { codigo: 'AVAR02', rede: 'AMBAS', descricao: 'Postventa (Visita sem averia)', valor: 16.00 },
        { codigo: 'AVAR03', rede: 'AMBAS', descricao: 'Manutenção Cliente HFC', valor: 16.00 },
        { codigo: 'AVAR04', rede: 'AMBAS', descricao: 'Complemento subida Poste Laborable', valor: 16.00 },
        { codigo: 'AVAR05', rede: 'AMBAS', descricao: 'Complemento subida Poste Festivo', valor: 24.00 },
    ],
    adicionais: [
        { codigo: 'ADIC01', rede: 'AMBAS', descricao: 'Instalação STB', valor: 4.00 },
        { codigo: 'ADIC02', rede: 'AMBAS', descricao: 'Prescrição + Instalação REPE e MESH', valor: 6.00 },
        { codigo: 'ADIC03', rede: 'AMBAS', descricao: 'Instalação REPE e MESH provisionado', valor: 3.00 },
    ]
};

// Multiplicadores padrão
const multiplicadoresPadrao = {
    normal: 1.0,
    domingoFeriado: 1.5,
    dobrado: 2.0,
    premioFestivo: 0
};

// Carregar ou inicializar tabelas
function carregarTabelas() {
    let tabelas = localStorage.getItem('tabelasCustomizadas');
    if (!tabelas) {
        // Primeira vez - usar padrão
        localStorage.setItem('tabelasCustomizadas', JSON.stringify(tabelasPadrao));
        return tabelasPadrao;
    }
    return JSON.parse(tabelas);
}

// Carregar ou inicializar multiplicadores
function carregarMultiplicadores() {
    let mult = localStorage.getItem('multiplicadores');
    if (!mult) {
        localStorage.setItem('multiplicadores', JSON.stringify(multiplicadoresPadrao));
        return multiplicadoresPadrao;
    }
    const parsed = JSON.parse(mult);
    // Retrocompatibilidade: caso o storage antigo não tenha campos novos
    return {
        ...multiplicadoresPadrao,
        ...parsed
    };
}

// Salvar tabelas
function salvarTabelasNoStorage(tabelas) {
    localStorage.setItem('tabelasCustomizadas', JSON.stringify(tabelas));
}

// Salvar multiplicadores
function salvarMultiplicadoresNoStorage(mult) {
    localStorage.setItem('multiplicadores', JSON.stringify(mult));
}

// Inicializar página
document.addEventListener('DOMContentLoaded', function() {
    const tabelas = carregarTabelas();
    const mult = carregarMultiplicadores();
    
    // Carregar multiplicadores nos inputs
    document.getElementById('multDomingoFeriado').value = mult.domingoFeriado;
    document.getElementById('multDobrado').value = mult.dobrado;
    document.getElementById('multNormal').value = mult.normal;
    const inputPremio = document.getElementById('premioFestivo');
    if (inputPremio) inputPremio.value = mult.premioFestivo ?? 0;
    
    // Renderizar todas as tabelas
    renderizarTabela('instalacoes', tabelas.instalacoes);
    renderizarTabela('avarias', tabelas.avarias);
    renderizarTabela('adicionais', tabelas.adicionais);
});

// Mostrar categoria
// Obs: não usar o `event` global (pode não existir em alguns WebViews / browsers)
function mostrarCategoria(categoria, el) {
    // Remover active de todas tabs e seções
    document.querySelectorAll('.config-tab').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.config-section').forEach(section => section.classList.remove('active'));

    // Ativar tab clicada (se tiver referência) e seção selecionada
    if (el && el.classList) {
        el.classList.add('active');
    }

    const sec = document.getElementById('cat-' + categoria);
    if (sec) {
        sec.classList.add('active');
    }
}

// Renderizar tabela na interface
function renderizarTabela(categoria, dados) {
    const tbody = document.getElementById('tbody-' + categoria);
    tbody.innerHTML = '';
    
    dados.forEach((item, index) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td onclick="abrirModal('${categoria}', ${index})" style="display: none;">
                <span class="texto-mobile codigo-oculto">
                    ${item.codigo}
                </span>
                <input type="text" value="${item.codigo}" data-field="codigo" data-index="${index}">
            </td>
            <td onclick="abrirModal('${categoria}', ${index})">
                <span class="texto-mobile">
                    <div style="font-size: 11px; color: #666; margin-bottom: 2px;">Descrição:</div>
                    <strong style="font-size: 15px;">${item.descricao}</strong>
                </span>
                <input type="text" value="${item.descricao}" data-field="descricao" data-index="${index}">
            </td>
            <td onclick="abrirModal('${categoria}', ${index})">
                <span class="texto-mobile">
                    <div style="font-size: 11px; color: #666; margin-bottom: 2px;">Valor:</div>
                    <strong style="font-size: 15px;">€${parseFloat(item.valor).toFixed(2)}</strong>
                </span>
                <input type="number" step="0.01" value="${item.valor}" data-field="valor" data-index="${index}">
            </td>
            <td style="white-space: nowrap;">
                <button class="btn-small btn-edit-mobile" onclick="event.stopPropagation(); abrirModal('${categoria}', ${index})" style="margin-right: 5px;">✏️</button>
                <button class="btn-small btn-remove" onclick="event.stopPropagation(); removerLinha('${categoria}', ${index})">🗑️</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// Adicionar nova linha
function adicionarLinha(categoria) {
    // Abre modal em modo "novo serviço"
    abrirModalNovoServico(categoria);
}

// Gerar próximo código disponível
function gerarProximoCodigo(categoria, dados) {
    const prefixos = {
        'instalacoes': 'INST',
        'avarias': 'AVAR',
        'adicionais': 'ADIC'
    };
    
    const prefixo = prefixos[categoria];
    const numeros = dados
        .map(item => item.codigo)
        .filter(cod => cod.startsWith(prefixo))
        .map(cod => parseInt(cod.replace(prefixo, '')))
        .filter(num => !isNaN(num));
    
    const maiorNumero = numeros.length > 0 ? Math.max(...numeros) : 0;
    const proximoNumero = (maiorNumero + 1).toString().padStart(2, '0');
    
    return prefixo + proximoNumero;
}

// Remover linha
function removerLinha(categoria, index) {
    if (!confirm('Tem certeza que deseja remover este serviço?')) return;
    
    const tabelas = carregarTabelas();
    tabelas[categoria].splice(index, 1);
    salvarTabelasNoStorage(tabelas);
    renderizarTabela(categoria, tabelas[categoria]);
    
    alert('Serviço removido com sucesso!');
}

// Salvar tabela
function salvarTabela(categoria) {
    const tbody = document.getElementById('tbody-' + categoria);
    const linhas = tbody.querySelectorAll('tr');
    const dados = [];
    
    linhas.forEach(linha => {
        const inputs = linha.querySelectorAll('input, select');
        const item = {};
        
        inputs.forEach(input => {
            const field = input.dataset.field;
            let value = input.value;
            
            if (field === 'valor') {
                value = parseFloat(value) || 0;
            }
            
            item[field] = value;
        });
        
        dados.push(item);
    });
    
    const tabelas = carregarTabelas();
    tabelas[categoria] = dados;
    salvarTabelasNoStorage(tabelas);
    
    alert('Tabela salva com sucesso! ✅');
}

// Salvar multiplicadores
function salvarMultiplicadores() {
    const mult = {
        normal: 1.0,
        domingoFeriado: parseFloat(document.getElementById('multDomingoFeriado').value) || 1.5,
        dobrado: parseFloat(document.getElementById('multDobrado').value) || 2.0,
        premioFestivo: parseFloat(document.getElementById('premioFestivo')?.value) || 0
    };
    
    salvarMultiplicadoresNoStorage(mult);
    alert('Multiplicadores salvos com sucesso! ✅');
}

// Exportar tabela para JSON
function exportarTabela(categoria) {
    const tabelas = carregarTabelas();
    const dados = tabelas[categoria];
    
    const dataStr = JSON.stringify(dados, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `tabela-${categoria}-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    
    URL.revokeObjectURL(url);
}

// Importar tabela de JSON
function importarTabela(categoria, inputElement) {
    const file = inputElement.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const dados = JSON.parse(e.target.result);
            
            // Validar estrutura
            if (!Array.isArray(dados)) {
                throw new Error('Formato inválido: esperado um array');
            }
            
            // Validar campos
            const camposObrigatorios = ['codigo', 'rede', 'descricao', 'valor'];
            const valido = dados.every(item => 
                camposObrigatorios.every(campo => campo in item)
            );
            
            if (!valido) {
                throw new Error('Formato inválido: campos obrigatórios faltando');
            }
            
            // Salvar
            const tabelas = carregarTabelas();
            tabelas[categoria] = dados;
            salvarTabelasNoStorage(tabelas);
            renderizarTabela(categoria, dados);
            
            alert('Tabela importada com sucesso! ✅');
        } catch (error) {
            alert('Erro ao importar tabela: ' + error.message);
        }
    };
    
    reader.readAsText(file);
    inputElement.value = ''; // Limpar input
}

// Exportar tabela para Excel
function exportarTabelaExcel(categoria) {
    // Verificar se XLSX está disponível
    if (typeof XLSX === 'undefined') {
        alert('❌ Biblioteca Excel não carregada. Recarregue a página.');
        return;
    }
    
    const tabelas = carregarTabelas();
    const dados = tabelas[categoria];
    
    if (!dados || dados.length === 0) {
        alert('Nenhum dado para exportar!');
        return;
    }
    
    try {
        // Criar worksheet
        const ws = XLSX.utils.json_to_sheet(dados);
        
        // Criar workbook
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, categoria);
        
        // Salvar arquivo
        const nomeCategoria = {
            'instalacoes': 'Instalacoes',
            'avarias': 'Avarias',
            'adicionais': 'Adicionais'
        }[categoria] || categoria;
        
        XLSX.writeFile(wb, `tabela-${nomeCategoria}.xlsx`);
        alert(`✅ Tabela exportada: tabela-${nomeCategoria}.xlsx`);
    } catch (error) {
        alert('❌ Erro ao exportar Excel: ' + error.message);
        console.error('Erro detalhado:', error);
    }
}

// Importar tabela de Excel
function importarTabelaExcel(categoria, inputElement) {
    const file = inputElement.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    
    reader.onload = function(e) {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            
            // Pegar primeira planilha
            const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
            const dados = XLSX.utils.sheet_to_json(firstSheet);
            
            if (!Array.isArray(dados) || dados.length === 0) {
                throw new Error('Arquivo vazio ou formato inválido');
            }
            
            // Validar campos obrigatórios
            const camposObrigatorios = ['codigo', 'rede', 'descricao', 'valor'];
            const valido = dados.every(item => 
                camposObrigatorios.every(campo => campo in item)
            );
            
            if (!valido) {
                throw new Error('Formato inválido: campos obrigatórios (codigo, rede, descricao, valor) estão faltando');
            }
            
            // Salvar
            const tabelas = carregarTabelas();
            tabelas[categoria] = dados;
            salvarTabelasNoStorage(tabelas);
            renderizarTabela(categoria, dados);
            
            alert(`✅ Tabela importada com sucesso! ${dados.length} serviços carregados.`);
        } catch (error) {
            alert('❌ Erro ao importar Excel: ' + error.message);
        }
    };
    
    reader.readAsArrayBuffer(file);
    inputElement.value = ''; // Limpar input
}

// Exportar TODAS as configurações (tabelas + multiplicadores)
function exportarTudo() {
    const tabelas = carregarTabelas();
    const mult = carregarMultiplicadores();
    
    const config = {
        tabelas: tabelas,
        multiplicadores: mult,
        exportadoEm: new Date().toISOString()
    };
    
    const dataStr = JSON.stringify(config, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `config-completa-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    
    URL.revokeObjectURL(url);
}

// Funções auxiliares para serem usadas em outras páginas
function obterServicos(categoria) {
    const tabelas = carregarTabelas();
    return tabelas[categoria] || [];
}

function obterMultiplicadores() {
    return carregarMultiplicadores();
}

function aplicarMultiplicador(valor, tipoMultiplicador) {
    const mult = carregarMultiplicadores();
    const multiplicador = mult[tipoMultiplicador] || 1.0;
    return valor * multiplicador;
}

// Variáveis globais para o modal
let modalCategoriaAtual = '';
let modalIndexAtual = -1;

// Abrir modal de edição (mobile)
function abrirModal(categoria, index) {
    modalCategoriaAtual = categoria;
    modalIndexAtual = index;
    
    const tabelas = carregarTabelas();
    const item = tabelas[categoria][index];
    
    // Preencher campos do modal
    document.getElementById('modal-codigo').value = item.codigo;
    
    // Verificar se é "Outra" rede
    if (['AMBAS', 'Propia', 'MOVISTAR'].includes(item.rede)) {
        document.getElementById('modal-rede').value = item.rede;
        document.getElementById('campo-outra-rede-modal').style.display = 'none';
    } else {
        document.getElementById('modal-rede').value = 'Outra';
        document.getElementById('modal-outra-rede').value = item.rede;
        document.getElementById('campo-outra-rede-modal').style.display = 'block';
    }
    
    document.getElementById('modal-descricao').value = item.descricao;
    document.getElementById('modal-valor').value = item.valor;
    
    // Alterar texto do botão para "Salvar Alterações"
    document.getElementById('btn-aplicar-modal').textContent = '✅ Salvar Alterações';
    
    // Mostrar modal
    document.getElementById('modalEdit').classList.add('active');
    
    // Focar no primeiro campo
    setTimeout(() => {
        document.getElementById('modal-descricao').focus();
    }, 100);
}

// Abrir modal para novo serviço
function abrirModalNovoServico(categoria) {
    modalCategoriaAtual = categoria;
    modalIndexAtual = -1; // -1 indica que é um novo serviço
    
    const tabelas = carregarTabelas();
    const proximoCodigo = gerarProximoCodigo(categoria, tabelas[categoria]);
    
    // Limpar e preencher campos do modal
    document.getElementById('modal-codigo').value = proximoCodigo;
    document.getElementById('modal-rede').value = 'AMBAS';
    document.getElementById('modal-descricao').value = '';
    document.getElementById('modal-valor').value = '0.00';
    
    // Alterar texto do botão para "Adicionar Serviço"
    document.getElementById('btn-aplicar-modal').textContent = '➕ Adicionar Serviço';
    
    // Mostrar modal
    document.getElementById('modalEdit').classList.add('active');
    
    // Focar no campo descrição
    setTimeout(() => {
        document.getElementById('modal-descricao').focus();
    }, 100);
}

// Fechar modal
function fecharModal() {
    document.getElementById('modalEdit').classList.remove('active');
    modalCategoriaAtual = '';
    modalIndexAtual = -1;
    // Esconder campo "Outra rede" ao fechar
    document.getElementById('campo-outra-rede-modal').style.display = 'none';
    document.getElementById('modal-outra-rede').value = '';
}

// Mostrar/ocultar campo "Outra Rede" no modal
function verificarRedeOutraModal() {
    const selectRede = document.getElementById('modal-rede');
    const campoOutra = document.getElementById('campo-outra-rede-modal');
    
    if (selectRede.value === 'Outra') {
        campoOutra.style.display = 'block';
    } else {
        campoOutra.style.display = 'none';
        document.getElementById('modal-outra-rede').value = '';
    }
}

// Aplicar edição do modal
function aplicarEdicao() {
    if (modalCategoriaAtual === '') return;
    
    const tabelas = carregarTabelas();
    
    // Obter valor da rede (se for "Outra", pegar do campo de texto)
    const redeSelect = document.getElementById('modal-rede').value;
    const redeValue = redeSelect === 'Outra' 
        ? (document.getElementById('modal-outra-rede').value || 'Outra') 
        : redeSelect;
    
    const novoItem = {
        codigo: document.getElementById('modal-codigo').value,
        rede: redeValue,
        descricao: document.getElementById('modal-descricao').value,
        valor: parseFloat(document.getElementById('modal-valor').value) || 0
    };
    
    if (modalIndexAtual === -1) {
        // Novo serviço - adicionar ao array
        tabelas[modalCategoriaAtual].push(novoItem);
    } else {
        // Editar serviço existente
        tabelas[modalCategoriaAtual][modalIndexAtual] = novoItem;
    }
    
    // Salvar
    salvarTabelasNoStorage(tabelas);
    
    // Re-renderizar tabela
    renderizarTabela(modalCategoriaAtual, tabelas[modalCategoriaAtual]);
    
    // Fechar modal
    fecharModal();
    
    alert(modalIndexAtual === -1 ? 'Serviço adicionado com sucesso! ✅' : 'Alterações salvas com sucesso! ✅');
}

// Fechar modal ao clicar fora
document.addEventListener('click', function(e) {
    const modal = document.getElementById('modalEdit');
    if (e.target === modal) {
        fecharModal();
    }
});
