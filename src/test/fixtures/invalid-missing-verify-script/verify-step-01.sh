#!/usr/bin/env bash
# Verifica a Etapa 1: comandos e consultas em módulos separados.
set -euo pipefail

test -f src/order-service/commands.py
test -f src/order-service/queries.py
echo "Etapa 1 concluída."
