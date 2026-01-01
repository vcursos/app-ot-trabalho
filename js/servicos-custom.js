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
                valor: item.valor,
                categoria: 'INSTALACIONES'
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
                valor: item.valor,
                categoria: 'AVERIAS + POSTVENTAS'
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
                valor: item.valor,
                categoria: 'ADICIONALES'
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
                    option.textContent = `${servico.item} - ${servico.tipologia}`;
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
                option.textContent = `${servico.item} - ${servico.tipologia}`;
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
            premioFestivo: 0
        };
    }
    const parsed = JSON.parse(mult);
    return {
        normal: 1.0,
        domingoFeriado: 1.5,
        dobrado: 2.0,
        premioFestivo: 0,
        ...parsed
    };
}

// Aplicar multiplicador a um valor
function aplicarMultiplicador(valor, tipo) {
    const mult = obterMultiplicadores();
    return valor * (mult[tipo] || 1.0);
}

// Calcular valor total com multiplicador
function calcularValorTotalComMultiplicador() {
    const valorServicoEl = document.getElementById('valorServico');
    const valorAdicionalEl = document.getElementById('valorAdicional');
    const multiplicadorEl = document.getElementById('multiplicadorServico');
    const valorTotalEl = document.getElementById('valorTotal');
    
    if (!valorServicoEl || !valorTotalEl) return;
    
    const valorServico = parseFloat(valorServicoEl.value) || 0;
    const valorAdicional = parseFloat(valorAdicionalEl ? valorAdicionalEl.value : 0) || 0;
    const tipoMult = multiplicadorEl ? multiplicadorEl.value : 'normal';
    
    // Somar valores base
    const valorBase = valorServico + valorAdicional;
    
    // Aplicar multiplicador
    const valorFinal = aplicarMultiplicador(valorBase, tipoMult);
    
    valorTotalEl.value = valorFinal.toFixed(2);
    
    // Atualizar label do multiplicador para mostrar o valor
    if (multiplicadorEl) {
        const mult = obterMultiplicadores();
        const options = multiplicadorEl.options;
        for (let i = 0; i < options.length; i++) {
            const tipo = options[i].value;
            const valorMult = mult[tipo] || 1.0;
            const label = tipo === 'normal' ? 'Normal' :
                         tipo === 'domingoFeriado' ? 'Domingo/Feriado' :
                         'Dobrado';
            options[i].text = `${label} (${valorMult}x)`;
        }
    }
}

// Event listeners
document.addEventListener('DOMContentLoaded', function() {
    popularSelectsServicos();
    
    // Atualizar multiplicadores no select
    const multiplicadorEl = document.getElementById('multiplicadorServico');
    if (multiplicadorEl) {
        const mult = obterMultiplicadores();
        multiplicadorEl.innerHTML = `
            <option value="normal">Normal (${mult.normal}x)</option>
            <option value="domingoFeriado">Domingo/Feriado (${mult.domingoFeriado}x)</option>
            <option value="dobrado">Dobrado (${mult.dobrado}x)</option>
        `;
    }
    
    // Listener para mudança de serviço
    const selectTipoServico = document.getElementById('tipoServico');
    if (selectTipoServico) {
        selectTipoServico.addEventListener('change', function() {
            if (this.value) {
                const servico = JSON.parse(this.value);
                document.getElementById('categoriaServico').value = servico.categoria;
                document.getElementById('redeServico').value = servico.red;
                document.getElementById('valorServico').value = servico.valor.toFixed(2);
                calcularValorTotalComMultiplicador();
            }
        });
    }
    
    // Listener para mudança de adicional
    const selectAdicional = document.getElementById('adicionalServico');
    if (selectAdicional) {
        selectAdicional.addEventListener('change', function() {
            if (this.value) {
                const adicional = JSON.parse(this.value);
                document.getElementById('valorAdicional').value = adicional.valor.toFixed(2);
            } else {
                document.getElementById('valorAdicional').value = '0.00';
            }
            calcularValorTotalComMultiplicador();
        });
    }
    
    // Listener para mudança de multiplicador
    if (multiplicadorEl) {
        multiplicadorEl.addEventListener('change', calcularValorTotalComMultiplicador);
    }
});

// Compatibilidade: manter nome da variável global para não quebrar código existente
const servicosMOI = carregarServicosCustomizados();

// Função para recarregar serviços (útil após atualizar tabelas)
function recarregarServicos() {
    const servicos = carregarServicosCustomizados();
    popularSelectsServicos();
    return servicos;
}
