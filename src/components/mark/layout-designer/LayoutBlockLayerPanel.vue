<script setup lang="ts">
import type { ExamLayoutBlockDto, ExamLayoutDocument } from '@/apis/mark/exam-layout-design'
import type {
  ExamLayoutBlockTypeCode,
} from '@/types/enums/exam-layout-block-type-enum'
import { computed } from 'vue'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import {
  ALL_EXAM_LAYOUT_BLOCK_TYPE_CODES,
} from '@/types/enums/exam-layout-block-type-enum'
import {
  blocksOnPage,
  createDefaultBlock,
  resolveBlockTypeLabel,
} from '@/utils/exam-layout-designer'

const props = defineProps<{
  document: ExamLayoutDocument | null
  pageNo: number
  focusedBlockId: string | null
}>()

const emit = defineEmits<{
  'focus-block': [block: ExamLayoutBlockDto | null]
  "patch": [document: ExamLayoutDocument]
}>()

const pageBlocks = computed(() => blocksOnPage(props.document, props.pageNo))

const addableTypes = ALL_EXAM_LAYOUT_BLOCK_TYPE_CODES

function addBlock(blockType: ExamLayoutBlockTypeCode): void {
  if (!props.document) {
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
  if (!props.document || !props.focusedBlockId) {
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
  if (!props.document || !props.focusedBlockId) {
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
    <div class="layout-block-layer__actions">
      <a-dropdown>
        <UiButton size="sm" variant="primary">添加识别块</UiButton>
        <template #overlay>
          <a-menu>
            <a-menu-item
              v-for="blockType in addableTypes"
              :key="blockType"
              @click="addBlock(blockType)"
            >
              {{ resolveBlockTypeLabel(blockType) }}
            </a-menu-item>
          </a-menu>
        </template>
      </a-dropdown>
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
  gap: 12px;
  height: 100%;
  padding: 12px;
  border: 1px solid var(--dp-border-subtle);
  border-radius: var(--dp-radius-panel);
  background: #fff;

  &__header {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 8px;
  }

  &__title {
    margin: 0;
    font-size: 14px;
    font-weight: 600;
    color: var(--dp-text-primary);
  }

  &__count {
    font-size: 12px;
    color: var(--dp-text-secondary);
  }

  &__actions {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
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
    gap: 8px;
    padding: 8px 10px;
    border-radius: var(--dp-radius-control);
    cursor: pointer;

    &:hover {
      background: var(--dp-surface-subtle);
    }

    &--active {
      background: rgba(22, 119, 255, 0.08);
      outline: 1px solid rgba(22, 119, 255, 0.35);
    }
  }

  &__type {
    font-size: 13px;
    color: var(--dp-text-primary);
  }

  &__meta {
    font-size: 12px;
    color: var(--dp-text-secondary);
  }

  &__empty {
    padding: 16px 8px;
    font-size: 13px;
    color: var(--dp-text-secondary);
  }
}
</style>
