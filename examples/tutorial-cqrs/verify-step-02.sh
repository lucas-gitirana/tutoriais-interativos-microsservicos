#!/usr/bin/env bash
# Verifica a Etapa 2: modelo de leitura dedicado.
set -uo pipefail

if [ ! -f src/order-service/projections.py ]; then
  echo "Esperado: arquivo 'src/order-service/projections.py' com o modelo de leitura (projeção)."
  exit 1
fi
if ! grep -q "order_summary" src/order-service/queries.py; then
  echo "Esperado: 'src/order-service/queries.py' deve consultar a projeção 'order_summary'."
  exit 1
fi
echo "Etapa 2 concluída."
