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

{
  "event_type": "order_created",
  "order_uuid": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "customer_id": "customer123",
  "timestamp": "2025-05-10T14:30:00Z",
  "data": {
    "status": "PENDING",
    "items_count": 3,
    "total_amount": 15990
  }
}

{
  "event_type": "order_updated",
  "order_uuid": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "customer_id": "customer123",
  "timestamp": "2025-05-10T15:45:00Z",
  "data": {
    "previous_status": "PENDING",
    "new_status": "PROCESSING",
    "modified_fields": ["status", "shipping_address"]
  }
}

- Eventos Enviados ao Kafka
O sistema utiliza o Apache Kafka como middleware de mensageria para garantir processamento assíncrono e confiável de eventos relacionados aos pedidos. Os principais eventos publicados incluem:

### Estratégia de Armazenamento e Consulta para o sistema de Order

- **Fonte Primária vs. Consulta Rápida**: O PostgreSQL é utilizado como fonte primária de dados (single source of truth), enquanto o Elasticsearch é otimizado para consultas rápidas e flexíveis.
- **Métodos de Escrita (create/update/cancel)**:
  - Sempre operam primeiro no PostgreSQL como fonte primária
  - Após sucesso da operação no PostgreSQL, emitem eventos para processamento assíncrono
  - O listener de eventos processa a indexação no Elasticsearch
  - Este modelo assíncrono permite que a API responda rapidamente sem aguardar a indexação
- **Métodos de Leitura (find/search)**:

  - Tentam primeiro buscar dados no Elasticsearch para melhor performance
  - Esta estrategia mantem o banco primário com menor fluxo de transações.

- **Consistência Eventual**:
  - O sistema implementa consistência eventual entre PostgreSQL e Elasticsearch
  - Em caso de operações bem-sucedidas, os dados são sincronizados rapidamente via eventos
  - Em caso de falhas, o mecanismo de reconciliação garante sincronização posterior

### Reconciliação de Dados

- Uma tabela de reconciliação (`order_reconciliation`) é utilizada para registrar operações falhas no Elasticsearch, permitindo que estas operações sejam recuperadas e processadas posteriormente. Esta abordagem garante a consistência eventual entre o PostgreSQL e o Elasticsearch, mesmo em casos de falhas temporárias ou indisponibilidade do serviço de busca. Em sistemas reais de produção, poderiamos utilizar um Job regular(a cada 5 ou 15min) para processar os registros. Como testar esta feature?
  - Execute o projeto como o comando:
    `$ docker compose up -d `
  - Após a inicializaçào de todos os serviços, execute o comando:
    `$ docker-compose stop elasticsearch`
  - Crie uma nova ordem no método create utilizando o swagger em:
    http://localhost:3000/api-docs
  - Verifique a tabela order_reconciliation. Existirá um dado salvo com orderUuid referente a ordem no postgres.
  - Suba o serviço do elastic search novamente com o comando:
    `$ docker-compose start elasticsearch`

### Métodos auxiliares ao CRUD

- Foram criados os métodos findByCustomer, findOneByUuid como métodos administrativos auxiliares ao CRUD, pensando e um cenário de equipes de suporte.

## Estrutura da Aplicação

A organização do código-fonte segue uma arquitetura modular baseada em domínios:

```
src/
├── common/                         # Componentes compartilhados em toda a aplicação
│   ├── decorators/                 # Decoradores personalizados 
│   ├── exceptions/                 # Exceções base e filtros
│   │   ├── base.exception.ts       # Classe base para exceções personalizadas
│   │   └── exception.filter.ts     # Filtro global para tratamento uniforme de erros
│   └── utils/                      # Funções utilitárias reutilizáveis
│
├── config/                         # Configurações centralizadas da aplicação
│   ├── database.config.ts          # Configuração de conexão com bancos de dados
│   ├── environment.ts              # Gerenciamento de variáveis de ambiente
│   └── validation.config.ts        # Configurações para validação de dados
│
├── interceptors/                   # Interceptadores para processar requisições/respostas
│   ├── elastic.interceptor.ts      # Interceptador para operações com Elasticsearch
│   ├── metrics.interceptor.ts      # Interceptador para coleta de métricas
│   └── trace-id.interceptor.ts     # Interceptador para identificadores de rastreamento
│
├── kafka/                          # Módulo para integração com Apache Kafka
│   ├── kafka-config.service.ts     # Serviço de configuração do Kafka
│   ├── kafka-producer.service.ts   # Serviço para publicação de mensagens
│   └── kafka.module.ts             # Módulo que organiza serviços Kafka
│
├── infraestructure/                # Componentes de infraestrutura
│   ├── elastic/                    # Configuração e serviços do Elasticsearch
│   │   ├── elastic.module.ts
│   │   └── elastic.service.ts
│   └── postgres/                   # Configuração e conexões do PostgreSQL
│       └── dataSource.ts
│
├── logger/                         # Sistema de logging personalizado
│   ├── logger.module.ts            # Definição do módulo de logging
│   └── logger.service.ts           # Serviço que implementa funcionalidades de logging
│
├── metrics/                        # Instrumentação de métricas para monitoramento
│   ├── metrics.controller.ts       # Endpoints para exportação de métricas
│   ├── metrics.module.ts           # Configuração do módulo de métricas
│   └── metrics.service.ts          # Serviço para coleta e registro de métricas
│
├── modules/                        # Módulos da aplicação organizados por domínio
│   ├── search/                     # Módulo de busca centralizada
│   │   ├── dto/
│   │   │   └── search-query.dto.ts
│   │   ├── interfaces/
│   │   │   └── search-result.interface.ts
│   │   ├── search.controller.ts
│   │   ├── search.module.ts
│   │   └── search.service.ts
│   │
│   └── order/                     # Módulo de gerenciamento de pedidos
│       ├── dto/                   # Objetos de transferência de dados
│       │   ├── create-order.dto.ts
│       │   ├── update-order.dto.ts
│       │   └── order-item.dto.ts
│       │
│       ├── entities/              # Entidades do banco de dados
│       │   ├── order.entity.ts    # Entidade principal com enums de status
│       │   ├── order-item.entity.ts
│       │   └── order-reconciliation.entity.ts
│       │
│       ├── events/                # Sistema de eventos para processamento assíncrono
│       │   ├── order-events.interface.ts
│       │   └── order-event.listener.ts
│       │
│       ├── exceptions/            # Exceções específicas do domínio
│       │   └── order.exceptions.ts
│       │
│       ├── interfaces/            # Interfaces e tipos
│       │   └── order-document.interface.ts
│       │
│       ├── services/              # Serviços de negócio
│       │   ├── order.service.ts          # Orquestrador principal
│       │   ├── order-events.service.ts   # Gerenciamento de eventos
│       │   ├── order-elasticsearch.service.ts
│       │   ├── order-postgres.service.ts
│       │   └── order-reconciliation.service.ts
│       │
│       ├── test/                  # Utilities e mocks para testes
│       │   ├── test.providers.ts
│       │   └── test-module.helpers.ts
│       │
│       ├── order.controller.ts    # Controlador da API de pedidos
│       └── order.module.ts        # Definição do módulo de pedidos
│
├── app.controller.ts              # Controlador base com endpoints de saúde/status
├── app.module.ts                  # Módulo raiz que organiza toda a aplicação
└── main.ts                        # Ponto de entrada da aplicação
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

# Infraestrutura com Docker Compose

O projeto utiliza Docker Compose para orquestrar todos os serviços necessários em um ambiente isolado e consistente. Cada componente da arquitetura é encapsulado em seu próprio container, facilitando o desenvolvimento, testes e implantação.

### Serviços Disponíveis

- **nest-app**: Aplicação NestJS principal
  - Expõe a porta configurada em .env via variável `PORT`
  - Montagem de volumes para hot-reload durante desenvolvimento
  - Conecta-se a todos os serviços da infraestrutura

- **postgres**: Banco de dados PostgreSQL 15
  - Armazena a fonte primária de dados (single source of truth)
  - Configurado com usuário/senha "postgres" por padrão
  - Volume persistente para manter dados entre reinicializações
  - Expõe a porta configurada via variável `POSTGRES_PORT`

- **elasticsearch**: Mecanismo de busca e análise (versão 7.17.10)
  - Configurado como nó único para ambiente de desenvolvimento

- **zookeeper**: Serviço de coordenação para o Kafka
  - Permite login anônimo para simplificar configuração
  - Gerencia metadados e coordenação do cluster Kafka

- **kafka**: Sistema de mensageria distribuído (Confluent 7.3.0)
  - Configuração dual de listeners (INSIDE/OUTSIDE) para compatibilidade com Docker
  - Parâmetros otimizados para estabilidade e development
  - Suporte para criação automática de tópicos
  - Healthcheck integrado para garantir disponibilidade do serviço
  - Expõe porta 9092 para conexões externas

- **kafka-ui**: Interface gráfica para gerenciamento do Kafka
  - Facilita visualização de tópicos, grupos de consumidores e mensagens
  - Acessível na porta 8080
  - Ideal para testes e depuração durante o desenvolvimento

- **prometheus**: Sistema de monitoramento e coleta de métricas
  - Configuração via arquivo externo (prometheus.yml)
  - Armazenamento persistente para histórico de métricas
  - Interface web disponível na porta 9090
  - Coleta métricas da aplicação para observabilidade

- **tempo**: Backend para armazenamento e consulta de traces (Grafana Tempo)
  - Suporte para rastreamento distribuído de requisições
  - Configuração via arquivo externo (tempo.yaml)
  - Compatível com OpenTelemetry (porta 4318)
  - Armazenamento de dados de tracing para análise posterior

- **grafana**: Plataforma de visualização e dashboards
  - Painéis personalizáveis para métricas e traces
  - Acesso protegido por credenciais configuráveis
  - Suporte para consultas TraceQL habilitado
  - Disponível na porta 3030 para evitar conflito com a aplicação

- **cerebro**: Interface administrativa para Elasticsearch
  - Facilita o gerenciamento e visualização de índices, shards e estatísticas
  - Simplifica operações de manutenção no Elasticsearch
  - Acessível na porta 9000

### Redes e Volumes

- **Rede**: Todos os serviços estão conectados à rede `monitoring` para comunicação integrada
- **Volumes Persistentes**:
  - `prometheus_data`: Armazena séries temporais de métricas
  - `grafana_data`: Configurações e dashboards do Grafana
  - `tempo_data`: Dados de rastreamento distribuído
  - `postgres_data`: Dados e índices do PostgreSQL
  - `elasticsearch_data`: Índices e documentos do Elasticsearch
  - `zookeeper_data`: Configurações e meta-dados do ZooKeeper
  - `kafka_data`: Logs de mensagens e configurações do Kafka

### Observabilidade Integrada

Esta infraestrutura implementa o padrão de três pilares de observabilidade:
- **Métricas**: via Prometheus para monitoramento de performance
- **Traces**: via Tempo para rastreamento de requisições distribuídas
- **Logs**: armazenados e consultáveis via ferramentas específicas

Os serviços são configurados para trabalhar em conjunto, proporcionando um ambiente de desenvolvimento completo com capacidades avançadas de monitoramento e depuração, essenciais para sistemas distribuídos modernos.
