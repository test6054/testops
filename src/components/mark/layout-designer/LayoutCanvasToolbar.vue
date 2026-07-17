<script setup lang="ts">
import type { DefaultOptionType, SelectValue } from 'ant-design-vue/es/select'
import { MinusOutlined, PlusOutlined } from '@ant-design/icons-vue'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiCheckbox from '@/components/ui-guide/ui/UiCheckbox.vue'
import UiRadioGroup from '@/components/ui-guide/ui/UiRadioGroup.vue'
import UiSelect from '@/components/ui-guide/ui/UiSelect.vue'

export type LayoutCanvasToolCode = 'select' | 'marquee'

const props = withDefaults(
  defineProps<{
    zoom: number
    showGrid: boolean
    showSafeMargin: boolean
    snapGridMm: number
    canvasTool?: LayoutCanvasToolCode
    readOnly?: boolean
  }>(),
  {
    canvasTool: 'select',
    readOnly: false,
  },
)

const emit = defineEmits<{
  'update:zoom': [value: number]
  'update:show-grid': [value: boolean]
  'update:show-safe-margin': [value: boolean]
  'update:snap-grid-mm': [value: number]
  'update:canvas-tool': [value: LayoutCanvasToolCode]
}>()

const ZOOM_MIN = 0.5
const ZOOM_MAX = 2
const ZOOM_STEP = 0.1

function clampZoom(value: number): number {
  return Math.min(Math.max(Math.round(value * 100) / 100, ZOOM_MIN), ZOOM_MAX)
}

function zoomIn(): void {
  emit('update:zoom', clampZoom(props.zoom + ZOOM_STEP))
}

function zoomOut(): void {
  emit('update:zoom', clampZoom(props.zoom - ZOOM_STEP))
}

function toggleGrid(): void {
  emit('update:show-grid', !props.showGrid)
}

function toggleSafeMargin(): void {
  emit('update:show-safe-margin', !props.showSafeMargin)
}

function onCanvasToolChange(value: string | number | boolean | undefined): void {
  switch (value) {
    case 'select':
    case 'marquee':
      emit('update:canvas-tool', value)
      break
  }
}

function onSnapChange(value: SelectValue, _option?: DefaultOptionType | DefaultOptionType[]): void {
  if (typeof value === 'number') {
    emit('update:snap-grid-mm', value)
    return
  }
  if (typeof value === 'string') {
    emit('update:snap-grid-mm', Number(value) || 0)
  }
}
</script>

<template>
  <div class="layout-canvas-toolbar">
    <div v-if="!readOnly" class="layout-canvas-toolbar__group">
      <UiRadioGroup
        :model-value="canvasTool"
        size="sm"
        :options="[
          { label: '选择', value: 'select' },
          { label: '框选', value: 'marquee' },
        ]"
        @update:model-value="onCanvasToolChange"
      />
    </div>
    <div class="layout-canvas-toolbar__group">
      <UiButton size="sm" variant="outline" @click="zoomOut">
        <template #icon><MinusOutlined /></template>
      </UiButton>
      <span class="layout-canvas-toolbar__zoom">{{ Math.round(zoom * 100) }}%</span>
      <UiButton size="sm" variant="outline" @click="zoomIn">
        <template #icon><PlusOutlined /></template>
      </UiButton>
    </div>
    <div class="layout-canvas-toolbar__group">
      <UiCheckbox :checked="showGrid" @change="toggleGrid">对齐网格</UiCheckbox>
      <UiCheckbox :checked="showSafeMargin" @change="toggleSafeMargin">安全边距</UiCheckbox>
      <UiSelect
        v-if="!readOnly"
        :model-value="snapGridMm"
        size="small"
        style="width: 108px"
        :options="[
          { value: 0, label: '无吸附' },
          { value: 1, label: '1mm 吸附' },
          { value: 5, label: '5mm 吸附' },
        ]"
        @change="onSnapChange"
      />
    </div>
  </div>
</template>

<style scoped lang="scss">
.layout-canvas-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 8px;
  flex-wrap: wrap;

  &__group {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  &__zoom {
    min-width: 44px;
    text-align: center;
    font-size: 13px;
    color: var(--dp-text-secondary);
  }
}
</style>
