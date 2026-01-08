# Funcionalidade: Contrato Inativo

## Descrição
Esta funcionalidade permite marcar clientes com contrato inativo, destacando-os visualmente na interface com cor vermelha e um indicador pulsante.

## Como Usar

### 1. Marcar um Cliente como Inativo
1. Clique no nome do cliente para abrir o menu de opções
2. Selecione "Contrato Inativo" (botão vermelho)
3. Preencha a data de inativação (obrigatório)
4. Adicione observações sobre o motivo (opcional)
5. Clique em "Salvar"

### 2. Visualizar Detalhes do Contrato Inativo
- Clientes com contrato inativo aparecem com:
  - Nome em vermelho e negrito
  - Bolinha vermelha pulsante ao lado do nome
- Clique na bolinha vermelha para ver/editar os detalhes da inativação

### 3. Reativar um Contrato
Para reativar um contrato, você pode:
1. Clicar na bolinha vermelha
2. Limpar a data de inativação
3. Salvar

## Estrutura de Dados

### Campo no Banco de Dados
- **Tabela**: `clients`
- **Campo**: `inactive_contract` (JSONB)
- **Estrutura**:
```json
{
  "date": "2026-01-08",
  "notes": "Motivo da inativação",
  "setAt": "2026-01-08T18:30:00.000Z"
}
```

## Migração do Banco de Dados

Para adicionar o campo ao banco de dados Supabase, execute:

```sql
ALTER TABLE clients 
ADD COLUMN IF NOT EXISTS inactive_contract JSONB DEFAULT NULL;
```

Ou execute o arquivo de migração:
```bash
psql -U postgres -d supabase -f database/migration_inactive_contract.sql
```

## Arquivos Modificados

### Frontend
- `index.html` - Adicionado modal de contrato inativo e botão no menu de opções
- `app.js` - Funções para gerenciar contrato inativo
- `inactive-contract-styles.css` - Estilos e animação do indicador

### Backend/Database
- `database/migration_inactive_contract.sql` - Migração SQL

## Recursos Visuais

### Indicador Visual
- **Bolinha Vermelha**: Animação pulsante (pulse-red) que chama atenção
- **Nome em Vermelho**: Cor #dc2626 com peso de fonte 700
- **Hover**: Bolinha aumenta de tamanho ao passar o mouse

### Modal
- **Ícone**: Círculo vermelho com ícone de "ban"
- **Campos**:
  - Data da Inativação (obrigatório)
  - Observação (opcional)
- **Alerta**: Aviso visual sobre o impacto da marcação

## Auditoria
Todas as ações relacionadas a contrato inativo são registradas no log de auditoria:
- Marcação de contrato inativo
- Atualização de informações
- Valores anteriores e novos são armazenados

## Observações
- A data de inativação é obrigatória
- O campo de observação é opcional mas recomendado
- Ao salvar, o usuário retorna automaticamente para a tela anterior
- O indicador visual é atualizado em tempo real
