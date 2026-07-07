<script setup lang="ts">
import type { ExamLayoutBlockDto, ExamLayoutDocument, ExamLayoutQuestionDto } from '@/apis/mark/exam-layout-design'
import { computed, ref, watch } from 'vue'
import { useLayoutPageRaster } from '@/composables/useLayoutPageRaster'
import { ExamLayoutBlockTypeCode } from '@/types/enums/exam-layout-block-type-enum'
import { pageByNo, resolveBlockTypeLabel } from '@/utils/exam-layout-designer'

const props = defineProps<{
  document: ExamLayoutDocument | null
  question: ExamLayoutQuestionDto | null
}>()

const emit = defineEmits<{
  'focus-block': [block: ExamLayoutBlockDto]
}>()

const { loadPageRaster } = useLayoutPageRaster()
const cropItems = ref<Array<{ block: ExamLayoutBlockDto, dataUrl: string, label: string }>>([])
const loading = ref(false)

const relatedBlocks = computed(() => {
  if (!props.document || !props.question) {
    return [] as ExamLayoutBlockDto[]
  }
  return props.document.blocks
    .filter((block) => block.layoutQuestionId === props.question?.id)
    .sort((a, b) => {
      const order = (type: string) => {
        if (type === ExamLayoutBlockTypeCode.QUESTION_STEM) {
          return 0
        }
        if (type === ExamLayoutBlockTypeCode.SUBJECTIVE_ANSWER
          || type === ExamLayoutBlockTypeCode.OBJECTIVE_MATRIX) {
          return 1
        }
        return 2
      }
      return order(a.blockType) - order(b.blockType)
    })
})

async function renderCrops(): Promise<void> {
  if (!props.document || !props.question || relatedBlocks.value.length === 0) {
    cropItems.value = []
    return
  }
  loading.value = true
  try {
    const nextItems: Array<{ block: ExamLayoutBlockDto, dataUrl: string, label: string }> = []
    for (const block of relatedBlocks.value) {
      const page = pageByNo(props.document, block.pageNo)
      if (!page?.backgroundFileId || !block.rectNorm) {
        continue
      }
      const canvas = await loadPageRaster(page.backgroundFileId, page.pageNo, page.naturalWidthPx)
      if (!canvas) {
        continue
      }
      const sx = Math.round(block.rectNorm.x * canvas.width)
      const sy = Math.round(block.rectNorm.y * canvas.height)
      const sw = Math.max(1, Math.round(block.rectNorm.w * canvas.width))
      const sh = Math.max(1, Math.round(block.rectNorm.h * canvas.height))
      const crop = window.document.createElement('canvas')
      const maxWidth = 220
      const scale = Math.min(1, maxWidth / sw)
      crop.width = Math.max(1, Math.round(sw * scale))
      crop.height = Math.max(1, Math.round(sh * scale))
      const ctx = crop.getContext('2d')
      if (!ctx) {
        continue
      }
      ctx.drawImage(canvas, sx, sy, sw, sh, 0, 0, crop.width, crop.height)
      nextItems.push({
        block,
        dataUrl: crop.toDataURL('image/png'),
        label: resolveBlockTypeLabel(block.blockType),
      })
    }
    cropItems.value = nextItems
  } finally {
    loading.value = false
  }
}

watch(
  () => [props.question?.id, props.document?.blocks, props.document?.pages],
  () => {
    void renderCrops()
  },
  { immediate: true, deep: true },
)
</script>

<template>
  <section v-if="question" class="layout-question-crop-strip">
    <div class="layout-question-crop-strip__header">
      <h3 class="layout-question-crop-strip__title">第 {{ question.questionNo }} 题切片</h3>
      <span v-if="loading" class="layout-question-crop-strip__meta">生成中…</span>
      <span v-else class="layout-question-crop-strip__meta">{{ cropItems.length }} 个区域</span>
    </div>
    <div v-if="cropItems.length > 0" class="layout-question-crop-strip__list">
      <button
        v-for="item in cropItems"
        :key="item.block.id"
        type="button"
        class="layout-question-crop-strip__item"
        @click="emit('focus-block', item.block)"
      >
        <img :src="item.dataUrl" :alt="item.label" class="layout-question-crop-strip__image">
        <span class="layout-question-crop-strip__label">{{ item.label }}</span>
      </button>
    </div>
    <p v-else class="layout-question-crop-strip__empty">本题尚无识别区域切片</p>
  </section>
</template>

<style scoped lang="scss">
.layout-question-crop-strip {
  padding: 8px 10px;
  border: 1px solid var(--dp-border-subtle);
  border-radius: var(--dp-radius-panel);
  background: #fff;

  &__header {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 8px;
    margin-bottom: 8px;
  }

  &__title {
    margin: 0;
    font-size: 13px;
    font-weight: 600;
    color: var(--dp-text-primary);
  }

  &__meta,
  &__empty,
  &__label {
    font-size: 12px;
    color: var(--dp-text-secondary);
  }

  &__empty {
    margin: 0;
  }

  &__list {
    display: flex;
    gap: 8px;
    overflow-x: auto;
    padding-bottom: 2px;
  }

  &__item {
    flex: 0 0 auto;
    display: flex;
    flex-direction: column;
    gap: 4px;
    width: 148px;
    padding: 6px;
    border: 1px solid var(--dp-border-subtle);
    border-radius: 6px;
    background: #fff;
    cursor: pointer;
    text-align: left;

    &:hover {
      border-color: var(--dp-color-primary);
    }
  }

  &__image {
    display: block;
    width: 100%;
    max-height: 96px;
    object-fit: contain;
    background: #f8fafc;
    border-radius: 4px;
  }
}
</style>
