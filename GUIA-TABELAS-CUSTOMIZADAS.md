# 🎯 NOVO SISTEMA DE TABELAS CUSTOMIZADAS

## ✅ O QUE FOI IMPLEMENTADO

### 1. **Página de Configuração de Tabelas** 
📍 Acesse através do botão **"⚙️ Tabelas"** no topo da página principal

### 2. **Gestão Completa de Serviços**
Você pode agora configurar 3 categorias:

- **🔧 Instalações** - Todos os tipos de instalação (FTTH, HFC, etc.)
- **⚠️ Avarias** - Serviços de avaria e pós-venda
- **➕ Adicionais** - Equipamentos e serviços extras

Para cada serviço você define:
- Código (ex: INST01, AVAR01, ADIC01)
- Rede (AMBAS, Propia, MOVISTAR, Outra)
- Descrição completa
- Valor em euros

### 3. **Sistema de Multiplicadores Configuráveis**
Configure os multiplicadores que sua empresa usa:

- **Normal**: 1.0x (padrão)
- **Domingo/Feriado**: 1.5x (configurável)
- **Dobrado**: 2.0x (configurável)

Os multiplicadores são aplicados automaticamente ao valor total (serviço + adicional).

### 4. **Formulário de OT Atualizado**
O formulário principal agora inclui:
- Campo **"Multiplicador"** para selecionar: Normal / Domingo-Feriado / Dobrado
- Cálculo automático do valor total considerando o multiplicador
- Todos os serviços vêm das suas tabelas customizadas

## 🚀 COMO USAR

### Primeira Configuração (uma vez):

1. **Abra a página de configuração**
   - Clique no botão **"⚙️ Tabelas"** no topo
   
2. **Configure os multiplicadores**
   - Ajuste "Domingo/Feriado" para 1.5
   - Ajuste "Dobrado" para 2.0
   - Clique em "💾 Salvar Multiplicadores"

3. **Personalize suas tabelas**
   - Vá em cada aba (Instalações, Avarias, Adicionais)
   - Clique em "➕ Adicionar Serviço" para novos itens
   - Edite diretamente nas células da tabela
   - Clique em "💾 Salvar Tabela" após mudanças
   - Use 🗑️ para remover serviços

4. **Volte para a página principal**
   - Clique em "← Voltar"

### Registrar uma OT com Multiplicador:

1. Selecione o **Tipo de Serviço** (agora vem da sua tabela)
2. Adicione um **Adicional** se necessário
3. Escolha o **Multiplicador**:
   - **Normal (1x)**: dias de semana normais
   - **Domingo/Feriado (1.5x)**: finais de semana e feriados
   - **Dobrado (2x)**: situações especiais
4. O **Valor Total** é calculado automaticamente

### Exemplo Prático:

```
Serviço: Nova exterior até 60m = €44.00
Adicional: Instalação STB = €4.00
Subtotal: €48.00

Multiplicador: Domingo/Feriado (1.5x)
VALOR TOTAL: €72.00 (48 × 1.5)
```

## 📊 FUNCIONALIDADES EXTRAS

### Exportar/Importar Tabelas

**Exportar** (backup da sua configuração):
- Na página de configuração, clique em "📤 Exportar"
- Salva um arquivo JSON com todos os serviços da categoria
- Guarde esse arquivo como backup

**Importar** (restaurar ou compartilhar):
- Clique em "📥 Importar"
- Selecione o arquivo JSON exportado anteriormente
- A tabela será substituída pelos dados importados

### Edição em Massa

Para atualizar vários serviços:
1. Edite diretamente nas células da tabela
2. Faça todas as mudanças necessárias
3. Clique em "💾 Salvar Tabela" apenas uma vez no final

## 🔒 DADOS SALVOS LOCALMENTE

Todas as configurações ficam salvas no navegador (localStorage):
- ✅ Suas tabelas personalizadas
- ✅ Multiplicadores configurados
- ✅ Todas as OTs registradas

**IMPORTANTE**: Faça backup regularmente usando os botões de exportação!

## 💡 DICAS

1. **Códigos Únicos**: Use códigos diferentes para cada serviço (INST01, INST02, etc.)
2. **Descrições Claras**: Seja específico nas descrições para facilitar a busca
3. **Valores Precisos**: Use 2 casas decimais (ex: 44.00, não 44)
4. **Multiplicadores**: Atualize conforme acordo da sua empresa
5. **Backup Regular**: Exporte as tabelas mensalmente

## 🆕 DIFERENÇAS DO SISTEMA ANTERIOR

| Antes | Agora |
|-------|-------|
| Valores fixos no código | Valores editáveis na interface |
| Sem multiplicadores | Multiplicadores configuráveis |
| Código MOI fixo | Códigos personalizáveis |
| Sem backup de config | Exportar/Importar tabelas |

## ❓ PROBLEMAS COMUNS

**Serviços não aparecem no formulário?**
- Volte à página de configuração
- Verifique se salvou a tabela após editar
- Recarregue a página principal (F5)

**Multiplicador não está sendo aplicado?**
- Certifique-se de ter selecionado no dropdown "Multiplicador"
- Verifique se os multiplicadores foram salvos na página de configuração

**Valores errados?**
- Confira se o multiplicador correto está selecionado
- Verifique os valores base na página de configuração

---

**🎉 Pronto! Agora você tem controle total sobre suas tabelas de preços e multiplicadores!**

Para suporte ou dúvidas, consulte os dados salvos em: Configuração > ⚙️ Tabelas
