<script setup lang="ts">
import type { PortfolioPortraitDimensionCode } from '@/apis/portfolio/enums'
import type { PortfolioPortraitLayoutWidget } from '@/utils/portrait-layout'
import { computed, ref } from 'vue'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiAlertStrip from '@/components/ui-guide/ui/UiAlertStrip.vue'
import UiInputNumber from '@/components/ui-guide/ui/UiInputNumber.vue'
import UiSegmented from '@/components/ui-guide/ui/UiSegmented.vue'
import UiSelect from '@/components/ui-guide/ui/UiSelect.vue'
import {
  assessPortraitLayout,
  createPortraitEditorKey,
  PORTRAIT_DIMENSION_OPTIONS,
  PORTRAIT_LAYOUT_GRID_COLS,
  PORTRAIT_LAYOUT_GRID_ROWS,
  PORTRAIT_WIDGET_TYPE_OPTIONS,
  PortraitWidgetTypeCode,
  PortraitWidgetTypeDescription,
} from '@/utils/portrait-layout'
import { strictEnumLabel } from '@/utils/strict-enum'

const props = defineProps<{
  widgets: PortfolioPortraitLayoutWidget[]
}>()
const emit = defineEmits<{
  'update:widgets': [PortfolioPortraitLayoutWidget[]]
}>()

const GRID_COLS = PORTRAIT_LAYOUT_GRID_COLS
const GRID_ROWS = PORTRAIT_LAYOUT_GRID_ROWS

const dragIndex = ref<number | null>(null)
const selectedIndex = ref<number | null>(null)
const previewWidth = ref<number>(1440)

const previewWidthOptions = [
  { value: 1440, label: '1440' },
  { value: 1024, label: '1024' },
  { value: 768, label: '768' },
]

const layoutIssues = computed(() => assessPortraitLayout(props.widgets))
const blockingIssues = computed(() => layoutIssues.value.filter((issue) => issue.level === 'error'))
const warningIssues = computed(() => layoutIssues.value.filter((issue) => issue.level === 'warning'))
const overlapIndexes = computed(() => {
  const set = new Set<number>()
  for (const issue of layoutIssues.value) {
    if (issue.code === 'OVERLAP' || issue.code === 'OUT_OF_BOUNDS') {
      issue.widgetIndexes.forEach((index) => set.add(index))
    }
  }
  return set
})

function selectPortraitWidget(value: unknown): PortraitWidgetTypeCode | undefined {
  if (typeof value !== 'string') {
    return undefined
  }
  return PORTRAIT_WIDGET_TYPE_OPTIONS.find((option) => option.value === value)?.value
}

function selectPortraitDimension(value: unknown): PortfolioPortraitDimensionCode | undefined {
  if (typeof value !== 'string') {
    return undefined
  }
  return PORTRAIT_DIMENSION_OPTIONS.find((option) => option.value === value)?.value
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

function clampWidget(
  row: PortfolioPortraitLayoutWidget,
  next: Partial<Pick<PortfolioPortraitLayoutWidget, 'x' | 'y' | 'w' | 'h'>>,
): Pick<PortfolioPortraitLayoutWidget, 'x' | 'y' | 'w' | 'h'> {
  const w = Math.min(GRID_COLS, Math.max(1, next.w ?? row.w))
  const h = Math.min(GRID_ROWS, Math.max(1, next.h ?? row.h))
  const x = Math.min(GRID_COLS - w, Math.max(0, next.x ?? row.x))
  const y = Math.min(GRID_ROWS - h, Math.max(0, next.y ?? row.y))
  return { x, y, w, h }
}

function addWidget() {
  const used = new Set(props.widgets.map((row) => row.widget))
  const nextType = PORTRAIT_WIDGET_TYPE_OPTIONS.find((option) => !used.has(option.value))?.value
    ?? PortraitWidgetTypeCode.SCORE_CARD
  emit('update:widgets', [
    ...props.widgets,
    {
      editorKey: createPortraitEditorKey(),
      widget: nextType,
      x: 0,
      y: Math.min(GRID_ROWS - 2, props.widgets.length * 2),
      w: 6,
      h: 2,
    },
  ])
  selectedIndex.value = props.widgets.length
}

function removeWidget(index: number) {
  emit(
    'update:widgets',
    props.widgets.filter((_, i) => i !== index),
  )
  if (selectedIndex.value === index) {
    selectedIndex.value = null
  } else if (selectedIndex.value != null && selectedIndex.value > index) {
    selectedIndex.value -= 1
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
  patch(dragIndex.value, clampWidget(widget, { x: col, y: row }))
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

function sampleLines(widget: PortraitWidgetTypeCode): string[] {
  if (widget === PortraitWidgetTypeCode.RADAR) {
    return ['教学 82', '科研 74', '培训 68', '实践 71']
  }
  if (widget === PortraitWidgetTypeCode.TIMELINE) {
    return ['2024·骨干教师认定', '2025·省级课题立项', '2026·企业实践结项']
  }
  if (widget === PortraitWidgetTypeCode.BAR) {
    return ['学分 36', '荣誉 4', '成果 7']
  }
  return ['综合得分 78.6', '较院系均值 +3.2']
}

function nudgeSelected(dx: number, dy: number, resize: boolean) {
  if (selectedIndex.value == null) {
    return
  }
  const row = props.widgets[selectedIndex.value]
  if (!row) {
    return
  }
  if (resize) {
    patch(selectedIndex.value, clampWidget(row, { w: row.w + dx, h: row.h + dy }))
    return
  }
  patch(selectedIndex.value, clampWidget(row, { x: row.x + dx, y: row.y + dy }))
}

function onCanvasKeydown(event: KeyboardEvent) {
  if (selectedIndex.value == null) {
    return
  }
  const resize = event.shiftKey
  if (event.key === 'ArrowLeft') {
    event.preventDefault()
    nudgeSelected(resize ? -1 : -1, 0, resize)
    return
  }
  if (event.key === 'ArrowRight') {
    event.preventDefault()
    nudgeSelected(1, 0, resize)
    return
  }
  if (event.key === 'ArrowUp') {
    event.preventDefault()
    nudgeSelected(0, resize ? -1 : -1, resize)
    return
  }
  if (event.key === 'ArrowDown') {
    event.preventDefault()
    nudgeSelected(0, 1, resize)
    return
  }
  if (event.key === 'Delete' || event.key === 'Backspace') {
    event.preventDefault()
    removeWidget(selectedIndex.value)
  }
}

defineExpose({
  layoutIssues,
  hasBlockingIssues: computed(() => blockingIssues.value.length > 0),
})
</script>

<template>
  <div class="layout-editor">
    <div class="layout-toolbar">
      <span class="layout-toolbar__hint">方向键移动 · Shift+方向键缩放 · Delete 删除</span>
      <UiSegmented
        v-model="previewWidth"
        size="sm"
        :options="previewWidthOptions"
      />
    </div>
    <div
      class="layout-canvas"
      role="application"
      aria-label="画像布局画布"
      tabindex="0"
      :style="{
        maxWidth: `${previewWidth}px`,
        gridTemplateColumns: `repeat(${GRID_COLS}, 1fr)`,
        gridTemplateRows: `repeat(${GRID_ROWS}, minmax(36px, auto))`,
      }"
      @keydown="onCanvasKeydown"
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
        :key="row.editorKey"
        class="layout-widget"
        :class="{
          'layout-widget--selected': selectedIndex === index,
          'layout-widget--conflict': overlapIndexes.has(index),
        }"
        draggable="true"
        role="button"
        tabindex="0"
        :aria-pressed="selectedIndex === index"
        :aria-label="`组件 ${index + 1} ${strictEnumLabel(PortraitWidgetTypeDescription, row.widget, '画像组件类型')}`"
        :style="widgetStyle(row)"
        @click="selectWidget(index)"
        @focus="selectWidget(index)"
        @keydown="onCanvasKeydown"
        @dragstart="onDragStart(index, $event)"
        @dragend="dragIndex = null"
      >
        <span class="layout-widget__label">{{
          strictEnumLabel(PortraitWidgetTypeDescription, row.widget, '画像组件类型')
        }}</span>
        <span v-if="row.dimensionCode" class="layout-widget__dim">{{ row.dimensionCode }}</span>
        <ul class="layout-widget__sample">
          <li v-for="line in sampleLines(row.widget)" :key="line">{{ line }}</li>
        </ul>
      </div>
    </div>
    <UiAlertStrip
      v-if="blockingIssues.length"
      tone="error"
      :title="`布局存在 ${blockingIssues.length} 项阻断问题，保存前须修正`"
      :description="blockingIssues.map((issue) => issue.message).join('；')"
    />
    <UiAlertStrip
      v-else-if="warningIssues.length"
      tone="warning"
      :title="`布局提示 ${warningIssues.length} 项`"
      :description="warningIssues.map((issue) => issue.message).join('；')"
    />
    <table class="layout-order" aria-label="组件顺序与位置">
      <thead>
        <tr>
          <th>#</th>
          <th>类型</th>
          <th>X</th>
          <th>Y</th>
          <th>宽</th>
          <th>高</th>
          <th />
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="(row, index) in widgets"
          :key="row.editorKey"
          :class="{ 'layout-order__row--active': selectedIndex === index }"
          @click="selectWidget(index)"
        >
          <td>{{ index + 1 }}</td>
          <td>{{ strictEnumLabel(PortraitWidgetTypeDescription, row.widget, '画像组件类型') }}</td>
          <td>{{ row.x }}</td>
          <td>{{ row.y }}</td>
          <td>{{ row.w }}</td>
          <td>{{ row.h }}</td>
          <td>
            <UiButton size="sm" @click.stop="removeWidget(index)">删除</UiButton>
          </td>
        </tr>
      </tbody>
    </table>
    <div v-if="selectedIndex != null && widgets[selectedIndex]" class="layout-props">
      <UiSelect
        size="sm"
        :model-value="widgets[selectedIndex].widget"
        :options="PORTRAIT_WIDGET_TYPE_OPTIONS"
        style="width: 120px"
        @update:model-value="updateSelectedWidget(selectedIndex, $event)"
      />
      <UiSelect
        size="sm"
        :model-value="widgets[selectedIndex].dimensionCode"
        allow-clear
        placeholder="绑定维度"
        style="width: 160px"
        :options="PORTRAIT_DIMENSION_OPTIONS"
        @update:model-value="updateSelectedDimension(selectedIndex, $event)"
      />
      <UiInputNumber
        size="sm"
        :value="widgets[selectedIndex].x"
        :min="0"
        :max="11"
        placeholder="X"
        @update:value="
          patch(selectedIndex, clampWidget(widgets[selectedIndex], { x: Number($event) || 0 }))
        "
      />
      <UiInputNumber
        size="sm"
        :value="widgets[selectedIndex].y"
        :min="0"
        :max="7"
        placeholder="Y"
        @update:value="
          patch(selectedIndex, clampWidget(widgets[selectedIndex], { y: Number($event) || 0 }))
        "
      />
      <UiInputNumber
        size="sm"
        :value="widgets[selectedIndex].w"
        :min="1"
        :max="12"
        placeholder="宽"
        @update:value="
          patch(selectedIndex, clampWidget(widgets[selectedIndex], { w: Number($event) || 1 }))
        "
      />
      <UiInputNumber
        size="sm"
        :value="widgets[selectedIndex].h"
        :min="1"
        :max="8"
        placeholder="高"
        @update:value="
          patch(selectedIndex, clampWidget(widgets[selectedIndex], { h: Number($event) || 1 }))
        "
      />
      <UiButton size="sm" @click="removeWidget(selectedIndex)"> 删除 </UiButton>
    </div>
    <UiButton size="sm" variant="primary" @click="addWidget"> 添加组件 </UiButton>
  </div>
</template>

<style scoped>
.layout-editor {
  display: flex;
  flex-direction: column;
  gap: var(--dp-space-component-tight);
}
.layout-toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: var(--dp-space-component-tight);
  align-items: center;
  justify-content: space-between;
}
.layout-toolbar__hint {
  font-size: var(--dp-font-size-sm);
  color: var(--dp-text-secondary);
}
.layout-canvas {
  position: relative;
  display: grid;
  gap: var(--dp-space-component-xs);
  width: 100%;
  padding: var(--dp-space-component-tight);
  border: 1px solid var(--dp-border);
  border-radius: var(--dp-radius-xs);
  background: var(--dp-surface-subtle);
  outline: none;
}
.layout-canvas:focus-visible {
  box-shadow: 0 0 0 2px var(--dp-focus-ring);
}
.layout-cell {
  border: 1px dashed var(--dp-border-subtle);
  border-radius: var(--dp-radius-control-inner);
  min-height: 28px;
}
.layout-widget {
  z-index: 1;
  display: flex;
  flex-direction: column;
  gap: var(--dp-space-component-xs);
  padding: var(--dp-space-component-tight);
  border: 1px solid var(--dp-color-primary);
  border-radius: var(--dp-radius-xs);
  background: var(--dp-surface);
  cursor: grab;
  overflow: hidden;
}
.layout-widget--selected {
  box-shadow: 0 0 0 2px var(--dp-focus-ring);
}
.layout-widget--conflict {
  border-color: var(--ant-color-error);
  background: var(--ant-color-error-bg);
}
.layout-widget__label {
  font-size: var(--dp-font-size-sm);
  font-weight: var(--dp-font-weight-title);
}
.layout-widget__dim {
  font-size: var(--dp-font-size-xs);
  color: var(--dp-text-secondary);
}
.layout-widget__sample {
  margin: 0;
  padding-left: 1.1em;
  font-size: var(--dp-font-size-xs);
  line-height: 1.4;
  color: var(--dp-text-secondary);
}
.layout-order {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--dp-font-size-sm);
}
.layout-order th,
.layout-order td {
  padding: var(--dp-space-component-xs) var(--dp-space-component-tight);
  border-bottom: 1px solid var(--dp-border-subtle);
  text-align: left;
}
.layout-order__row--active {
  background: var(--dp-surface-chrome);
}
.layout-props {
  display: flex;
  flex-wrap: wrap;
  gap: var(--dp-space-component-tight);
  align-items: center;
}
</style>
