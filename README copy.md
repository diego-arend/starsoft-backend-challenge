# Considerações de Projeto

## Gerenciamento de Produtos

- Para os itens da Ordem (order) foi considerado que o `productId` já é gerenciado como único, não recebendo tratamento adicional. Em uma aplicação real, o sistema deverá gerenciar o cadastro de itens (produtos) e garantir um identificador único no sistema. Como o Desafio não foca no CRUD de produtos, vamos desconsiderar o tratamento disso no create/update da order.

## Valores Monetários

- Todos os valores monetários são armazenados como inteiros (em centavos) para evitar problemas de arredondamento que são comuns em operações com números de ponto flutuante.
- Tanto a API quanto o banco de dados trabalham com valores inteiros, onde R$ 10,50 é representado como 1050 centavos.
- Esta abordagem segue as melhores práticas para sistemas financeiros e de e-commerce.

## Arquitetura de IDs

- As entidades usam uma abordagem de ID duplo:
  - Um ID numérico autoincremental para uso interno e eficiência no banco de dados
  - Um UUID para exposição externa via API, aumentando a segurança e evitando exposição de informações sensíveis sobre o volume de negócios

## Transações e Consistência de Dados

- Todas as operações de criação e atualização de pedidos são realizadas dentro de transações para garantir a consistência dos dados.
- Em caso de falha em qualquer etapa do processo, a transação é revertida, evitando estados parciais ou inconsistentes.

## Status do Pedido

- O sistema implementa um fluxo de status de pedido completo: `PENDING`, `PROCESSING`, `SHIPPED`, `DELIVERED`, `CANCELED`.
- Regras de negócio impedem atualizações ou cancelamentos de pedidos que já estão em estados finais (como `DELIVERED` ou `CANCELED`).

## Segurança e Validação

- Validações são aplicadas tanto nos DTOs quanto nas camadas de serviço para garantir a integridade dos dados.
- As operações são protegidas contra entradas inválidas, com mensagens de erro claras e significativas.

## Decisões Técnicas

- A entidade `OrderItem` mantém informações como nome e preço do produto no momento da compra, permitindo que atualizações futuras no produto não afetem pedidos históricos.
- A configuração de cascade permite que itens sejam automaticamente salvos e excluídos com seu pedido pai.
- A propriedade `eager: true` na relação entre `Order` e `OrderItem` garante que os itens sejam sempre carregados com o pedido, simplificando o código do consumidor.

## Estrutura da Aplicação

A organização do código-fonte segue uma arquitetura modular baseada em domínios:

```
src/
├── common/                           # Componentes compartilhados
│   └── exceptions/                   # Exceções base e filtros
│       ├── base.exception.ts         # Classe base para exceções personalizadas
│       └── exception.filter.ts       # Filtro global para tratamento de erros
│
├── interceptors/                     # Interceptadores globais
│   ├── elastic.interceptor.ts        # Interceptador para indexação no Elasticsearch
│   ├── metrics.interceptor.ts        # Interceptador para coleta de métricas
│   └── trace-id.interceptor.ts       # Interceptador para rastreamento de IDs
│
├── infraestructure/                  # Componentes de infraestrutura
│   ├── elastic/                      # Configuração do Elasticsearch
│   │   ├── elastic.module.ts
│   │   └── elastic.service.ts
│   └── postgress/                    # Configuração do PostgreSQL
│       └── dataSource.ts
│
├── logger/                           # Módulo de logging personalizado
│   ├── logger.module.ts              # Definição do módulo de logging
│   └── logger.service.ts             # Serviço que implementa funcionalidades de logging
│
├── metrics/                          # Métricas e monitoramento
│   ├── metrics.controller.ts         # Controlador para endpoints de métricas
│   ├── metrics.module.ts             # Configuração do módulo de métricas
│   └── metrics.providers.ts          # Provedores de métricas para Prometheus
│
├── modules/                          # Módulos da aplicação organizados por domínio
│   └── order/                        # Módulo principal de pedidos
│       ├── dto/                      # Objetos de transferência de dados
│       │   ├── create-order.dto.ts   # DTO para criação de pedido
│       │   ├── update-order.dto.ts   # DTO para atualização de pedido
│       │   └── order-item.dto.ts     # DTO para itens do pedido
│       │
│       ├── entities/                 # Entidades do banco de dados
│       │   ├── order.entity.ts       # Entidade de pedido (com enums de status)
│       │   └── order-item.entity.ts  # Entidade de item de pedido
│       │
│       ├── events/                   # Sistema de eventos para processamento assíncrono
│       │   ├── order.events.ts       # Definição dos tipos de eventos
│       │   └── order-event.listener.ts # Listeners que processam eventos
│       │
│       ├── exceptions/               # Exceções específicas do domínio
│       │   ├── postgres-exceptions.ts  # Exceções relacionadas ao PostgreSQL
│       │   ├── elasticsearch-exceptions.ts # Exceções do Elasticsearch
│       │   └── order-exceptions.ts    # Exceções gerais de pedidos
│       │
│       ├── helpers/                  # Funções auxiliares
│       │   ├── order.helpers.ts      # Helpers para cálculos e manipulação de pedidos
│       │   └── elasticsearch.helpers.ts # Helpers para conversão de dados do ES
│       │
│       ├── interfaces/               # Interfaces e tipos
│       │   └── order-document.interface.ts # Interface para documentos no ES
│       │
│       ├── services/                 # Serviços de negócio
│       │   ├── order-elasticsearch.service.ts # Operações unificadas com Elasticsearch
│       │   └── order-postgres.service.ts # Operações com PostgreSQL
│       │
│       ├── swagger/                  # Documentação Swagger/OpenAPI
│       │   └── order-swagger.responses.ts # Respostas padrão da API
│       │
│       ├── order.controller.ts       # Controlador que define os endpoints da API
│       ├── order.module.ts           # Módulo que conecta todos os componentes
│       └── order.service.ts          # Serviço principal de orquestração
│
├── app.controller.ts                 # Controlador da aplicação com endpoints de saúde
├── app.module.ts                     # Módulo raiz que importa todos os outros
├── main.ts                           # Ponto de entrada da aplicação
└── tracing.ts                        # Configuração de rastreamento OpenTelemetry
```

### Características Principais da Estrutura

- **Arquitetura em Camadas**: Separa claramente controladores, serviços, entidades e DTOs.

- **Separação de Responsabilidades**: 
  - `order.service.ts`: Orquestra operações e fluxo de trabalho
  - `order-postgres.service.ts`: Foca nas operações com banco de dados
  - `order-elasticsearch.service.ts`: Gerencia a busca e indexação no Elasticsearch

- **Tratamento de Exceções Especializado**: 
  - Exceções personalizadas para cada tipo de operação
  - Sistema global de filtros para formatação consistente de erros

- **Processamento Assíncrono via Eventos**:
  - Separação entre operações de escrita no PostgreSQL e indexação no Elasticsearch
  - Desacoplamento usando sistema de eventos para operações não críticas

- **Mapeamento Objeto-Relacional**:
  - Entidades fortemente tipadas usando TypeORM
  - Relacionamento bem definido entre Order e OrderItem
  
- **Validação em Múltiplas Camadas**:
  - DTOs com decoradores de validação
  - Validações adicionais na camada de serviço