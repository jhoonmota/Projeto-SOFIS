# 📋 SOFIS - Sistema de Gerenciamento de Clientes

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![License](https://img.shields.io/badge/license-ISC-green.svg)

Sistema completo de gerenciamento de clientes desenvolvido para facilitar o controle de informações, contatos, servidores, VPNs e URLs de acesso aos sistemas dos clientes.

---

## 📑 Índice

- [Visão Geral](#-visão-geral)
- [Tecnologias Utilizadas](#-tecnologias-utilizadas)
- [Estrutura do Banco de Dados](#-estrutura-do-banco-de-dados)
- [Funcionalidades Principais](#-funcionalidades-principais)
- [Funções Detalhadas](#-funções-detalhadas)
- [Instalação e Configuração](#-instalação-e-configuração)
- [Scripts Disponíveis](#-scripts-disponíveis)
- [Migração de Dados](#-migração-de-dados)
- [Estrutura de Arquivos](#-estrutura-de-arquivos)

---

## 🎯 Visão Geral

O **SOFIS** é um sistema web completo para gerenciamento de clientes que oferece:

- ✅ Cadastro e gerenciamento de clientes
- ✅ Sistema de favoritos
- ✅ Gerenciamento de múltiplos contatos por cliente
- ✅ Controle de acessos a servidores SQL
- ✅ Gerenciamento de credenciais VPN
- ✅ Controle de URLs de sistemas (Bridge, Bootstrap, ExecUpdate)
- ✅ Sistema de observações e notas
- ✅ Busca avançada e filtros
- ✅ Visualização em lista ou grade
- ✅ Integração com Supabase
- ✅ Sistema de autenticação

---

## 🛠 Tecnologias Utilizadas

### Frontend
- **HTML5** - Estrutura semântica
- **CSS3** - Estilização moderna com variáveis CSS
- **JavaScript (ES6+)** - Lógica da aplicação
- **Font Awesome** - Ícones

### Backend/Database
- **Supabase** - Backend as a Service (BaaS)
- **PostgreSQL** - Banco de dados relacional
- **Row Level Security (RLS)** - Segurança de dados

### Ferramentas de Desenvolvimento
- **lite-server** - Servidor de desenvolvimento
- **serve** - Servidor de produção

---


## ⚡ Funcionalidades Principais

### 🔐 Autenticação
- Login com usuário e senha
- Validação de credenciais via Supabase
- Sessão persistente
- Logout seguro

### 👥 Gerenciamento de Clientes

#### Cadastro e Edição
- Criar novos clientes
- Editar informações de clientes existentes
- Excluir clientes (com confirmação)
- Sistema de favoritos (estrela)
- Campo de observações/notas

#### Visualização
- **Modo Lista**: Visualização compacta em linhas
- **Modo Grade**: Visualização em cards
- Indicadores visuais de dados cadastrados
- Badges com contadores de registros

#### Busca e Filtros
- Busca por nome do cliente
- Busca por telefone (com ou sem formatação)
- Busca por e-mail
- Filtros: Todos / Favoritos / Regulares
- Limpeza rápida de busca

### 📞 Gerenciamento de Contatos

#### Funcionalidades
- Múltiplos contatos por cliente
- Múltiplos telefones por contato
- Múltiplos e-mails por contato
- Máscara automática de telefone
- Validação de duplicidade de telefones
- Busca de contatos dentro do modal


### 🖥 Gerenciamento de Servidores SQL

#### Funcionalidades
- Cadastro de múltiplos servidores por cliente
- Ambientes: Homologação e Produção
- Múltiplas credenciais por servidor
- Sistema de filtros por ambiente
- Visualização/ocultação de senhas
- Cópia rápida de credenciais


### 🔒 Gerenciamento de VPN

#### Funcionalidades
- Cadastro de múltiplos acessos VPN por cliente
- Armazenamento seguro de credenciais
- Visualização/ocultação de senhas
- Campo de observações
- Cópia rápida de credenciais


### 🔗 Gerenciamento de URLs

#### Funcionalidades
- Cadastro de URLs por sistema (Bridge, SOFIS, Outros)
- Ambientes: Homologação e Produção
- URLs específicas: data_access, bootstrap, exec_update
- WebLaudo separado
- Sistema de filtros por ambiente e sistema
- Cópia rápida de URLs


### 📝 Sistema de Notas

#### Funcionalidades
- Observações gerais por cliente
- Indicador visual de notas importantes
- Modal dedicado para visualização/edição


---


## 🎨 Características da Interface

### Design Responsivo
- Layout adaptável para desktop, tablet e mobile
- Modo lista e grade
- Skeleton loading
- Animações suaves

### Tema Escuro
- Paleta de cores moderna
- Alto contraste
- Variáveis CSS customizáveis

### Componentes
- Modais responsivos
- Tooltips informativos
- Badges e indicadores
- Botões com ícones
- Campos de formulário estilizados
- Sistema de toast notifications

### Ícones e Imagens
- Font Awesome 6.4.0
- Ícones customizados (VPN, Contatos)
- Logo da aplicação

---

## 🔒 Segurança

### Row Level Security (RLS)
Todas as tabelas possuem RLS habilitado com políticas configuradas.

### Validações
- Validação de campos obrigatórios
- Verificação de duplicatas
- Escape de HTML para prevenir XSS
- Confirmação para ações destrutivas

### Autenticação
- Sistema de login
- Validação de credenciais
- Sessão persistente

---

## 🚀 Deploy

### Vercel
O projeto está configurado para deploy no Vercel:



## 📝 Notas de Desenvolvimento

### Compatibilidade
- Navegadores modernos (Chrome, Firefox, Edge, Safari)
- ES6+ JavaScript
- CSS Grid e Flexbox

### Performance
- Lazy loading de dados
- Debounce em buscas
- Renderização otimizada

### Manutenibilidade
- Código modular
- Comentários explicativos
- Nomenclatura clara
- Separação de responsabilidades

---

## 🤝 Contribuindo

Contribuições são bem-vindas! Por favor:

1. Fork o projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

---


## 📞 Suporte

Para dúvidas ou sugestões, abra uma issue no repositório.

---

**Versão:** 1.0.0  
**Última atualização:** Dezembro 2025
