FROM mcr.microsoft.com/devcontainers/python:1-3.12-bookworm

# A imagem base traz o repositório apt do Yarn com chave GPG vencida, o que faz o
# `apt-get update` das features (ex.: docker-in-docker) falhar. O tutorial não usa Yarn.
RUN rm -f /etc/apt/sources.list.d/yarn*.list
