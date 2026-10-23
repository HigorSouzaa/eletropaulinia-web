# Pendências para revisão ao final dos prompts

Registro central solicitado pelo usuário. Atualizar durante as etapas 02–08 e revisar após a etapa 08. Criado em 23/10/2026 a partir da etapa 01 (8be92b1). Documentação não comprova implementação.

## Como manter

Registrar toda descoberta não resolvida: ID, etapa de origem, evidência, impacto/prioridade, dependência, próxima ação e critério observável. Estados: aberta, em andamento, bloqueada, resolvida ou adiada por decisão explícita. Ao resolver, manter a linha e acrescentar commit/teste/data. Não excluir histórico nem marcar concluído por apenas documentar. Evitar duplicações, segredos e dados pessoais.

Pendências previstas para os próximos prompts também permanecem aqui até validação. Não adiar bloqueios do fluxo atual ou de produção apenas porque haverá revisão final. Perguntar somente decisões necessárias ao trabalho em curso.

## Registro inicial

Todas as linhas abaixo estão **abertas**, salvo quando indicado. P0 bloqueia uso real; P1 necessário para conclusão; P2 melhoria/otimização. Referências detalhadas e matriz T01–T24: [validação da etapa 01](contratos/VALIDACAO.md). Propostas: [API](contratos/API-V2.md) e [arquitetura](contratos/ARQUITETURA-E-TRANSICAO.md).

| ID | Origem → etapa responsável | Pendência e evidência | Impacto/prioridade | Dependência e próxima ação | Critério de encerramento |
| --- | --- | --- | --- | --- | --- |
| P01 | 01 → 03/04 | Retirada antes de Pronto não definida | P1, exceção operacional | Resposta do usuário; definir bloqueio ou motivo obrigatório | Regra registrada e T11 validado |
| P02 | 01 → 03/04 | Quem corrige retirada e como preservar evento anterior | P1 | Resposta do usuário e contrato de correção | Permissões, motivo e teste negativo |
| P03 | 01 → 04/06 | Desligamento/recuperação de acesso não definidos | P1 | Decidir desativação e redefinição administrativa | T19 e revogação verificadas |
| P04 | 01 → 02 | Sessão, transporte e cache são proposta; contextos legados desconectados | P0 | Revisar arquitetura e implementar fluxo inicial | T01/T16, sem estados antigos após troca de conta |
| P05 | 01 → 02 | Base permanece Vite/React Router | P1 | Versões compatíveis e arquitetura | Next login/lista reais, build/tipos/testes |
| P06 | 01 → 03 | Só primeiro equipamento enviado; e-mail não salvo; marca obrigatória | P0 | API v2 e formulários etapa 04 | T04–T07, nenhum campo aceito perdido |
| P07 | 01 → 03/04 | Ausência de retirada individual e horário | P0 | Contrato normal e exceções P01/P02 | T08–T11 e recarga preservada |
| P08 | 01 → 03 | Número por última OS e atualizações sem versão | P0 | Contador, índices e reconciliação | T12/T13 concorrentes; número imutável |
| P09 | 01 → 03 | Opcionais não limpam; erros de OS expõem error.message | P0 | Validação e envelope v2 | T14/T22 e erros sem detalhes internos |
| P10 | 01 → 03 | Lista sem paginação/filtros no servidor | P1 | Contrato e dados representativos | T15, limites e contagens corretos |
| P11 | 01 → 03 | Agregação de andamento, limites e composição após retirada são propostas | P1 | Revisar proposta antes da implementação correspondente | Decisões explícitas e cenários de teste |
| P12 | 01 → 04 | Gestão de funcionários ausente; último admin precisa proteção | P1 | API e P03 | T18/T19, inclusive concorrência |
| P13 | 01 → 04 | Deep link depende da lista; modal não aguarda status | P1 | Next e API | T17, estados de falha/sucesso corretos |
| P14 | 01 → 04/07 | Acessibilidade/responsividade não validadas em navegador | P1 | Telas funcionais | T24 com evidências desktop/mobile/teclado |
| P15 | 01 → 05 | Banco real, volume, dados ausentes e índices desconhecidos | P0 para corte | Acesso autorizado e inventário agregado | Plano preserva IDs/números e T20 |
| P16 | 01 → 05 | Backup/restore e reversão não comprovados | P0 para corte | Destino isolado autorizado e plano Atlas | T23, reconciliação de escritas pós-corte |
| P17 | 01 → 05/06 | Política de exclusão em backups e retenção não definida | P1 | Responsável da empresa/plano do provedor | Política documentada, sem TTL de OS |
| P18 | 01 → 06 | CORS aberto, abuso e dependências não retriados | P0 antes de publicação | Ambiente e avaliação de alcance | Controles testados e riscos aplicáveis tratados |
| P19 | Ciclo 1 → 06 | Uso/rotação de credenciais históricas não verificável | P0 se usadas | Inventário autorizado; nunca imprimir valores | Uso apurado e procedimento executado somente se autorizado |
| P20 | 01 → 02/07 | Dois avisos Fast Refresh e bases de browsers antigas | P2 | Verificar se migração remove causa; atualizar somente com justificativa | Avisos resolvidos ou limitação registrada com evidência |
| P21 | 01 → 07 | Sem E2E, medições representativas ou CI remoto atual | P1 | Fluxos completos; publicação autorizada para CI remoto | Matriz T01–T24 e resultados reais por ambiente |
| P22 | 01 → 08 | Backend/domínios/custos e condições comerciais indefinidos | P1 | Pesquisa atual e escolha do usuário | Plano de hospedagem e corte revisado |
| P23 | 01 → 07/08 | Aceite operacional da empresa não realizado | P1 | Homologação e responsável | Aceite humano real registrado |
| P24 | 01 → 03/05 | Compatibilidade v1/v2 e rollback sem perda ainda não testados | P0 para corte | Transformação e bloqueio de escritores legados | Ensaio sem achatamento nem perda de equipamentos |

## Fora do pacote atual

Garantia e envio automático; WhatsApp; módulo completo de clientes; relatórios avançados; redesign amplo. **Adiadas por decisão do usuário**, não esquecidas e não automaticamente autorizadas após o prompt 08.

## Histórico

- 23/10/2026: registro criado; nenhuma pendência considerada resolvida pela criação deste arquivo.
- Etapa 01: npm run check passou (13 testes legados, tipagem/build; dois avisos). Não equivale a validar os fluxos novos.

## Atualização da etapa 02 — checkpoint de arquitetura

23/10/2026: P04 e P05 em andamento apenas no planejamento; não resolvidos. Proposta concreta em [ETAPA-02-ARQUITETURA.md](dev-front/ETAPA-02-ARQUITETURA.md). P20/P21 permanecem abertos, sem nova execução de testes/build ou navegador nesta preparação.

P25 — origem 02, prioridade P1, estado aberto: lucide-react 0.344 não declara peer React 19, necessário para a combinação candidata Next 16.4.2/React 19.3.1. Evidência: npm view. Candidata consultada lucide-react 1.61.0 aceita React 19. Próxima ação: atualização pontual com revisão dos exports e lockfile após checkpoint. Encerrar com resolução sem flags de conflito, build e verificação visual dos ícones. Nenhum pacote foi instalado nesta preparação.

## Fechamento da etapa 02 — 23/10/2026

As atualizações abaixo substituem o estado inicial dos IDs, preservado acima como histórico.

| ID | Estado atual | Evidência/limite | Próximo passo |
| --- | --- | --- | --- |
| P04 | Resolvida no fluxo da etapa 02 | Cookie HttpOnly, Express revalida/revoga, 16 testes HTTP e 6 E2E; 50c9bd2 e commit Next desta branch | Revalidar nas próximas mutações; gestão de desligamento continua P03 |
| P05 | Resolvida no escopo login/lista | Next App Router, instalação limpa/check/E2E aprovados; legacy preservado | Fluxos completos seguem P06/P07/P13, sem alegar paridade |
| P25 | Resolvida | Lucide 1.61.0/React 19.3.1; npm ls, instalação limpa, build e capturas com ícones | Sem ação restante nesta etapa |
| P20 | Em andamento | Avisos Fast Refresh não pertencem mais ao frontend ativo; Browserslist antigo permanece | Atualizar dados de compatibilidade com justificativa; ferramentas de lint Next não usam plugin Vite |
| P21 | Em andamento | Seis E2E locais em Chromium com API/MongoDB real; partes de erro/vazio usam interceptação explícita | CI remoto, outros navegadores, fluxos v2 e medições representativas ainda pendentes |
| P14 | Em andamento | Desktop 1280x720/mobile 360x800 inspecionados, sem overflow da página no mobile | Auditoria completa de teclado/acessibilidade e telas novas na etapa 04/07 |
| P18 | Aberta, bloqueia publicação | Raiz produção: 0 alertas; dev: 10. Backend produção: 8, incluindo proxy-addr crítico; alcance não demonstrado | Triar/corrigir antes de uso real, além de CORS/rate limit já registrados |

Nenhuma pendência de produto foi silenciosamente aprovada. P01/P02/P03/P11 aguardam decisões na etapa correspondente. Sem Atlas, dados reais, push, merge ou deploy. Evidências e limites: [entrega da etapa 02](dev-front/ETAPA-02-ENTREGA.md).
