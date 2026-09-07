#!/usr/bin/env bash
# Conteudo bash valido, mas a extensao do arquivo (.py) viola o CA-1 da US02.
set -euo pipefail
test -f resultado.txt
echo "Etapa 1 verificada."
