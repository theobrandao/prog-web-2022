# Prompt para a Extensão do Claude no Chrome — Captura de Produto → Planilha Turbo Ofertas

Copie **todo o bloco abaixo** e cole na extensão do Claude no Chrome **com a página do produto aberta**
(Mercado Livre, Amazon ou Shopee). Ele captura os 24 campos da planilha de importação, baixa a imagem
em **PNG** e o vídeo em **MP4**, e monta/atualiza a planilha pronta pro sistema.

> Antes de colar, se quiser, preencha 2 coisas no topo do prompt:
> - Sua **tag de afiliado Amazon** (ex.: `ofertasturbo-20`) — só pra produtos Amazon.
> - O caminho/arquivo da planilha que você está montando (senão ele cria uma nova).

---

```
Você é meu assistente de captura de ofertas. Estou com uma página de produto aberta
(Mercado Livre, Amazon OU Shopee). Capture os dados deste produto e monte uma linha
para a minha planilha de importação "Turbo Ofertas", seguindo EXATAMENTE as regras abaixo.

=== CONFIG (edite se precisar) ===
- TAG_AFILIADO_AMAZON: (deixe em branco se não for Amazon)
- ARQUIVO_PLANILHA: entrada-turbo.xlsx  (se não existir, crie)

=== COLUNAS DA PLANILHA (nesta ordem EXATA) ===
1.  fonte              -> "ml", "amazon" ou "shopee". NUNCA "tiktok" (não é suportado).
2.  id_item            -> ML: código MLB + números (ex.: MLB1234567890).
                          Amazon: ASIN de 10 caracteres (letras/números).
                          Shopee: itemId numérico do produto.
3.  titulo             -> nome do produto, mínimo 8 caracteres, sem emojis.
4.  url_produto        -> URL da página do produto (http/https). SEM parâmetros de rastreio.
5.  url_imagem         -> URL DIRETA da imagem principal em maior resolução (.jpg/.png/.webp).
6.  url_video          -> URL DIRETA do vídeo do produto, SÓ se terminar em .mp4 ou .m3u8.
                          Se o vídeo não for .mp4/.m3u8 direto, deixe VAZIO.
7.  preco_atual        -> preço à vista/atual, formato brasileiro (ex.: 129,90). Só o número.
8.  preco_ancora       -> preço "de/antes" (riscado), se existir e for MAIOR que o atual. Senão vazio.
9.  condicao_preco     -> condição do preço (máx 40 chars). Ex.: "no PIX", "no cartão 1x".
10. comissao_pct       -> % de comissão de afiliado (0 < x <= 50). Se não souber, deixe vazio p/ eu preencher.
11. cupom              -> código do cupom, se houver. Senão vazio.
12. instrucao_cupom    -> como usar o cupom (máx 200 chars). Ex.: "Aplicar no carrinho".
13. frete              -> info de frete (máx 60). Ex.: "Frete grátis", "Full".
14. urgencia           -> gatilho de urgência (máx 60). Ex.: "Últimas unidades", "Oferta do dia".
15. comentario         -> observação curta sua (máx 120). Opcional.
16. avaliacoes         -> número de avaliações (só inteiro). Ex.: 1543.
17. nota               -> nota média de 0 a 5 (ex.: 4,8).
18. reputacao_vendedor -> "verde" se o vendedor for bem avaliado/oficial; senão "outra".
19. vendedor           -> nome da loja/vendedor (máx 60).
20. link_grp           -> DEIXE VAZIO. (link de afiliado é gerado por mim no painel; não invente)
21. link_cnl           -> DEIXE VAZIO. (idem)
22. link_ig            -> DEIXE VAZIO. (idem)
23. data_coleta        -> a data de HOJE no formato AAAA-MM-DD.
24. comissao_reais     -> preco_atual * (comissao_pct/100), 2 casas. Se faltar comissao_pct, vazio.

=== REGRAS IMPORTANTES ===
- NÃO invente valores. Se um campo não existir na página, deixe VAZIO (não chute).
- NÃO gere links de afiliado (colunas link_*). Eu gero manualmente no painel de afiliados.
- Se a página for TikTok Shop, PARE e me avise: não é suportado.
- url_imagem e url_produto são OBRIGATÓRIAS. Se não conseguir a imagem direta, me avise.
- Preços em formato brasileiro (vírgula decimal). Remova "R$" e pontos de milhar.

=== BAIXAR MÍDIA (pra facilitar o agente de criativos) ===
1. Baixe a imagem principal (maior resolução possível) e salve como PNG:  {id_item}.png
2. Se houver vídeo .mp4/.m3u8 direto, baixe e salve como MP4:  {id_item}.mp4
   (se for .m3u8/stream que não dá pra baixar direto, apenas guarde a url_video e me avise)
3. Coloque os dois arquivos na mesma pasta da planilha.
4. Na planilha, INSIRA a imagem PNG como miniatura numa coluna extra chamada "preview_imagem",
   na mesma linha do produto (se a ferramenta permitir embutir imagem na célula).
   Se não der pra embutir, escreva o nome do arquivo ({id_item}.png) nessa coluna.

=== SAÍDA ===
- Acrescente uma NOVA LINHA no ARQUIVO_PLANILHA com as 24 colunas preenchidas na ordem exata.
- Depois, me mostre um RESUMO em tabela do que capturou (campo: valor), destacando em
  vermelho qualquer campo que ficou VAZIO e que eu preciso completar (ex.: comissao_pct, cupom).
- Confirme os nomes dos arquivos salvos: {id_item}.png e {id_item}.mp4 (se houver vídeo).

Se algo essencial faltar (imagem, preço ou título), me avise ANTES de gravar a linha.
```

---

## Observações de conformidade (por que o prompt é assim)

- **R1 (Mercado Livre):** o prompt **proíbe** a extensão de gerar links de afiliado ML por software.
  As colunas `link_grp` / `link_cnl` você preenche manualmente no Portal do Afiliado.
- **R2 (Amazon):** o link da Amazon nunca vai direto pro Telegram/WhatsApp — o próprio sistema
  roteia pela página `/oferta/{id}`. Por isso a planilha guarda só a `url_produto`.
- **R4 (TikTok):** o prompt manda a extensão **parar** se a página for TikTok Shop.
- **Vídeo:** o importador só aceita `url_video` terminando em `.mp4` ou `.m3u8` — o prompt respeita isso.
- **Imagem em PNG local:** útil porque algumas imagens de marketplace bloqueiam download pelo servidor
  (hotlink 403). Ter o PNG salvo garante que o agente de criativos sempre tenha a imagem.

## Fluxo depois da captura

1. A extensão gera a linha na planilha + salva `{id_item}.png` e `{id_item}.mp4`.
2. Você completa manualmente o que ficou vazio (comissão, cupom, links de afiliado).
3. Suba a planilha em **/importar** no painel (`https://turbo-ofertas.onrender.com/importar`).
4. O sistema valida linha a linha (motivos/avisos por linha — R6) e importa os válidos.
