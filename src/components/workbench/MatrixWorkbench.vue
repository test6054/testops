<template>
  <div class="matrix-workbench" :class="{ 'matrix-workbench--loading': loading }">
    <div v-if="title || $slots.toolbar" class="matrix-workbench__header">
      <div class="matrix-workbench__title-block">
        <h3 v-if="title" class="matrix-workbench__title">{{ title }}</h3>
        <span v-if="subtitle" class="matrix-workbench__subtitle">{{ subtitle }}</span>
      </div>
      <div v-if="$slots.toolbar" class="matrix-workbench__toolbar">
        <slot name="toolbar" />
      </div>
    </div>

    <div v-if="loading" class="matrix-workbench__placeholder">
      <a-spin />
    </div>
    <div v-else-if="rows.length === 0 || cols.length === 0" class="matrix-workbench__placeholder">
      <UiEmpty :description="emptyText" />
    </div>
    <div v-else class="matrix-workbench__scroll">
      <table class="matrix-workbench__table">
        <thead>
          <tr>
            <th
              class="matrix-workbench__corner matrix-workbench__th--row-header"
              :style="rowHeaderStyle"
            >
              <span class="matrix-workbench__corner-label">{{ rowHeaderLabel }}</span>
              <span v-if="colHeaderLabel" class="matrix-workbench__corner-axis">
                / {{ colHeaderLabel }}
              </span>
            </th>
            <th
              v-for="col in cols"
              :key="col.key"
              class="matrix-workbench__th matrix-workbench__th--col"
              :style="{ width: `${col.width ?? defaultColWidth}px` }"
            >
              <div class="matrix-workbench__col-label">{{ col.label }}</div>
              <div v-if="col.hint" class="matrix-workbench__col-hint">{{ col.hint }}</div>
              <div
                v-if="col.badge"
                class="matrix-workbench__col-badge"
                :class="toneClass(col.badgeTone)"
              >
                {{ col.badge }}
              </div>
            </th>
            <th v-if="showRowSummary" class="matrix-workbench__th matrix-workbench__th--summary">
              {{ rowSummaryLabel }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="row in rows"
            :key="row.key"
            class="matrix-workbench__row"
            :class="{ 'matrix-workbench__row--warning': !!row.warning }"
          >
            <th class="matrix-workbench__th matrix-workbench__th--row" :style="rowHeaderStyle">
              <button type="button" class="matrix-workbench__hit" @click="handleRowClick(row)">
                <div class="matrix-workbench__row-label">{{ row.label }}</div>
                <div v-if="row.hint" class="matrix-workbench__row-hint">{{ row.hint }}</div>
                <div
                  v-if="row.badge"
                  class="matrix-workbench__row-badge"
                  :class="toneClass(row.badgeTone)"
                >
                  {{ row.badge }}
                </div>
                <div v-if="row.warning" class="matrix-workbench__row-warning">
                  {{ row.warning }}
                </div>
              </button>
            </th>
            <td
              v-for="col in cols"
              :key="col.key"
              class="matrix-workbench__cell"
              :class="cellClass(getCell(row.key, col.key))"
            >
              <button
                type="button"
                class="matrix-workbench__hit"
                :title="getCell(row.key, col.key)?.warning || ''"
                @click="handleCellClick(row, col)"
              >
                <template v-if="getCell(row.key, col.key)">
                  <div class="matrix-workbench__cell-primary">
                    {{ getCell(row.key, col.key)?.primary }}
                  </div>
                  <div
                    v-if="getCell(row.key, col.key)?.secondary"
                    class="matrix-workbench__cell-secondary"
                  >
                    {{ getCell(row.key, col.key)?.secondary }}
                  </div>
                  <span
                    v-if="getCell(row.key, col.key)?.warning"
                    class="matrix-workbench__cell-warning"
                  >
                    !
                  </span>
                </template>
                <template v-else>
                  <span class="matrix-workbench__cell-empty">＋</span>
                </template>
              </button>
            </td>
            <td
              v-if="showRowSummary"
              class="matrix-workbench__cell matrix-workbench__cell--summary"
            >
              <div class="matrix-workbench__cell-primary">
                {{ rowSummary(row) }}
              </div>
              <div v-if="rowSummaryHint(row)" class="matrix-workbench__cell-secondary">
                {{ rowSummaryHint(row) }}
              </div>
            </td>
          </tr>
        </tbody>
        <tfoot v-if="showColSummary">
          <tr>
            <th class="matrix-workbench__th matrix-workbench__th--row" :style="rowHeaderStyle">
              {{ colSummaryLabel }}
            </th>
            <td
              v-for="col in cols"
              :key="col.key"
              class="matrix-workbench__cell matrix-workbench__cell--summary"
            >
              <div class="matrix-workbench__cell-primary">
                {{ colSummary(col) }}
              </div>
              <div v-if="colSummaryHint(col)" class="matrix-workbench__cell-secondary">
                {{ colSummaryHint(col) }}
              </div>
            </td>
            <td
              v-if="showRowSummary"
              class="matrix-workbench__cell matrix-workbench__cell--summary"
            />
          </tr>
        </tfoot>
      </table>
    </div>
  </div>
</template>

<script lang="ts" setup>
import type { MatrixCell, MatrixCol, MatrixRow } from './matrix-types'
import type { BadgeTone } from '@/components/ui-guide/ui/types'
import { computed } from 'vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'

defineOptions({
  name: 'MatrixWorkbench',
})

const props = withDefaults(
  defineProps<{
    title?: string
    subtitle?: string
    rows: MatrixRow[]
    cols: MatrixCol[]
    cells: MatrixCell[]
    rowHeaderLabel: string
    colHeaderLabel?: string
    rowHeaderWidth?: number
    defaultColWidth?: number
    loading?: boolean
    emptyText?: string
    showRowSummary?: boolean
    rowSummaryLabel?: string
    rowSummary?: (row: MatrixRow) => string
    rowSummaryHint?: (row: MatrixRow) => string
    showColSummary?: boolean
    colSummaryLabel?: string
    colSummary?: (col: MatrixCol) => string
    colSummaryHint?: (col: MatrixCol) => string
  }>(),
  {
    title: '',
    subtitle: '',
    rowHeaderWidth: 220,
    defaultColWidth: 140,
    loading: false,
    emptyText: '暂无矩阵数据',
    showRowSummary: false,
    rowSummaryLabel: '合计',
    rowSummary: () => '',
    rowSummaryHint: () => '',
    showColSummary: false,
    colSummaryLabel: '合计',
    colSummary: () => '',
    colSummaryHint: () => '',
  },
)

const emit = defineEmits<{
  (
    e: 'cell-click',
    eventData: { row: MatrixRow, col: MatrixCol, cell: MatrixCell | undefined },
  ): void
  (e: 'row-click', row: MatrixRow): void
}>()

const rowHeaderStyle = computed(() => ({
  width: `${props.rowHeaderWidth}px`,
  minWidth: `${props.rowHeaderWidth}px`,
}))

const cellIndex = computed(() => {
  const map = new Map<string, MatrixCell>()
  for (const cell of props.cells) {
    map.set(`${cell.rowKey}::${cell.colKey}`, cell)
  }
  return map
})

function getCell(rowKey: string, colKey: string): MatrixCell | undefined {
  return cellIndex.value.get(`${rowKey}::${colKey}`)
}

function cellClass(cell: MatrixCell | undefined): string[] {
  const arr: string[] = []
  if (!cell) {
    arr.push('matrix-workbench__cell--empty-state')
  } else {
    if (cell.tone) arr.push(`matrix-workbench__cell--${cell.tone}`)
    if (cell.warning) arr.push('matrix-workbench__cell--has-warning')
  }
  return arr
}

function toneClass(tone?: BadgeTone): string {
  return tone ? `matrix-workbench__tone--${tone}` : ''
}

function handleCellClick(row: MatrixRow, col: MatrixCol) {
  emit('cell-click', { row, col, cell: getCell(row.key, col.key) })
}

function handleRowClick(row: MatrixRow) {
  emit('row-click', row)
}
</script>

<style scoped>
.matrix-workbench {
  display: flex;
  flex-direction: column;
  background: var(--dp-surface, #fff);
  border: 1px solid var(--dp-border, #e2e8f0);
  border-radius: 8px;
  overflow: hidden;
}

.matrix-workbench__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 16px;
  border-bottom: 1px solid var(--dp-border, #e2e8f0);
  background: var(--dp-surface-elevated, #f8fafc);
}

.matrix-workbench__title-block {
  display: flex;
  align-items: baseline;
  gap: 8px;
}

.matrix-workbench__title {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: var(--dp-text-primary, #0f172a);
}

.matrix-workbench__subtitle {
  font-size: 12px;
  color: var(--dp-text-muted, #64748b);
}

.matrix-workbench__toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
}

.matrix-workbench__placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 48px 16px;
}

.matrix-workbench__scroll {
  width: 100%;
  overflow-x: auto;
  background: var(--dp-surface, #fff);
}

.matrix-workbench__table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  table-layout: fixed;
  font-size: 13px;
  color: var(--dp-text-primary, #0f172a);
}

.matrix-workbench__th,
.matrix-workbench__cell {
  padding: 10px 12px;
  border-bottom: 1px solid var(--dp-border, #e2e8f0);
  border-right: 1px solid var(--dp-border, #e2e8f0);
  text-align: left;
  vertical-align: top;
  background: var(--dp-surface, #fff);
}

.matrix-workbench__th--col {
  position: sticky;
  top: 0;
  z-index: 2;
  background: var(--dp-surface-elevated, #f8fafc);
  font-weight: 600;
  text-align: center;
}

.matrix-workbench__th--row,
.matrix-workbench__th--row-header {
  position: sticky;
  left: 0;
  z-index: 1;
  background: var(--dp-surface-elevated, #f8fafc);
  font-weight: 600;
  text-align: left;
}

.matrix-workbench__hit {
  display: block;
  width: 100%;
  min-height: 100%;
  margin: 0;
  padding: 10px 12px;
  border: none;
  background: transparent;
  font: inherit;
  text-align: inherit;
  color: inherit;
  cursor: pointer;
  transition: background 0.15s ease;
}

.matrix-workbench__hit:focus-visible {
  outline: none;
  box-shadow: inset 0 0 0 2px var(--dp-focus-ring, rgba(22, 119, 255, 0.18));
}

.matrix-workbench__hit:hover {
  background: var(--dp-surface-elevated, #f1f5f9);
}

.matrix-workbench__th--row-header {
  z-index: 3;
  top: 0;
}

.matrix-workbench__corner-label {
  font-weight: 600;
  color: var(--dp-text-primary, #0f172a);
}

.matrix-workbench__corner-axis {
  margin-left: 6px;
  font-size: 12px;
  font-weight: 400;
  color: var(--dp-text-muted, #64748b);
}

.matrix-workbench__col-label {
  font-weight: 600;
  white-space: normal;
  line-height: 1.35;
}

.matrix-workbench__col-hint,
.matrix-workbench__row-hint {
  margin-top: 4px;
  font-size: 12px;
  font-weight: 400;
  color: var(--dp-text-muted, #64748b);
}

.matrix-workbench__col-badge,
.matrix-workbench__row-badge {
  display: inline-block;
  margin-top: 4px;
  padding: 0 6px;
  border-radius: 8px;
  font-size: 11px;
  line-height: 18px;
  font-weight: 600;
}

.matrix-workbench__row-label {
  font-weight: 600;
  line-height: 1.4;
}

.matrix-workbench__row-warning {
  margin-top: 4px;
  font-size: 12px;
  color: var(--dp-color-danger, #dc2626);
}

.matrix-workbench__th--summary {
  background: var(--dp-surface-strong, #eef2f7);
  font-weight: 600;
  text-align: center;
}

.matrix-workbench__cell {
  text-align: center;
  position: relative;
  padding: 0;
  vertical-align: top;
}

.matrix-workbench__cell--summary .matrix-workbench__hit,
.matrix-workbench__cell--summary {
  cursor: default;
}

.matrix-workbench__cell--summary .matrix-workbench__hit:hover {
  background: transparent;
}

.matrix-workbench__cell--summary {
  background: var(--dp-surface-strong, #eef2f7);
  cursor: default;
  font-weight: 600;
}

.matrix-workbench__cell--summary:hover {
  background: var(--dp-surface-strong, #eef2f7);
}

.matrix-workbench__cell-primary {
  font-weight: 600;
  color: var(--dp-text-primary, #0f172a);
}

.matrix-workbench__cell-secondary {
  margin-top: 2px;
  font-size: 11px;
  color: var(--dp-text-muted, #64748b);
}

.matrix-workbench__cell-empty {
  color: var(--dp-text-disabled);
  font-size: 14px;
}

.matrix-workbench__cell--empty-state {
  background: var(--dp-surface, #fff);
}

.matrix-workbench__cell-warning {
  position: absolute;
  top: 4px;
  right: 6px;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: var(--dp-color-danger, #dc2626);
  color: #fff;
  font-size: 11px;
  font-weight: 700;
  line-height: 14px;
  text-align: center;
}

.matrix-workbench__row--warning .matrix-workbench__th--row {
  background: rgba(220, 38, 38, 0.08);
}

.matrix-workbench__cell--gray {
  background: rgba(148, 163, 184, 0.08);
}

.matrix-workbench__cell--blue {
  background: rgba(59, 130, 246, 0.12);
}

.matrix-workbench__cell--green {
  background: rgba(34, 197, 94, 0.14);
}

.matrix-workbench__cell--orange {
  background: rgba(249, 115, 22, 0.14);
}

.matrix-workbench__cell--yellow {
  background: rgba(234, 179, 8, 0.14);
}

.matrix-workbench__cell--red {
  background: rgba(220, 38, 38, 0.14);
}

.matrix-workbench__cell--purple {
  background: rgba(168, 85, 247, 0.12);
}

.matrix-workbench__tone--gray {
  background: rgba(148, 163, 184, 0.16);
  color: var(--dp-text-primary, #0f172a);
}

.matrix-workbench__tone--blue {
  background: rgba(59, 130, 246, 0.16);
  color: #1d4ed8;
}

.matrix-workbench__tone--green {
  background: rgba(34, 197, 94, 0.18);
  color: #15803d;
}

.matrix-workbench__tone--orange {
  background: rgba(249, 115, 22, 0.18);
  color: #c2410c;
}

.matrix-workbench__tone--yellow {
  background: rgba(234, 179, 8, 0.2);
  color: #a16207;
}

.matrix-workbench__tone--red {
  background: rgba(220, 38, 38, 0.18);
  color: #b91c1c;
}

.matrix-workbench__tone--purple {
  background: rgba(168, 85, 247, 0.16);
  color: #7e22ce;
}
</style>
