<script setup lang="ts">
import type { ExamLayoutBlockDto, ExamLayoutDocument } from '@/apis/mark/exam-layout-design'
import type {
  ExamLayoutBlockTypeCode,
} from '@/types/enums/exam-layout-block-type-enum'
import { computed } from 'vue'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiDropdown from '@/components/ui-guide/ui/UiDropdown.vue'
import UiMenu from '@/components/ui-guide/ui/UiMenu.vue'
import UiMenuItem from '@/components/ui-guide/ui/UiMenuItem.vue'
import {
  ALL_EXAM_LAYOUT_BLOCK_TYPE_CODES,
} from '@/types/enums/exam-layout-block-type-enum'
import {
  blocksOnPage,
  createDefaultBlock,
  resolveBlockTypeLabel,
} from '@/utils/exam-layout-designer'

const props = withDefaults(
  defineProps<{
  document: ExamLayoutDocument | null
  pageNo: number
  focusedBlockId: string | null
  /**
   * MVR-389：默认拒绝假可写；仅父层显式 readonly===false 可增删/调层识别块。
   */
  readonly?: boolean
}>(),
  {
    readonly: true,
  },
)

const emit = defineEmits<{
  'focus-block': [block: ExamLayoutBlockDto | null]
  "patch": [document: ExamLayoutDocument]
}>()

/** MVR-389：未声明或 true 均只读 */
const layerReadonly = computed(() => props.readonly !== false)

const pageBlocks = computed(() => blocksOnPage(props.document, props.pageNo))

function addBlock(blockType: ExamLayoutBlockTypeCode): void {
  if (layerReadonly.value || !props.document) {
    return
  }
  const maxLayer = props.document.blocks.reduce((max, block) => Math.max(max, block.layer ?? 0), 0)
  const nextBlock = createDefaultBlock(props.pageNo, blockType, maxLayer + 1)
  emit('patch', {
    ...props.document,
    blocks: [...props.document.blocks, nextBlock],
  })
  emit('focus-block', nextBlock)
}

function removeFocusedBlock(): void {
  if (layerReadonly.value || !props.document || !props.focusedBlockId) {
    return
  }
  emit('patch', {
    ...props.document,
    blocks: props.document.blocks.filter((block) => block.id !== props.focusedBlockId),
    blockOptions: props.document.blockOptions?.filter(
      (option) => option.blockId !== props.focusedBlockId,
    ),
  })
  emit('focus-block', null)
}

function moveLayer(delta: number): void {
  if (layerReadonly.value || !props.document || !props.focusedBlockId) {
    return
  }
  const blocks = props.document.blocks.map((block) => {
    if (block.id !== props.focusedBlockId) {
      return block
    }
    return { ...block, layer: (block.layer ?? 0) + delta }
  })
  emit('patch', { ...props.document, blocks })
}
</script>

<template>
  <section class="layout-block-layer">
    <div class="layout-block-layer__header">
      <h2 class="layout-block-layer__title">识别图层</h2>
      <span class="layout-block-layer__count">第 {{ pageNo }} 页 · {{ pageBlocks.length }} 块</span>
    </div>
    <div v-if="!layerReadonly" class="layout-block-layer__actions">
      <UiDropdown>
        <UiButton size="sm" variant="primary">添加识别块</UiButton>
        <template #overlay>
          <UiMenu>
            <UiMenuItem
              v-for="blockType in ALL_EXAM_LAYOUT_BLOCK_TYPE_CODES"
              :key="blockType"
              @click="addBlock(blockType)"
            >
              {{ resolveBlockTypeLabel(blockType) }}
            </UiMenuItem>
          </UiMenu>
        </template>
      </UiDropdown>
      <UiButton size="sm" variant="outline" :disabled="!focusedBlockId" @click="moveLayer(1)">
        上移层
      </UiButton>
      <UiButton size="sm" variant="outline" :disabled="!focusedBlockId" @click="moveLayer(-1)">
        下移层
      </UiButton>
      <UiButton size="sm" variant="ghost" :disabled="!focusedBlockId" @click="removeFocusedBlock">
        删除
      </UiButton>
    </div>
    <ul class="layout-block-layer__list">
      <li
        v-for="block in pageBlocks"
        :key="block.id"
        class="layout-block-layer__item"
        :class="{ 'layout-block-layer__item--active': focusedBlockId === block.id }"
        @click="emit('focus-block', block)"
      >
        <span class="layout-block-layer__type">{{ resolveBlockTypeLabel(block.blockType) }}</span>
        <span class="layout-block-layer__meta">层 {{ block.layer ?? 0 }}</span>
      </li>
      <li v-if="pageBlocks.length === 0" class="layout-block-layer__empty">本页暂无识别块</li>
    </ul>
  </section>
</template>

<style scoped lang="scss">
.layout-block-layer {
  display: flex;
  flex-direction: column;
  gap: var(--dp-space-component);
  height: 100%;
  padding: var(--dp-space-component);
  border: 1px solid var(--dp-border-subtle);
  border-radius: var(--dp-radius-panel);
  background: var(--dp-surface);

  &__header {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: var(--dp-space-component-tight);
  }

  &__title {
    margin: 0;
    font-size: var(--dp-font-size-md);
    font-weight: 600;
    color: var(--dp-text-primary);
  }

  &__count {
    font-size: var(--dp-font-size-xs);
    color: var(--dp-text-secondary);
  }

  &__actions {
    display: flex;
    flex-wrap: wrap;
    gap: var(--dp-space-component-tight);
  }

  &__list {
    margin: 0;
    padding: 0;
    list-style: none;
    overflow: auto;
    flex: 1;
    min-height: 0;
  }

  &__item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--dp-space-component-tight);
    padding: var(--dp-space-component-tight) var(--dp-space-component);
    border-radius: var(--dp-radius-control);
    cursor: pointer;

    &:hover {
      background: var(--dp-surface-subtle);
    }

    &--active {
      background: color-mix(in srgb, var(--dp-color-primary) 8%, transparent);
      outline: 1px solid color-mix(in srgb, var(--dp-color-primary) 35%, transparent);
    }
  }

  &__type {
    font-size: var(--dp-font-size-sm);
    color: var(--dp-text-primary);
  }

  &__meta {
    font-size: var(--dp-font-size-xs);
    color: var(--dp-text-secondary);
  }

  &__empty {
    padding: var(--dp-space-component) var(--dp-space-component-tight);
    font-size: var(--dp-font-size-sm);
    color: var(--dp-text-secondary);
  }
}
</style>
