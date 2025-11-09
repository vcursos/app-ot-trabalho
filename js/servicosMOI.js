const servicosMOI = [
  // INSTALACIONES FTTH B2C
  { item: 'MOI01', red: 'AMBAS', tipologia: 'Nueva exterior (incl. migra. FTTH) hasta 60m', valor: 44.00, categoria: 'INSTALACIONES FTTH B2C' },
  { item: 'MOI02', red: 'AMBAS', tipologia: 'Nueva exterior (incl. migra. FTTH) desde 80m', valor: 53.00, categoria: 'INSTALACIONES FTTH B2C' },
  { item: 'MOI03', red: 'Propia', tipologia: 'Nueva interior (incl. migra. FTTH) hasta 60m', valor: 40.00, categoria: 'INSTALACIONES FTTH B2C' },
  { item: 'MOI04', red: 'Propia', tipologia: 'Nueva interior (incl. migra. FTTH) desde 80m', valor: 48.00, categoria: 'INSTALACIONES FTTH B2C' },
  { item: 'MOI05', red: 'AMBAS', tipologia: 'Reutilizada int/ext (incl. migra. FTTH)', valor: 27.00, categoria: 'INSTALACIONES FTTH B2C' },
  { item: 'MOI06', red: 'MOVISTAR', tipologia: 'Nueva interior hasta 60m', valor: 40.00, categoria: 'INSTALACIONES FTTH B2C' },
  { item: 'MOI07', red: 'MOVISTAR', tipologia: 'Nueva interior desde 80m', valor: 49.00, categoria: 'INSTALACIONES FTTH B2C' },
  { item: 'MOI08', red: 'AMBAS', tipologia: 'Nueva postes hasta 60m', valor: 82.00, categoria: 'INSTALACIONES FTTH B2C' },
  { item: 'MOI09', red: 'AMBAS', tipologia: 'Nueva postes desde 80m a 220M', valor: 91.00, categoria: 'INSTALACIONES FTTH B2C' },
  { item: 'MOI10', red: 'AMBAS', tipologia: 'Nueva postes > 220M', valor: 95.00, categoria: 'INSTALACIONES FTTH B2C' },
  { item: 'MOI11', red: 'AMBAS', tipologia: 'Reutilizada postes', valor: 45.00, categoria: 'INSTALACIONES FTTH B2C' },
  { item: 'MOI12', red: 'MOVISTAR', tipologia: 'Alta sobre ocupado (ASO)', valor: 22.00, categoria: 'INSTALACIONES FTTH B2C' },
  { item: 'MOI13', red: 'Propia', tipologia: 'Puente en el ODF de la cabecera', valor: 13.00, categoria: 'INSTALACIONES FTTH B2C' },
  { item: 'MOI14', red: 'MOVISTAR', tipologia: 'Instalacion servicio FTTH (2 pasos)', valor: 22.00, categoria: 'INSTALACIONES FTTH B2C' },
  
  // ADICIONALES HOGAR FTTH
  { item: 'MOI15', red: 'AMBAS', tipologia: 'Instalación STB', valor: 4.00, categoria: 'ADICIONALES HOGAR FTTH' },
  { item: 'MOI16', red: 'AMBAS', tipologia: 'Prescripción + Instalación REPE y MESH', valor: 6.00, categoria: 'ADICIONALES HOGAR FTTH' },
  { item: 'MOI17', red: 'AMBAS', tipologia: 'Instalación REPE y MESH provisionado', valor: 3.00, categoria: 'ADICIONALES HOGAR FTTH' },
  
  // AVERIAS + POSTVENTAS B2C
  { item: 'MOI25', red: 'AMBAS', tipologia: 'Avería Laborable (FTTH + ADSL)', valor: 16.00, categoria: 'AVERIAS + POSTVENTAS B2C' },
  { item: 'MOI26', red: 'AMBAS', tipologia: 'Postventa (Visita sin averia) (FTTH+ADSL)', valor: 16.00, categoria: 'AVERIAS + POSTVENTAS B2C' },
  { item: 'MOI27', red: 'AMBAS', tipologia: 'Mantenimiento Cliente HFC', valor: 16.00, categoria: 'AVERIAS + POSTVENTAS B2C' },
  { item: 'MOI28', red: 'AMBAS', tipologia: 'Postventa a petición de cliente (facturables) (FTTH+ADSL)', valor: 16.00, categoria: 'AVERIAS + POSTVENTAS B2C' },
  { item: 'MOI29', red: 'AMBAS', tipologia: 'Extra Fin de Semana', valor: 1.17, categoria: 'AVERIAS + POSTVENTAS B2C' },
  { item: 'MOI30', red: 'AMBAS', tipologia: 'Mantenimiento Cliente sin desplazamiento', valor: 0.00, categoria: 'AVERIAS + POSTVENTAS B2C' },
  { item: 'MOI31', red: 'AMBAS', tipologia: 'Complemento subida Poste Laborable', valor: 16.00, categoria: 'AVERIAS + POSTVENTAS B2C' },
  { item: 'MOI32', red: 'AMBAS', tipologia: 'Complemento subida Poste Festivo', valor: 24.00, categoria: 'AVERIAS + POSTVENTAS B2C' },
  
  // INSTALACIONES HFC
  { item: 'MOI33', red: 'Propia', tipologia: 'HFC Instalacion Acometida Precableada - HFC - EUSKALTEL', valor: 32.00, categoria: 'INSTALACIONES HFC' },
  { item: 'MOI34', red: 'Propia', tipologia: 'HFC Instalacion Acometida exterior - HFC - EUSKALTEL', valor: 47.00, categoria: 'INSTALACIONES HFC' },
  { item: 'MOI35', red: 'Propia', tipologia: 'HFC Instalacion Acometida Interior - HFC - EUSKALTEL', valor: 39.00, categoria: 'INSTALACIONES HFC' },
  { item: 'MOI36', red: 'Propia', tipologia: 'HFC Instalacion reutilizada - HFC - EUSKALTEL', valor: 20.00, categoria: 'INSTALACIONES HFC' },
  { item: 'MOI37', red: 'Propia', tipologia: 'HFC Instalacion Acometida Precableada - HFC - TELECABLE', valor: 32.00, categoria: 'INSTALACIONES HFC' },
  { item: 'MOI38', red: 'Propia', tipologia: 'HFC Instalacion Acometida exterior - HFC - TELECABLE', valor: 47.00, categoria: 'INSTALACIONES HFC' },
  { item: 'MOI39', red: 'Propia', tipologia: 'HFC Instalacion Acometida interior - HFC - TELECABLE', valor: 39.00, categoria: 'INSTALACIONES HFC' },
  { item: 'MOI40', red: 'Propia', tipologia: 'HFC Instalacion reutilizada - HFC - TELECABLE', valor: 20.00, categoria: 'INSTALACIONES HFC' },
  { item: 'MOI41', red: 'Propia', tipologia: 'HFC Instalacion Acometida Precableada - HFC - R-CABLE', valor: 32.00, categoria: 'INSTALACIONES HFC' },
  { item: 'MOI42', red: 'Propia', tipologia: 'HFC Instalacion Acometida exterior - HFC - R-CABLE', valor: 47.00, categoria: 'INSTALACIONES HFC' },
  { item: 'MOI43', red: 'Propia', tipologia: 'HFC Instalacion Acometida interior - HFC - R-CABLE', valor: 39.00, categoria: 'INSTALACIONES HFC' },
  { item: 'MOI44', red: 'Propia', tipologia: 'HFC Instalacion reutilizada - HFC - R-CABLE', valor: 20.00, categoria: 'INSTALACIONES HFC' },
  { item: 'MOI45', red: 'Propia', tipologia: 'HFC Inst. Television con cableado. Incluido en la ot. Sin desplazamiento', valor: 5.00, categoria: 'INSTALACIONES HFC' },
  { item: 'MOI46', red: 'Propia', tipologia: 'HFC Complemento subida a poste en Instalaciones HFC', valor: 20.00, categoria: 'INSTALACIONES HFC' },
];

// Função para popular o select
function popularSelectServicos(selectId) {
  const select = document.getElementById(selectId);
  if (!select) return;
  
  // Limpar opções existentes
  select.innerHTML = '<option value="">Selecione um serviço</option>';
  
  // Adicionar opções agrupadas por categoria
  let categoriaAtual = '';
  
  servicosMOI.forEach(servico => {
    if (servico.categoria !== categoriaAtual) {
      // Criar optgroup para nova categoria
      const optgroup = document.createElement('optgroup');
      optgroup.label = servico.categoria;
      select.appendChild(optgroup);
      categoriaAtual = servico.categoria;
    }
    
    // Criar option
    const option = document.createElement('option');
    option.value = servico.item;
    option.textContent = `${servico.item} - ${servico.tipologia}`;
    option.dataset.valor = servico.valor;
    option.dataset.red = servico.red;
    option.dataset.categoria = servico.categoria;
    option.dataset.tipologia = servico.tipologia;
    
    // Adicionar ao último optgroup
    select.lastChild.appendChild(option);
  });
}

// Função para obter valor do serviço
function getValorServico(itemMOI) {
  const servico = servicosMOI.find(s => s.item === itemMOI);
  return servico ? servico.valor : 0;
}

// Função para obter informações completas do serviço
function getServicoInfo(itemMOI) {
  return servicosMOI.find(s => s.item === itemMOI);
}
