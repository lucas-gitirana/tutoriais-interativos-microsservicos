# Registro de desempenho em planilha Google

Guia para o professor receber, em uma planilha Google, o nome e a
nota de cada aluno que concluir um tutorial. Não exige servidor: um
Google Apps Script vinculado à planilha recebe os envios da extensão.

## 1. Criar a planilha e o script

1. Crie uma planilha nova no Google Sheets (ex.: "Desempenho — DevOps 2026/2").
2. Menu **Extensões → Apps Script**.
3. Apague o conteúdo de `Código.gs` e cole o conteúdo de [`Code.gs`](Code.gs).
4. Troque o valor de `TOKEN` por um texto da turma (ex.: `devops-2026-2`).
5. Salve, selecione a função `configurarPlanilha` e clique em **Executar**.
   Autorize o acesso quando o Google pedir. Isso cria as abas **Registros** e
   **Resumo**.

## 2. Publicar como Web App

1. **Implantar → Nova implantação**, tipo **App da Web**.
2. *Executar como*: **Eu**. *Quem pode acessar*: **Qualquer pessoa**.
3. Clique em **Implantar** e copie a URL terminada em `/exec`.
4. Teste: abrir a URL no navegador deve mostrar
   `{"ok":true,"servico":"registro-desempenho-tutoriais"}`.

Ao alterar o script depois, use **Implantar → Gerenciar implantações → Editar →
Nova versão**, para que a URL continue a mesma.

## 3. Configurar o tutorial

No `index.json` de cada tutorial, adicione:

```json
"report": {
  "endpoint": "https://script.google.com/macros/s/SEU_ID/exec",
  "token": "devops-2026-2"
}
```

Um mesmo Web App pode receber vários tutoriais: a coluna **Tutorial** separa os
registros, e a aba **Resumo** agrupa por ela.

## 4. Consultar o desempenho da turma

- **Registros**: uma linha por envio, com data e hora de recebimento, tutorial,
  nome, nota, nota máxima, percentual e o resultado de cada etapa
  (`✓` correta, `✗` incorreta, `—` não verificada, `·` sem avaliação).
- **Resumo**: uma linha por tutorial, com a quantidade de envios, a de alunos
  distintos e o percentual médio, mínimo e máximo da turma. É recalculado pelo
  script a cada envio. Para refazê-lo manualmente, execute `configurarPlanilha`
  no editor do Apps Script.

Um aluno pode enviar mais de uma vez, por exemplo se refizer o tutorial. Todos
os envios ficam em **Registros**. No **Resumo**, a média, o mínimo e o máximo
usam só o último envio de cada aluno. Nomes que diferem apenas em maiúsculas ou
espaços contam como o mesmo aluno.

## Limitações

- O nome é digitado pelo aluno e não é autenticado. Combine com a turma o
  formato (ex.: nome completo), para que o mesmo aluno não apareça com nomes
  diferentes.
- A nota é calculada na máquina do aluno. O token só descarta envios de outras
  origens.
- Se o envio falhar (sem rede, proxy da instituição, URL errada), a extensão
  salva `resultado-<tutorial>-<nome>.json` na pasta do tutorial para o
  aluno entregar por outro meio.
