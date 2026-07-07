<script setup lang="ts">
import type { PortfolioPortraitDimensionCode } from '@/apis/portfolio/enums'
import type { PortfolioPortraitLayoutWidget } from '@/utils/portrait-layout'
import { computed, ref } from 'vue'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import {
  PORTRAIT_DIMENSION_OPTIONS,
  PORTRAIT_WIDGET_TYPE_OPTIONS,
  PortraitWidgetTypeCode,
  PortraitWidgetTypeDescription,
} from '@/utils/portrait-layout'

const props = defineProps<{
  widgets: PortfolioPortraitLayoutWidget[]
}>()
const emit = defineEmits<{
  'update:widgets': [PortfolioPortraitLayoutWidget[]]
}>()
const GRID_COLS = 12
const GRID_ROWS = 8

const dragIndex = ref<number | null>(null)
const selectedIndex = ref<number | null>(null)

const widgetOptions = PORTRAIT_WIDGET_TYPE_OPTIONS

function selectPortraitWidget(value: unknown): PortraitWidgetTypeCode | undefined {
  if (typeof value !== 'string') {
    return undefined
  }
  return widgetOptions.find(option => option.value === value)?.value
}

function selectPortraitDimension(value: unknown): PortfolioPortraitDimensionCode | undefined {
  if (typeof value !== 'string') {
    return undefined
  }
  return PORTRAIT_DIMENSION_OPTIONS.find(option => option.value === value)?.value
}

function updateSelectedWidget(index: number, value: unknown) {
  const widget = selectPortraitWidget(value)
  if (widget) {
    patch(index, { widget })
  }
}

function updateSelectedDimension(index: number, value: unknown) {
  patch(index, { dimensionCode: selectPortraitDimension(value) })
}

const canvasCells = computed(() => {
  const cells: Array<{ col: number, row: number, key: string }> = []
  for (let row = 0; row < GRID_ROWS; row += 1) {
    for (let col = 0; col < GRID_COLS; col += 1) {
      cells.push({ col, row, key: `${col}-${row}` })
    }
  }
  return cells
})

function patch(index: number, patchValue: Partial<PortfolioPortraitLayoutWidget>) {
  const next = props.widgets.map((row, i) => (i === index ? { ...row, ...patchValue } : row))
  emit('update:widgets', next)
}

function addWidget() {
  emit('update:widgets', [
    ...props.widgets,
    { widget: PortraitWidgetTypeCode.RADAR, x: 0, y: props.widgets.length * 2, w: 6, h: 2 },
  ])
}

function removeWidget(index: number) {
  emit(
    'update:widgets',
    props.widgets.filter((_, i) => i !== index),
  )
  if (selectedIndex.value === index) {
    selectedIndex.value = null
  }
}

function onDragStart(index: number, event: DragEvent) {
  dragIndex.value = index
  selectedIndex.value = index
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', String(index))
  }
}

function onDropCell(col: number, row: number) {
  if (dragIndex.value == null) {
    return
  }
  const widget = props.widgets[dragIndex.value]
  const maxX = Math.max(0, GRID_COLS - widget.w)
  const maxY = Math.max(0, GRID_ROWS - widget.h)
  patch(dragIndex.value, {
    x: Math.min(col, maxX),
    y: Math.min(row, maxY),
  })
  dragIndex.value = null
}

function onDragOverCell(event: DragEvent) {
  event.preventDefault()
  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = 'move'
  }
}

function widgetStyle(row: PortfolioPortraitLayoutWidget) {
  return {
    gridColumn: `${row.x + 1} / span ${row.w}`,
    gridRow: `${row.y + 1} / span ${row.h}`,
  }
}

function selectWidget(index: number) {
  selectedIndex.value = index
}
</script>

<template>
  <div class="layout-editor">
    <div
      class="layout-canvas"
      :style="{
        gridTemplateColumns: `repeat(${GRID_COLS}, 1fr)`,
        gridTemplateRows: `repeat(${GRID_ROWS}, 32px)`,
      }"
    >
      <div
        v-for="cell in canvasCells"
        :key="cell.key"
        class="layout-cell"
        @dragover="onDragOverCell"
        @drop="onDropCell(cell.col, cell.row)"
      />
      <div
        v-for="(row, index) in widgets"
        :key="index"
        class="layout-widget"
        :class="{ 'layout-widget--selected': selectedIndex === index }"
        draggable="true"
        :style="widgetStyle(row)"
        @click="selectWidget(index)"
        @dragstart="onDragStart(index, $event)"
        @dragend="dragIndex = null"
      >
        <span class="layout-widget__label">{{ PortraitWidgetTypeDescription[row.widget] }}</span>
        <span v-if="row.dimensionCode" class="layout-widget__dim">{{ row.dimensionCode }}</span>
        <div class="layout-widget__mock" />
      </div>
    </div>
    <div v-if="selectedIndex != null && widgets[selectedIndex]" class="layout-props">
      <a-select
        :value="widgets[selectedIndex].widget"
        :options="widgetOptions"
        style="width: 120px"
        @update:value="updateSelectedWidget(selectedIndex, $event)"
      />
      <a-select
        :value="widgets[selectedIndex].dimensionCode"
        allow-clear
        placeholder="绑定维度"
        style="width: 160px"
        :options="PORTRAIT_DIMENSION_OPTIONS"
        @update:value="updateSelectedDimension(selectedIndex, $event)"
      />
      <a-input-number
        :value="widgets[selectedIndex].w"
        :min="1"
        :max="12"
        placeholder="宽"
        @update:value="patch(selectedIndex, { w: Number($event) || 1 })"
      />
      <a-input-number
        :value="widgets[selectedIndex].h"
        :min="1"
        :max="8"
        placeholder="高"
        @update:value="patch(selectedIndex, { h: Number($event) || 1 })"
      />
      <UiButton size="sm" @click="removeWidget(selectedIndex)"> 删除 </UiButton>
    </div>
    <UiButton @click="addWidget"> 添加组件 </UiButton>
  </div>
</template>

<style scoped>
.layout-editor {
  display: flex;
  flex-direction: column;
  gap: var(--dp-space-2);
}
.layout-canvas {
  position: relative;
  display: grid;
  gap: var(--dp-space-1);
  padding: var(--dp-space-2);
  border: 1px solid var(--dp-border);
  border-radius: var(--dp-radius-xs);
  background: var(--dp-surface-subtle);
}
.layout-cell {
  border: 1px dashed var(--ant-color-border-secondary);
  border-radius: var(--dp-radius-control-inner);
  min-height: 28px;
}
.layout-widget {
  z-index: 1;
  display: flex;
  flex-direction: column;
  gap: var(--dp-space-1);
  padding: var(--dp-space-2);
  border: 1px solid var(--ant-color-primary);
  border-radius: var(--dp-radius-xs);
  background: var(--dp-surface);
  cursor: grab;
  overflow: hidden;
}
.layout-widget--selected {
  box-shadow: 0 0 0 2px var(--dp-focus-ring);
}
.layout-widget__label {
  font-size: var(--dp-font-size-sm);
  font-weight: var(--dp-font-weight-title);
}
.layout-widget__dim {
  font-size: var(--dp-font-size-xxs);
  color: var(--dp-text-secondary);
}
.layout-widget__mock {
  flex: 1;
  min-height: 24px;
  border-radius: var(--dp-radius-control-inner);
  background: var(--ant-color-fill-secondary);
}
.layout-props {
  display: flex;
  flex-wrap: wrap;
  gap: var(--dp-space-2);
  align-items: center;
}
</style>
