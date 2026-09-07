# Etapa 1 — Separar comandos de consultas

Abra `src/order-service/app.py` e divida o módulo em dois:

- `commands.py` — cria e altera pedidos (`create_order`, `cancel_order`);
- `queries.py` — apenas leitura (`get_order`, `list_orders`).

O endpoint HTTP deve delegar para o módulo correto conforme o verbo:
`POST`/`PUT`/`DELETE` → `commands`, `GET` → `queries`.

Quando terminar, rode a verificação da etapa.
