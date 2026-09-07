#!/usr/bin/env bash
# Verifica a Etapa 2: modelo de leitura dedicado.
set -euo pipefail

test -f src/order-service/projections.py
grep -q "order_summary" src/order-service/queries.py
echo "Etapa 2 concluída."
