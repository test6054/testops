<script setup lang="ts">
import type { ColumnsType } from 'ant-design-vue/es/table'
/**
 * 质量评价 - 成绩明细管理
 *
 * 后端契约：
 * - /api/quality/score-records: list-by-batch / list-valid-by-item / detail / create / batch-create / update / delete
 * - /api/quality/score-batches: page（按 qualityCourseId 拉批次列表）
 */
import type {
  AssessmentItemVO,
  ScoreBatchVO,
  ScoreRecordSavePayload,
  ScoreRecordVO,
} from '@/apis/quality'
import {
  assessmentItemApi,
  isScoreBatchStatus,
  SCORE_BATCH_STATUS_COLOR,
  SCORE_BATCH_STATUS_LABEL,
  scoreBatchApi,
  scoreRecordApi,
} from '@/apis/quality'
import type { SignalMetric } from '@/types/workbench'
import { message } from 'ant-design-vue'
import { computed, onMounted, ref, watch } from 'vue'
import {
  CourseSelector,
  StudentSelector,
  TrainingPlanSelector,
} from '@/components/quality/selectors'
import { UiButton, UiDataTable, UiDrawer, UiEmpty } from '@/components/ui-guide/ui'
import { SignalBand, StageWorkbenchShell } from '@/components/workbench'
import { confirmAsync } from '@/composables/useConfirmDialog'
import { useQualityStore } from '@/stores/modules/quality'

const batchColumns: ColumnsType = [
  { title: '编码', dataIndex: 'batchCode', key: 'batchCode', width: 120 },
  { title: '名称', dataIndex: 'batchName', key: 'batchName' },
  { title: '状态', dataIndex: 'status', key: 'status', width: 110 },
]

const recordColumns: ColumnsType = [
  { title: '学号', dataIndex: 'studentNumber', key: 'studentNumber', width: 120 },
  { title: '姓名', dataIndex: 'studentName', key: 'studentName', width: 100 },
  { title: '考核环节', dataIndex: 'assessmentItemId', key: 'assessmentItemId' },
  { title: '得分 / 满分', key: 'score', width: 140 },
  { title: '状态', key: 'recordStatus', width: 140 },
  { title: '操作', key: 'actions', width: 180, fixed: 'right' },
]

const validByItemColumns: ColumnsType = [
  { title: '批次 ID', dataIndex: 'batchId', key: 'batchId', width: 140 },
  { title: '学号', dataIndex: 'studentNumber', key: 'studentNumber', width: 120 },
  { title: '姓名', dataIndex: 'studentName', key: 'studentName', width: 100 },
  { title: '得分 / 满分', key: 'score', width: 140 },
]

/* ========== 状态守卫 helper：禁止 as 类型断言 ========== */
function batchStatusLabel(value: unknown): string {
  if (isScoreBatchStatus(value)) return SCORE_BATCH_STATUS_LABEL[value]
  return typeof value === 'string' && value ? value : '-'
}

function batchStatusColor(value: unknown): string {
  if (isScoreBatchStatus(value)) return SCORE_BATCH_STATUS_COLOR[value]
  return 'default'
}

const qualityStore = useQualityStore()

/* ========== 成绩批次选择 ========== */

const batches = ref<ScoreBatchVO[]>([])
const batchesLoading = ref(false)
const selectedBatch = ref<ScoreBatchVO | null>(null)

function selectBatch(batch: ScoreBatchVO) {
  selectedBatch.value = batch
}

async function loadBatches() {
  if (!qualityStore.currentQualityCourseId) {
    batches.value = []
    return
  }
  batchesLoading.value = true
  try {
    const page = await scoreBatchApi.page({
      pageNum: 1,
      pageSize: 100,
      qualityCourseId: qualityStore.currentQualityCourseId,
    })
    batches.value = page.list || []
  } finally {
    batchesLoading.value = false
  }
}

/* ========== 明细列表 ========== */

const records = ref<ScoreRecordVO[]>([])
const recordsLoading = ref(false)
const validFilter = ref<boolean | undefined>(undefined)
const assessmentItems = ref<AssessmentItemVO[]>([])

const assessmentItemMap = computed(() => new Map(assessmentItems.value.map((a) => [a.id, a])))
const validFilterSelect = computed({
  get(): string | undefined {
    return validFilter.value === undefined ? undefined : String(validFilter.value)
  },
  set(v: string | undefined): void {
    validFilter.value = v === undefined ? undefined : v === 'true'
  },
})

const filteredRecords = computed(() => {
  if (validFilter.value === undefined) return records.value
  return records.value.filter((r) => Boolean(r.validFlag) === validFilter.value)
})

async function loadRecords() {
  if (!selectedBatch.value) {
    records.value = []
    return
  }
  recordsLoading.value = true
  try {
    records.value = (await scoreRecordApi.listByBatch(selectedBatch.value.id)) || []
  } finally {
    recordsLoading.value = false
  }
}

async function loadAssessmentItems() {
  if (!qualityStore.currentQualityCourseId) {
    assessmentItems.value = []
    return
  }
  assessmentItems.value =
    (await assessmentItemApi.listByCourse(qualityStore.currentQualityCourseId)) || []
}

/* ========== 信号指标带（SignalBand） ========== */

const signals = computed<SignalMetric[]>(() => {
  const list = filteredRecords.value
  const valid = list.filter((r) => r.validFlag).length
  const invalid = list.length - valid
  const errored = list.filter((r) => r.errorCodes && r.errorCodes.length > 0).length
  const totalScore = list.reduce((sum, r) => sum + Number(r.rawScore || 0), 0)
  const totalFull = list.reduce((sum, r) => sum + Number(r.fullScore || 0), 0)
  const ratio = totalFull > 0 ? Math.round((totalScore / totalFull) * 100) : 0
  return [
    { key: 'total', label: '当前明细', value: list.length, tone: 'blue' },
    { key: 'valid', label: '有效', value: valid, tone: 'green' },
    { key: 'invalid', label: '无效', value: invalid, tone: invalid > 0 ? 'orange' : 'gray' },
    { key: 'errored', label: '异常', value: errored, tone: errored > 0 ? 'red' : 'gray' },
    { key: 'ratio', label: '平均得分率', value: `${ratio}%`, tone: 'blue' },
    { key: 'batches', label: '批次总数', value: batches.value.length, tone: 'gray' },
  ]
})

/* ========== 明细编辑 ========== */

const editorVisible = ref(false)
const editorMode = ref<'create' | 'edit'>('create')
const editorSubmitting = ref(false)
const editor = ref<ScoreRecordSavePayload>({
  batchId: '',
  assessmentItemId: '',
  qualityCourseId: '',
  studentUserId: '',
  studentNumber: '',
  studentName: '',
  classId: '',
  rawScore: 0,
  fullScore: 100,
  rubricBreakdown: '',
  validFlag: true,
  invalidReason: '',
  errorCodes: '',
})

function openCreate() {
  if (!selectedBatch.value) return
  editorMode.value = 'create'
  editor.value = {
    batchId: selectedBatch.value.id,
    assessmentItemId: '',
    qualityCourseId: qualityStore.currentQualityCourseId,
    studentUserId: '',
    studentNumber: '',
    studentName: '',
    classId: '',
    rawScore: 0,
    fullScore: 100,
    rubricBreakdown: '',
    validFlag: true,
    invalidReason: '',
    errorCodes: '',
  }
  editorVisible.value = true
}

function openEdit(record: ScoreRecordVO) {
  editorMode.value = 'edit'
  editor.value = { ...record }
  editorVisible.value = true
}

async function submitEditor() {
  const v = editor.value
  if (!v.assessmentItemId || v.rawScore == null || v.fullScore == null) {
    message.error('请填写考核环节、原始分、满分')
    return
  }
  editorSubmitting.value = true
  try {
    if (editorMode.value === 'create') await scoreRecordApi.create(v)
    else await scoreRecordApi.update(v)
    message.success('已保存')
    editorVisible.value = false
    await loadRecords()
  } finally {
    editorSubmitting.value = false
  }
}

async function handleDelete(record: ScoreRecordVO) {
  void confirmAsync({
    title: `删除该明细？`,
    content: `学号 ${record.studentNumber || '-'} 姓名 ${record.studentName || '-'}`,
    type: 'error',
    onOk: async () => {
      await scoreRecordApi.delete(record.id)
      message.success('已删除')
      await loadRecords()
    },
  })
}

/* ========== 按考核环节查已确认的有效明细 ========== */

const validByItemVisible = ref(false)
const validByItemLoading = ref(false)
const validByItemId = ref<string>('')
const validByItemRecords = ref<ScoreRecordVO[]>([])

function openValidByItem() {
  if (!qualityStore.currentQualityCourseId) return
  validByItemId.value = ''
  validByItemRecords.value = []
  validByItemVisible.value = true
}

async function queryValidByItem() {
  if (!validByItemId.value) {
    message.warning('请选择考核环节')
    return
  }
  validByItemLoading.value = true
  try {
    validByItemRecords.value =
      (await scoreRecordApi.listValidByItem(
        validByItemId.value,
        qualityStore.currentQualityCourseId,
      )) || []
  } finally {
    validByItemLoading.value = false
  }
}

/* ========== 上下文联动 ========== */

watch(
  () => qualityStore.currentQualityCourseId,
  async () => {
    selectedBatch.value = null
    records.value = []
    await Promise.all([loadBatches(), loadAssessmentItems()])
  },
)

watch(
  () => qualityStore.currentTrainingPlanId,
  () => {
    selectedBatch.value = null
    batches.value = []
    records.value = []
    assessmentItems.value = []
  },
)

watch(selectedBatch, () => loadRecords())

onMounted(async () => {
  if (!qualityStore.currentTrainingPlanId) {
    await qualityStore.loadTrainingPlanOptions()
    if (qualityStore.trainingPlanOptions.length) {
      qualityStore.setCurrent({ trainingPlanId: qualityStore.trainingPlanOptions[0].id })
    }
  }
  if (qualityStore.currentQualityCourseId) {
    await Promise.all([loadBatches(), loadAssessmentItems()])
  }
})

function handlePlanChange(planId: string | null) {
  qualityStore.setCurrent({ trainingPlanId: planId || '', qualityCourseId: '' })
}

function handleCourseChange(courseId: string | null) {
  qualityStore.setCurrent({ qualityCourseId: courseId || '' })
}
</script>

<template>
  <StageWorkbenchShell>
    <template #context>
      <div class="score-record__context">
        <div class="score-record__context-group">
          <span class="score-record__context-label">培养方案</span>
          <TrainingPlanSelector
            :value="qualityStore.currentTrainingPlanId || null"
            :width="280"
            @change="handlePlanChange"
          />
        </div>
        <div class="score-record__context-group">
          <span class="score-record__context-label">质量评价课程</span>
          <CourseSelector
            :value="qualityStore.currentQualityCourseId || null"
            :training-plan-id="qualityStore.currentTrainingPlanId || null"
            :width="320"
            @change="handleCourseChange"
          />
        </div>
      </div>
    </template>

    <UiEmpty
      v-if="!qualityStore.currentTrainingPlanId"
      description="请先选择培养方案，再维护其下的成绩明细"
      class="score-record__empty"
    />

    <UiEmpty
      v-else-if="!qualityStore.currentQualityCourseId"
      description="请先选择质量评价课程，再查看 / 维护其下成绩批次的明细"
      class="score-record__empty"
    />

    <template v-else>
      <SignalBand :metrics="signals" compact class="score-record__signals" />

      <div class="score-record__layout">
        <section class="score-record__panel score-record__panel--batches">
          <header class="score-record__panel-header">
            <h3 class="score-record__panel-title">成绩批次</h3>
            <span class="score-record__panel-meta">{{ batches.length }} 批</span>
          </header>
          <UiDataTable
            class="score-record__batches-table"
            :columns="batchColumns"
            :data-source="batches"
            :loading="batchesLoading"
            row-key="id"
            size="middle"
            :show-pagination="false"
            flat
            :total="batches.length"
            :row-class-name="(r: ScoreBatchVO) => (selectedBatch?.id === r.id ? 'is-selected' : '')"
            :custom-row="
              (record: ScoreBatchVO) => ({
                onClick: () => selectBatch(record),
              })
            "
          >
            <template #bodyCell="{ column, text }">
              <template v-if="column.key === 'status'">
                <a-tag :color="batchStatusColor(text)">
                  {{ batchStatusLabel(text) }}
                </a-tag>
              </template>
            </template>
          </UiDataTable>
        </section>

        <section class="score-record__panel score-record__panel--detail">
          <UiEmpty
            v-if="!selectedBatch"
            description="请在左侧选择成绩批次后查看其明细数据"
            class="score-record__empty"
          />
          <template v-else>
            <header class="score-record__detail-header">
              <div>
                <h3 class="score-record__panel-title">「{{ selectedBatch.batchName }}」明细</h3>
                <div class="score-record__detail-meta">
                  状态
                  <a-tag :color="batchStatusColor(selectedBatch.status)">
                    {{ batchStatusLabel(selectedBatch.status) }}
                  </a-tag>
                  · 编码 {{ selectedBatch.batchCode }}
                </div>
              </div>
              <div class="score-record__detail-actions">
                <a-select
                  v-model:value="validFilterSelect"
                  placeholder="有效性筛选"
                  allow-clear
                  class="score-record__valid-select"
                >
                  <a-select-option value="true"> 仅有效 </a-select-option>
                  <a-select-option value="false"> 仅无效 </a-select-option>
                </a-select>
                <UiButton variant="ghost" size="sm" @click="openValidByItem">
                  按考核环节查有效
                </UiButton>
                <router-link :to="{ name: 'QualityScoreBatch' }" class="score-record__import-link">
                  <UiButton variant="outline" size="sm"> 批量导入（Excel） </UiButton>
                </router-link>
                <UiButton variant="primary" size="sm" @click="openCreate"> 新增明细 </UiButton>
              </div>
            </header>

            <UiDataTable
              class="score-record__records-table"
              :columns="recordColumns"
              :data-source="filteredRecords"
              :loading="recordsLoading"
              row-key="id"
              size="middle"
              :page-size="20"
              :total="filteredRecords.length"
              flat
            >
              <template #bodyCell="{ column, record, text }">
                <template v-if="column.key === 'studentNumber' || column.key === 'studentName'">
                  {{ text || '-' }}
                </template>
                <template v-else-if="column.key === 'assessmentItemId'">
                  <span class="score-record__item-code">
                    {{ assessmentItemMap.get(text)?.itemCode || '-' }}
                  </span>
                  {{ assessmentItemMap.get(text)?.itemName || text }}
                </template>
                <template v-else-if="column.key === 'score'">
                  {{ Number(record.rawScore).toFixed(1) }} /
                  {{ Number(record.fullScore).toFixed(0) }}
                </template>
                <template v-else-if="column.key === 'recordStatus'">
                  <a-space size="small">
                    <a-tag :color="record.validFlag ? 'green' : 'red'">
                      {{ record.validFlag ? '有效' : '无效' }}
                    </a-tag>
                    <a-tooltip v-if="record.errorCodes" :title="record.errorCodes">
                      <a-tag color="orange"> 异常 </a-tag>
                    </a-tooltip>
                  </a-space>
                </template>
                <template v-else-if="column.key === 'actions'">
                  <a-space>
                    <UiButton variant="ghost" size="sm" @click="openEdit(record)"> 编辑 </UiButton>
                    <UiButton
                      variant="ghost"
                      status="danger"
                      size="sm"
                      @click="handleDelete(record)"
                    >
                      删除
                    </UiButton>
                  </a-space>
                </template>
              </template>
            </UiDataTable>
          </template>
        </section>
      </div>
    </template>

    <UiDrawer
      v-model:open="editorVisible"
      :title="editorMode === 'create' ? '新增成绩明细' : '编辑成绩明细'"
      :width="720"
      :confirm-loading="editorSubmitting"
      :hide-footer="false"
      ok-text="保存"
      @ok="submitEditor"
    >
      <a-form layout="vertical" :model="editor">
        <a-form-item label="考核环节" required>
          <a-select v-model:value="editor.assessmentItemId" placeholder="选择考核环节">
            <a-select-option v-for="a in assessmentItems" :key="a.id" :value="a.id">
              <span class="score-record__item-code">{{ a.itemCode }}</span>
              {{ a.itemName }}（满分 {{ a.fullScore }}）
            </a-select-option>
          </a-select>
        </a-form-item>
        <a-row :gutter="12">
          <a-col :span="8">
            <a-form-item label="学号">
              <a-input v-model:value="editor.studentNumber" />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="姓名">
              <a-input v-model:value="editor.studentName" />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="学生">
              <StudentSelector
                :value="editor.studentUserId || null"
                placeholder="选择学生"
                @change="(v) => (editor.studentUserId = v ?? '')"
              />
            </a-form-item>
          </a-col>
        </a-row>
        <a-row :gutter="12">
          <a-col :span="8">
            <a-form-item label="原始分" required>
              <a-input-number v-model:value="editor.rawScore" :min="0" style="width: 100%" />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="满分" required>
              <a-input-number v-model:value="editor.fullScore" :min="0" style="width: 100%" />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="班级 ID">
              <a-input v-model:value="editor.classId" />
            </a-form-item>
          </a-col>
        </a-row>
        <a-form-item label="Rubric 拆分（JSON）">
          <a-textarea
            v-model:value="editor.rubricBreakdown"
            :rows="3"
            placeholder='{"rubricItemId": score, ...}'
            class="score-record__mono"
          />
        </a-form-item>
        <a-row :gutter="12">
          <a-col :span="8">
            <a-form-item label="是否有效">
              <a-switch v-model:checked="editor.validFlag" />
            </a-form-item>
          </a-col>
          <a-col :span="16">
            <a-form-item label="无效原因">
              <a-input v-model:value="editor.invalidReason" :disabled="editor.validFlag" />
            </a-form-item>
          </a-col>
        </a-row>
        <a-form-item label="异常码（逗号分隔）">
          <a-input v-model:value="editor.errorCodes" placeholder="如 SCORE_OVERFLOW, DUP_STUDENT" />
        </a-form-item>
      </a-form>
    </UiDrawer>

    <UiDrawer
      v-model:open="validByItemVisible"
      title="按考核环节查有效明细"
      :width="780"
      :hide-footer="true"
    >
      <div class="score-record__valid-search">
        <span class="score-record__context-label">考核环节</span>
        <a-select
          v-model:value="validByItemId"
          placeholder="选择考核环节"
          class="score-record__valid-select-wide"
          show-search
          option-filter-prop="label"
        >
          <a-select-option
            v-for="a in assessmentItems"
            :key="a.id"
            :value="a.id"
            :label="`${a.itemCode} ${a.itemName}`"
          >
            <span class="score-record__item-code">{{ a.itemCode }}</span>
            {{ a.itemName }}
          </a-select-option>
        </a-select>
        <UiButton
          variant="primary"
          size="sm"
          :loading="validByItemLoading"
          @click="queryValidByItem"
        >
          查询
        </UiButton>
      </div>
      <UiDataTable
        :columns="validByItemColumns"
        :data-source="validByItemRecords"
        :loading="validByItemLoading"
        row-key="id"
        size="small"
        :page-size="20"
        :total="validByItemRecords.length"
        flat
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'score'">
            {{ Number(record.rawScore).toFixed(1) }} / {{ Number(record.fullScore).toFixed(0) }}
          </template>
        </template>
      </UiDataTable>
    </UiDrawer>
  </StageWorkbenchShell>
</template>

<style scoped lang="scss">
.score-record {
  &__context {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 24px;
  }

  &__context-group {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  &__context-label {
    color: var(--dp-text-secondary, #475569);
    font-size: 13px;
    font-weight: 500;
  }

  &__empty {
    margin-top: 32px;
  }

  &__signals {
    margin-bottom: 16px;
    padding: 16px 20px;
    background: var(--dp-surface-elevated, #f8fafc);
    border: 1px solid var(--dp-border, #e2e8f0);
    border-radius: 8px;
  }

  &__layout {
    display: grid;
    grid-template-columns: minmax(360px, 38%) 1fr;
    gap: 16px;
    align-items: stretch;
  }

  &__panel {
    background: var(--dp-surface, #fff);
    border: 1px solid var(--dp-border, #e2e8f0);
    border-radius: 8px;
    padding: 16px;
    min-height: 320px;
  }

  &__panel-header {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    margin-bottom: 12px;
  }

  &__panel-title {
    margin: 0;
    font-size: 16px;
    font-weight: 600;
    color: var(--dp-text-primary, #0f172a);
  }

  &__panel-meta {
    color: var(--dp-text-muted, #64748b);
    font-size: 12px;
  }

  &__batches-table {
    :deep(.ant-table-row) {
      cursor: pointer;
    }

    :deep(.is-selected) td {
      background-color: var(--ant-color-primary-bg, #e6f4ff) !important;
    }
  }

  &__detail-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 16px;
    margin-bottom: 12px;
    flex-wrap: wrap;
  }

  &__detail-meta {
    margin-top: 4px;
    color: var(--dp-text-muted, #64748b);
    font-size: 12px;
  }

  &__detail-actions {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }

  &__valid-select {
    width: 140px;
  }

  &__valid-select-wide {
    flex: 1;
    min-width: 320px;
  }

  &__valid-search {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 12px;
    flex-wrap: wrap;
  }

  &__item-code {
    color: var(--dp-text-muted, #64748b);
    font-size: 12px;
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    margin-right: 4px;
  }

  &__mono {
    :deep(textarea) {
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    }
  }

  &__import-link {
    text-decoration: none;
    color: inherit;
  }
}

@media (max-width: 1023px) {
  .score-record__layout {
    grid-template-columns: 1fr;
  }
}
</style>
