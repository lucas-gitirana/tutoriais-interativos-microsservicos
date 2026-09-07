# Implementando o padrão CQRS

Neste tutorial você vai aplicar **CQRS** (Command Query Responsibility Segregation)
a um microsserviço de pedidos, separando o caminho de escrita (comandos) do
caminho de leitura (consultas).

## O que você vai fazer

1. Isolar os *handlers* de comando dos *handlers* de consulta.
2. Introduzir um modelo de leitura otimizado para consultas.

O ambiente já sobe um serviço `order-service` em Python e um banco PostgreSQL.
