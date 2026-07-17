<script setup lang="ts">
import type { ExamLayoutBlockDto, ExamLayoutDocument } from '@/apis/mark/exam-layout-design'
import { message } from 'ant-design-vue'
import { computed, ref } from 'vue'
import { adjustExamLayoutQuestionRegion } from '@/apis/mark/exam-layout-design'
import LayoutCanvasLite from '@/components/mark/layout-designer/LayoutCanvasLite.vue'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiDrawer from '@/components/ui-guide/ui/UiDrawer.vue'
import UiSelect from '@/components/ui-guide/ui/UiSelect.vue'
import { showUserError } from '@/utils/error-handler'

const open = defineModel<boolean>('open', { default: false })

const props = defineProps<{
  examId: string
  document: ExamLayoutDocument | null
  pageNo: number
  readonly?: boolean
}>()

const emit = defineEmits<{
  patch: [document: ExamLayoutDocument]
  saved: []
}>()

const focusedBlockId = ref<string | null>(null)
const saving = ref(false)

const subjectiveBlocks = computed(() =>
  (props.document?.blocks ?? []).filter(
    (block) =>
      block.pageNo === props.pageNo
      && (block.blockType === 'SUBJECTIVE_ANSWER' || block.blockType === 'OBJECTIVE_MATRIX'),
  ),
)

function handleFocus(block: ExamLayoutBlockDto | null): void {
  focusedBlockId.value = block?.id ?? null
}

async function persistAdjust(): Promise<void> {
  if (saving.value) {
    return
  }
  if (props.readonly) {
    message.warning('考试已开印或已开始扫描，制卷设计不可修改')
    return
  }
  if (!props.document || !focusedBlockId.value) {
    message.warning('请先选择需要微调的识别块')
    return
  }
  const block = props.document.blocks.find((item) => item.id === focusedBlockId.value)
  if (!block) {
    return
  }
  if (!/^\d+$/.test(block.id)) {
    message.warning('请先保存制卷设计后再微调识别区')
    return
  }
  saving.value = true
  try {
    await adjustExamLayoutQuestionRegion({
      examId: props.examId,
      blockId: block.id,
      rectNorm: block.rectNorm,
    })
    message.success('识别区微调已保存')
    emit('saved')
  } catch (error) {
    showUserError(error, '识别区微调保存失败')
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <UiDrawer v-model:open="open" title="复核微调" width="min(1080px, 98vw)" destroy-on-close>
    <p class="layout-review-drawer__hint">
      仅调整当前页主观/客观识别区，保存后写入正式 layout 块坐标。
    </p>
    <div class="layout-review-drawer__toolbar">
      <UiSelect
        size="sm"
        :model-value="focusedBlockId ?? undefined"
        allow-clear
        placeholder="选择识别块"
        style="min-width: 240px"
        :options="
          subjectiveBlocks.map((block) => ({
            value: block.id,
            label: `${block.blockType} · ${block.id.slice(0, 8)}`,
          }))
        "
        @change="focusedBlockId = ($event as string | undefined) ?? null"
      />
      <UiButton size="sm" variant="primary" :loading="saving" :disabled="readonly" @click="persistAdjust">
        保存微调
      </UiButton>
    </div>
    <LayoutCanvasLite
      :document="document"
      :page-no="pageNo"
      :focused-block-id="focusedBlockId"
      @focus-block="handleFocus"
      @patch="emit('patch', $event)"
    />
  </UiDrawer>
</template>

<style scoped lang="scss">
.layout-review-drawer {
  &__hint {
    margin: 0 0 12px;
    font-size: 13px;
    color: var(--dp-text-secondary);
  }

  &__toolbar {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 12px;
    flex-wrap: wrap;
  }
}
</style>
