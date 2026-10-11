#!/usr/bin/env bash
# Verifica a Etapa 1: comandos e consultas em módulos separados.
set -uo pipefail

if [ ! -f src/order-service/commands.py ] || [ ! -f src/order-service/queries.py ]; then
  echo "Esperado: arquivos 'src/order-service/commands.py' e 'src/order-service/queries.py' com os comandos e consultas separados."
  exit 1
fi
echo "Etapa 1 concluída."
