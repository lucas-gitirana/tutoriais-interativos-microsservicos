"""order-service — ponto de entrada HTTP (estado inicial do tutorial CQRS).

Neste ponto de partida, comandos e consultas ainda estão misturados no mesmo
módulo. A Etapa 1 pede para separá-los em `commands.py` e `queries.py`.
"""

from http.server import BaseHTTPRequestHandler, HTTPServer

ORDERS: dict[str, dict] = {}


class OrderHandler(BaseHTTPRequestHandler):
    def do_GET(self):  # noqa: N802 - assinatura exigida pela stdlib
        # TODO(etapa 1): delegar para queries.list_orders / queries.get_order
        self._send(200, {"orders": list(ORDERS.values())})

    def do_POST(self):  # noqa: N802
        # TODO(etapa 1): delegar para commands.create_order
        self._send(201, {"status": "created"})

    def _send(self, status: int, body: dict) -> None:
        import json

        payload = json.dumps(body).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.end_headers()
        self.wfile.write(payload)


def main() -> None:
    HTTPServer(("0.0.0.0", 8080), OrderHandler).serve_forever()


if __name__ == "__main__":
    main()
