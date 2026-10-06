Origem de criação do tutorial: create-tutorials.md

---

Refatore o tutorial de CQRS e a extensão, caso necessário, para corrigir os pontos levantados por mim durante o teste do tutorial:

### Características gerais
1. As etapas estão muito longas e isso está deixando o tutorial cansativo antes de chegar na metade. Vale mais a pena ter mais etapas curtas com a sensação de check constante do que etapas longas e cansativas
2. Você deve lembrar que alguns dos alunos podem não ter domínio em Python. Por isso é importante que as tarefas sejam bastante "mastigadas" ou com exemplos próximos da resolução real
3. O aluno deve aprender o que significa PROJETAR
4. Os blocos de execução de cURLS são muito ruins de entender o payload. Acho que é mais interessante mostrar o JSON formatado corretamente antes do bloco do que imaginar que o aluno vai entender tudo pelo cURL. A ideia da requisição deve ser mais visual.
5. Ao mudar de etapa o arquivo que foi aberto pela etapa anterior não é "fechado" de forma que os arquivos das etapas seguintes ficam "acumulando" e prejudicando a visão
6. De forma geral, acho que o tutorial NÃO ESTÁ DIDÁTICO O SUFICIENTE pois não facilita a VISÃO DO TODO acerca do CQRS e além disso a quantidade de texto é desnecessariamente grande e cansativa. Os tutoriais devem ser mais dinâmicos, divertidos e devem ensinar como compreender o TODO do padrão

### Introdução:
1. Os títulos das etapas aparecem duplicados quando cada uma delas é acessada;
2. Não é necessário informar o tempo estimado
3. Explicar melhor os recursos que serão usados. Ex.: o que é redis?
4. Por que --build --wait?

### Etapa 2:
1. Não tem explicação do que é raise em python
2. Não explica por que usar cada um dos códigos de erro
3. Deve identar/comentar melhor onde cada pedaço de código deve ser implementado pelo aluno. Os espaços devem indicar o local certo onde ele deve alterar
4. Faltam textos dizendo: "faça isso, depois teste aquilo". O aluno precisa de comandos claros
5. PONTO EXTREMAMENTE CRÍTICO: a validação está fica retornando "Cancelamento ainda não implementado" mesmo depois de alterar o arquivo indicado na etapa.

### Etapa 3:
1. Tem muito texto. Nessa etapa eu desisti pois já fiquei cansado.