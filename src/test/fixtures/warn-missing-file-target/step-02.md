# Etapa 2 — Criar o modelo de leitura

Crie uma tabela desnormalizada `order_summary` alimentada por eventos de domínio
(`OrderCreated`, `OrderCancelled`) e faça `queries.py` ler dela em vez da tabela
transacional `orders`.

1. Adicione a migração `002_order_summary.sql`.
2. Assine os eventos em `projections.py` e atualize `order_summary`.
3. Ajuste `list_orders` para consultar `order_summary`.

Rode a verificação ao concluir.
