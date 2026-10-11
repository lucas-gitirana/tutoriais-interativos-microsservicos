"""Consultas (leitura) do order-service, separadas dos comandos (CQRS)."""


def get_order(order_id: str) -> dict:
    raise NotImplementedError
