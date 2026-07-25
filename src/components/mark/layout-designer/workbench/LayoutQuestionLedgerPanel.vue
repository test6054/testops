<script setup lang="ts">
import type { ColumnsType } from 'ant-design-vue/es/table'
import type { ExamLayoutDocument, ExamLayoutQuestionDto } from '@/apis/mark/exam-layout-design'
import { computed, ref } from 'vue'
import { MarkOcrSceneDescription } from '@/apis/mark/ocr-scene'
import { QuestionTypeDescription } from '@/apis/mark/question-type'
import LayoutQuestionPropertyPanel from '@/components/mark/layout-designer/LayoutQuestionPropertyPanel.vue'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiAlertStrip from '@/components/ui-guide/ui/UiAlertStrip.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import { isLayoutQuestionRoiReady } from '@/utils/exam-layout-designer'
import { ROI_NOT_CONFIGURED_LABEL } from '@/utils/format-exam-layout-question-summary'
import { strictEnumLabel } from '@/utils/strict-enum'

const props = withDefaults(
  defineProps<{
  document: ExamLayoutDocument | null
  focusedQuestionId: string | null
  readonly?: boolean
}>(),
  {
    readonly: true,
  },
)

const emit = defineEmits<{
  "patch": [document: ExamLayoutDocument]
  'focus-question': [question: ExamLayoutQuestionDto | null]
  'locate-roi': [question: ExamLayoutQuestionDto]
}>()

/** MVR-388：默认拒绝；仅父层显式 readonly===false（layoutWritable）可写 */
const ledgerReadonly = computed(() => props.readonly !== false)

interface QuestionRow {
  key: string
  question: ExamLayoutQuestionDto
  questionNo: string
  printedQuestionNo: string | null
  ocrSceneLabel: string
  questionTypeLabel: string
  fullScore: number
  roiReady: boolean
  answerReady: boolean
}

const rows = computed((): QuestionRow[] =>
  [...(props.document?.questions ?? [])]
    .sort((a, b) => (a.sortNo ?? 0) - (b.sortNo ?? 0) || a.questionNo.localeCompare(b.questionNo))
    .map((question) => ({
      key: question.id,
      question,
      questionNo: question.questionNo,
      printedQuestionNo: question.printedQuestionNo ?? null,
      ocrSceneLabel: question.ocrScene
        ? strictEnumLabel(MarkOcrSceneDescription, question.ocrScene, 'OCR 场景')
        : '',
      questionTypeLabel: strictEnumLabel(QuestionTypeDescription, question.questionType, '题型'),
      fullScore: question.fullScore ?? 0,
      roiReady: isLayoutQuestionRoiReady(props.document, question.id),
      answerReady: Boolean(
        question.answer?.standardAnswer?.trim()
        || question.answer?.gradingRubric?.trim()
        || (question.answer?.choiceOptions?.length ?? 0) > 0
        || question.answer?.numericExpectedValue != null,
      ),
    })),
)

const columns: ColumnsType<QuestionRow> = [
  { title: '全局题号', dataIndex: 'questionNo', width: 84, align: 'center', fixed: 'left' },
  { title: '纸面题号', dataIndex: 'printedQuestionNo', width: 84, align: 'center' },
  { title: 'OCR 场景', dataIndex: 'ocrSceneLabel', width: 108 },
  { title: '题型', dataIndex: 'questionTypeLabel', width: 72, align: 'center' },
  { title: '满分', dataIndex: 'fullScore', width: 72, align: 'right' },
  { title: 'ROI', key: 'roi', width: 88, align: 'center' },
  { title: '答案', key: 'answer', width: 88, align: 'center' },
  { title: '操作', key: 'actions', width: 96, align: 'center' },
]

const selectedQuestion = computed(
  () => rows.value.find((row) => row.key === props.focusedQuestionId)?.question ?? null,
)

const tableScrollY = ref(360)

function handleRowClick(record: QuestionRow): void {
  emit('focus-question', record.question)
}
</script>

<template>
  <section class="layout-question-ledger">
    <div class="layout-question-ledger__table">
      <div class="layout-question-ledger__header">
        <h2 class="layout-question-ledger__title">题目台账</h2>
        <span class="layout-question-ledger__count">{{ rows.length }} 题</span>
      </div>
      <UiAlertStrip
        v-if="rows.length === 0"
        tone="info"
        size="sm"
        dense
        inline
        :show-icon="false"
        class="layout-question-ledger__gate"
      >
        <template #default>
          <span class="layout-question-ledger__gate-row">
            <UiTag tone="blue" size="sm">待完成资料入口</UiTag>
            <span class="layout-question-ledger__gate-text">请先完成资料入口：整卷识别或生成答题卡</span>
          </span>
        </template>
      </UiAlertStrip>
      <UiDataTable
        v-else
        pagination-mode="none"
        :columns="columns"
        :data-source="rows"
        :show-pagination="false"
        :sticky-header="false"
        :scroll="{ y: tableScrollY }"
        flat
        size="small"
        row-key="key"
        :custom-row="
          (record) => ({
            onClick: () => handleRowClick(record as QuestionRow),
            class:
              focusedQuestionId === (record as QuestionRow).key
                ? 'layout-question-ledger__row--active'
                : '',
          })
        "
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'roi'">
            <UiTag :tone="record.roiReady ? 'green' : 'orange'" size="sm">
              {{ record.roiReady ? '已配置' : ROI_NOT_CONFIGURED_LABEL }}
            </UiTag>
          </template>
          <template v-else-if="column.key === 'answer'">
            <UiTag :tone="record.answerReady ? 'green' : 'orange'" size="sm">
              {{ record.answerReady ? '已配置' : '待补' }}
            </UiTag>
          </template>
          <template v-else-if="column.key === 'actions'">
            <UiButton
              size="sm"
              variant="ghost"
              :disabled="ledgerReadonly"
              @click.stop="emit('locate-roi', record.question)"
            >
              定位 ROI
            </UiButton>
          </template>
        </template>
      </UiDataTable>
    </div>
    <LayoutQuestionPropertyPanel
      class="layout-question-ledger__detail"
      :document="document"
      :question="selectedQuestion"
      :readonly="ledgerReadonly"
      @patch="emit('patch', $event)"
    />
  </section>
</template>

<style scoped lang="scss">
.layout-question-ledger {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 320px;
  gap: 12px;
  min-height: 240px;

  &__header {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    margin-bottom: 8px;
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

  &__detail {
    min-height: 0;
  }

  &__gate {
    margin: var(--dp-space-2) 0;
    max-width: 100%;
  }

  &__gate-row {
    display: inline-flex;
    align-items: center;
    gap: var(--dp-space-2);
    min-width: 0;
  }

  &__gate-text {
    font-size: var(--dp-font-size-sm);
    color: var(--dp-text-secondary);
  }

  :deep(.layout-question-ledger__row--active td) {
    background: color-mix(in srgb, var(--dp-color-primary) 6%, transparent);
  }

  @media (max-width: 1100px) {
    grid-template-columns: 1fr;
  }
}
</style>
