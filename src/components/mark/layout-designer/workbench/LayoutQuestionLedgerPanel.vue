<script setup lang="ts">
import type { ColumnsType } from 'ant-design-vue/es/table'
import type { ExamLayoutDocument, ExamLayoutQuestionDto } from '@/apis/mark/exam-layout-design'
import type { MarkOcrSceneCode } from '@/apis/mark/ocr-scene'
import { computed, ref } from 'vue'
import { MARK_OCR_SCENE_LABEL } from '@/apis/mark/ocr-scene'
import { QuestionTypeDescription } from '@/apis/mark/question-type'
import LayoutQuestionPropertyPanel from '@/components/mark/layout-designer/LayoutQuestionPropertyPanel.vue'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import { isLayoutQuestionRoiReady } from '@/utils/exam-layout-designer'
import { ROI_NOT_CONFIGURED_LABEL } from '@/utils/format-exam-layout-question-summary'

const props = defineProps<{
  document: ExamLayoutDocument | null
  focusedQuestionId: string | null
  readonly?: boolean
}>()

const emit = defineEmits<{
  "patch": [document: ExamLayoutDocument]
  'focus-question': [question: ExamLayoutQuestionDto | null]
  'locate-roi': [question: ExamLayoutQuestionDto]
}>()

interface QuestionRow {
  key: string
  question: ExamLayoutQuestionDto
  questionNo: string
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
      ocrSceneLabel: question.ocrScene ? MARK_OCR_SCENE_LABEL[question.ocrScene as MarkOcrSceneCode] : '',
      questionTypeLabel: QuestionTypeDescription[question.questionType],
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
  { title: '题号', dataIndex: 'questionNo', width: 72, align: 'center' },
  { title: 'OCR 场景', dataIndex: 'ocrSceneLabel', width: 108 },
  { title: '题型', dataIndex: 'questionTypeLabel', width: 72, align: 'center' },
  { title: '满分', dataIndex: 'fullScore', width: 72, align: 'right' },
  { title: 'ROI', key: 'roi', width: 88, align: 'center' },
  { title: '答案', key: 'answer', width: 88, align: 'center' },
  { title: '操作', key: 'actions', width: 96, align: 'center' },
]

const selectedQuestion = computed(() =>
  rows.value.find((row) => row.key === props.focusedQuestionId)?.question ?? null,
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
      <UiEmpty v-if="rows.length === 0" description="请先完成资料入口：整卷识别或生成答题卡" />
      <UiDataTable
        v-else
        :columns="columns"
        :data-source="rows"
        :pagination="false"
        :scroll="{ y: tableScrollY }"
        size="small"
        row-key="key"
        :custom-row="(record) => ({
          onClick: () => handleRowClick(record as QuestionRow),
          class: focusedQuestionId === (record as QuestionRow).key ? 'layout-question-ledger__row--active' : '',
        })"
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
              :disabled="readonly"
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
      @patch="emit('patch', $event)"
    />
  </section>
</template>

<style scoped lang="scss">
.layout-question-ledger {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 320px;
  gap: 12px;
  min-height: 420px;

  &__header {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    margin-bottom: 8px;
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

  &__detail {
    min-height: 0;
  }

  :deep(.layout-question-ledger__row--active td) {
    background: rgba(22, 119, 255, 0.06);
  }

  @media (max-width: 1100px) {
    grid-template-columns: 1fr;
  }
}
</style>
