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
    dobrado: 2.0
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
    return JSON.parse(mult);
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
    
    // Renderizar todas as tabelas
    renderizarTabela('instalacoes', tabelas.instalacoes);
    renderizarTabela('avarias', tabelas.avarias);
    renderizarTabela('adicionais', tabelas.adicionais);
});

// Mostrar categoria
function mostrarCategoria(categoria) {
    // Remover active de todas tabs
    document.querySelectorAll('.config-tab').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.config-section').forEach(section => section.classList.remove('active'));
    
    // Ativar tab e seção clicada
    event.target.classList.add('active');
    document.getElementById('cat-' + categoria).classList.add('active');
}

// Renderizar tabela na interface
function renderizarTabela(categoria, dados) {
    const tbody = document.getElementById('tbody-' + categoria);
    tbody.innerHTML = '';
    
    dados.forEach((item, index) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>
                <input type="text" value="${item.codigo}" data-field="codigo" data-index="${index}">
                <button class="btn-edit-mobile" onclick="abrirModal('${categoria}', ${index})">✏️ Editar</button>
            </td>
            <td>
                <select data-field="rede" data-index="${index}">
                    <option value="AMBAS" ${item.rede === 'AMBAS' ? 'selected' : ''}>AMBAS</option>
                    <option value="Propia" ${item.rede === 'Propia' ? 'selected' : ''}>Propia</option>
                    <option value="MOVISTAR" ${item.rede === 'MOVISTAR' ? 'selected' : ''}>MOVISTAR</option>
                    <option value="Outra" ${item.rede === 'Outra' ? 'selected' : ''}>Outra</option>
                </select>
            </td>
            <td><input type="text" value="${item.descricao}" data-field="descricao" data-index="${index}"></td>
            <td><input type="number" step="0.01" value="${item.valor}" data-field="valor" data-index="${index}"></td>
            <td><button class="btn-small btn-remove" onclick="removerLinha('${categoria}', ${index})">🗑️</button></td>
        `;
        tbody.appendChild(tr);
    });
}

// Adicionar nova linha
function adicionarLinha(categoria) {
    const tabelas = carregarTabelas();
    const proximoCodigo = gerarProximoCodigo(categoria, tabelas[categoria]);
    
    tabelas[categoria].push({
        codigo: proximoCodigo,
        rede: 'AMBAS',
        descricao: 'Novo serviço',
        valor: 0.00
    });
    
    renderizarTabela(categoria, tabelas[categoria]);
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
        dobrado: parseFloat(document.getElementById('multDobrado').value) || 2.0
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
    document.getElementById('modal-rede').value = item.rede;
    document.getElementById('modal-descricao').value = item.descricao;
    document.getElementById('modal-valor').value = item.valor;
    
    // Mostrar modal
    document.getElementById('modalEdit').classList.add('active');
    
    // Focar no primeiro campo
    setTimeout(() => {
        document.getElementById('modal-codigo').focus();
    }, 100);
}

// Fechar modal
function fecharModal() {
    document.getElementById('modalEdit').classList.remove('active');
    modalCategoriaAtual = '';
    modalIndexAtual = -1;
}

// Aplicar edição do modal
function aplicarEdicao() {
    if (modalCategoriaAtual === '' || modalIndexAtual === -1) return;
    
    const tabelas = carregarTabelas();
    
    // Atualizar dados
    tabelas[modalCategoriaAtual][modalIndexAtual] = {
        codigo: document.getElementById('modal-codigo').value,
        rede: document.getElementById('modal-rede').value,
        descricao: document.getElementById('modal-descricao').value,
        valor: parseFloat(document.getElementById('modal-valor').value) || 0
    };
    
    // Salvar
    salvarTabelasNoStorage(tabelas);
    
    // Re-renderizar tabela
    renderizarTabela(modalCategoriaAtual, tabelas[modalCategoriaAtual]);
    
    // Fechar modal
    fecharModal();
    
    alert('Serviço atualizado! ✅ Não esqueça de clicar em "💾 Salvar Tabela" para manter as alterações.');
}

// Fechar modal ao clicar fora
document.addEventListener('click', function(e) {
    const modal = document.getElementById('modalEdit');
    if (e.target === modal) {
        fecharModal();
    }
});
