# FLUXO DE ATENDIMENTOS E MAPA DE DEPENDÊNCIAS — V2

O evento central do "Salão Secreto" é a Criação de um Agendamento. Este guia mapeia visualmente os dominós arquiteturais que caem ao se criar um atendimento através da tela da Agenda (Multi-Serviços — V8).

## MAPA DE EXECUÇÃO DE EVENTOS

```mermaid
flowchart TD
    A[Frontend: Modal de Agenda] -->|Injeta Cliente e Serviços JSON| B(RPC: inserir_atendimento_completo)
    B -->|Cria Nó Raiz| C[Tabela: atendimentos]
    B -->|Laço Loop JSON| D[Tabela: atendimento_procedimentos]
    D -->|Evento After Insert| E((Trigger: atualizar_totais_atendimento))
    E -->|Calcula Totais dos Filhos| C
    C -->|Evento Before Update| F((Trigger: fn_calcular_atendimento))
    F -->|Cruza Taxas % e Custos| G{Banco de Dados processa matemática}
    G -->|Commit Transacional| H[Registro Final Assentado]
    H -.->|Ato Opcional: Alterar Status| I{Status = 'EXECUTADO'?}
    I -- Sim --> J[Dados propagados na View: fechamento_mensal]
    I -- Não --> K[Dados ocultos do faturamento real]
    J --> L[Dashboard Web (Gráficos Recharts)]
```

## PASSO A PASSO TÉCNICO E SEMÂNTICO

1. O Utilizador, visualizando a grade da semana no *Frontend*, clica para alocar um horário, selecionando:
   - Profissional responsável.
   - Lista de Procedimentos (Ex: Corte P, Luzes G).
   - Confirmação do `valor_cobrado` final.

2. A aplicação realiza uma requisição chamando o RPC nativo (`supabase.rpc`), enviando um bloco rígido (Transação) ao motor do PostgreSQL.

3. Se os dados passarem na aprovação da Policy RLS (segurança), cria a semente na tabela `atendimentos` como cabecalho vazio financeiramente.

4. Na mesma respiração do banco, os serviços descem ramificados para a tabela de junção `atendimento_procedimentos`.

5. Ao tocarem a junção, um gatilho de soma dispara silenciosamente ("Opa, entraram 2 serviços que totalizam 250 reais. Avise o nó raiz").

6. O nó raiz recebe os 250 reais brutos e aciona sua segunda bomba ("Opa, faturei 250! Qual meu custo fixo, e quanto vou morrer na taxa de maquininha de 5%?"). Ele extrai os insumos, preenche `custo_variavel`, `custo_fixo`, e estampa os lucros líquidos no mármore.

7. O frontend se acende com sucesso ("Toast Verde: Atendimento Marcado").

8. Se as flags entrarem em fechamento e este evento cruzar para *Executado*, o sistema contábil (Views de Dashboard) puxa de forma magnética para o montante total.
