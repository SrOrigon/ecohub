/**
 * Classes de layout compartilhadas — use em páginas novas para consistência
 * em qualquer tamanho de tela (mobile → ultrawide).
 *
 * O `.app-main` já define `container-type: inline-size`, então grids e asides
 * reagem ao espaço útil após a sidebar, não só ao viewport.
 */
export const layout = {
  /** Espaçamento vertical padrão entre seções da página */
  pageStack: "page-stack",
  /** Grid 2 colunas quando o conteúdo principal tem largura suficiente */
  grid2: "layout-grid layout-grid-2",
  /** Grid 3 colunas progressivo (1 → 2 → 3) */
  grid3: "layout-grid layout-grid-3",
  /** Grid 4 colunas progressivo (1 → 2 → 4) */
  grid4: "layout-grid layout-grid-4",
  /** Cards/métricas: auto-fit fluido */
  gridAuto: "responsive-grid",
  /** KPIs compactos (2 colunas no mobile) */
  statGrid: "stat-grid",
  span2: "layout-span-2",
  /** Conteúdo principal + painel lateral (empilha se estreito) */
  withAside: "layout-with-aside",
  aside: "layout-with-aside-aside",
  main: "layout-with-aside-main min-w-0",
  /** Formulários em 1 ou 2 colunas conforme espaço */
  formGrid: "form-grid",
  formGridFull: "form-grid-span-full",
  /** Área com scroll horizontal para tabelas largas */
  tableRegion: "table-region",
} as const;
