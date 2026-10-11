# Concluído 🎉

Você separou os modelos de leitura e escrita do `order-service`:

- comandos e consultas agora vivem em módulos independentes;
- as consultas usam um modelo de leitura dedicado (`order_summary`), atualizado
  por projeções de eventos.

Esse é o alicerce para evoluir leitura e escrita de forma independente — e um
pré-requisito comum para *event sourcing*.
