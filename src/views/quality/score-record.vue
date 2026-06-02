<script setup lang="ts">
import type { SelectValue } from 'ant-design-vue/es/select'
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
  RubricItemVO,
  ScoreBatchStatus,
  ScoreBatchVO,
  ScoreRecordRubricScoreRequest,
  ScoreRecordSaveRequest,
  ScoreRecordVO,
} from '@/apis/quality'
import type { UserDto } from '@/types/api-types.d'
import type { SignalMetric } from '@/types/workbench'
import { message } from 'ant-design-vue'
import { computed, onMounted, ref, watch } from 'vue'
import {
  assessmentItemApi,
  rubricItemApi,
  SCORE_BATCH_STATUS_COLOR,
  SCORE_BATCH_STATUS_LABEL,
  scoreBatchApi,
  scoreRecordApi,
} from '@/apis/quality'
import {
  ClassSelector,
  CourseSelector,
  StudentSelector,
  TrainingPlanSelector,
} from '@/components/quality/selectors'
import { UiButton, UiDataTable, UiDrawer, UiEmpty } from '@/components/ui-guide/ui'
import { SignalBand, StageWorkbenchShell } from '@/components/workbench'
import { confirmAsync } from '@/composables/useConfirmDialog'
import { useQualityStore } from '@/stores/modules/quality'
import { getUserProcessFailureMessage, showUserError } from '@/utils/error-handler'
import { strictEnumLabel, strictEnumTone } from '@/utils/strict-enum'

const batchColumns: ColumnsType = [
  { title: '编码', dataIndex: 'batchCode', key: 'batchCode', width: 120 },
  { title: '名称', dataIndex: 'batchName', key: 'batchName' },
  { title: '状态', dataIndex: 'status', key: 'status', width: 110 },
]

const recordColumns: ColumnsType = [
  { title: '学号', dataIndex: 'studentNumber', key: 'studentNumber', width: 120 },
  { title: '姓名', dataIndex: 'studentName', key: 'studentName', width: 100 },
  { title: '考核环节', key: 'assessmentItemRef' },
  { title: '得分 / 满分', key: 'score', width: 140 },
  { title: '状态', key: 'recordStatus', width: 140 },
  { title: '操作', key: 'actions', width: 180, fixed: 'right' },
]

const validByItemColumns: ColumnsType = [
  { title: '成绩批次', key: 'batchRef', width: 180 },
  { title: '学号', dataIndex: 'studentNumber', key: 'studentNumber', width: 120 },
  { title: '姓名', dataIndex: 'studentName', key: 'studentName', width: 100 },
  { title: '得分 / 满分', key: 'score', width: 140 },
]

function batchStatusLabel(value: ScoreBatchStatus): string {
  return strictEnumLabel(SCORE_BATCH_STATUS_LABEL, value, '成绩批次状态')
}

function batchStatusColor(value: ScoreBatchStatus): string {
  return strictEnumTone(SCORE_BATCH_STATUS_COLOR, value, '成绩批次状态')
}

function scoreRecordInvalidReason(record: ScoreRecordVO): string {
  return getUserProcessFailureMessage(
    record.invalidReason,
    '该成绩明细未通过校验，请检查学生、考核环节和分值',
  )
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
    batches.value = page.list
  } finally {
    batchesLoading.value = false
  }
}

/* ========== 明细列表 ========== */

const records = ref<ScoreRecordVO[]>([])
const recordsLoading = ref(false)
const validFilter = ref<boolean | undefined>(undefined)
const assessmentItems = ref<AssessmentItemVO[]>([])

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
    records.value = await scoreRecordApi.listByBatch(selectedBatch.value.id)
  } finally {
    recordsLoading.value = false
  }
}

async function loadAssessmentItems() {
  if (!qualityStore.currentQualityCourseId) {
    assessmentItems.value = []
    return
  }
  assessmentItems.value = await assessmentItemApi.listByCourse(qualityStore.currentQualityCourseId)
}

/* ========== 信号指标带（SignalBand） ========== */

const signals = computed<SignalMetric[]>(() => {
  const list = filteredRecords.value
  const valid = list.filter((r) => r.validFlag).length
  const invalid = list.length - valid
  const errored = list.filter((r) => r.errorCodes && r.errorCodes.length > 0).length
  const totalScore = list.reduce((sum, r) => {
    if (!Number.isFinite(r.score)) return sum
    return sum + r.score
  }, 0)
  const totalFull = list.reduce((sum, r) => {
    if (!Number.isFinite(r.fullScore)) return sum
    return sum + r.fullScore
  }, 0)
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
const editorRubrics = ref<RubricItemVO[]>([])
const editorRubricsLoading = ref(false)
const editorRubricScores = ref<ScoreRecordRubricScoreRequest[]>([])
const editor = ref<ScoreRecordSaveRequest>({
  batchId: '',
  assessmentItemId: '',
  qualityCourseId: '',
  studentUserId: '',
  studentNumber: '',
  studentName: '',
  classId: '',
  score: 0,
  fullScore: 100,
  validFlag: true,
  invalidReason: '',
  errorCodes: '',
})

const editorRubricTotal = computed(() =>
  editorRubricScores.value.reduce((sum, item) => {
    if (!Number.isFinite(item.score)) return sum
    return sum + item.score
  }, 0),
)

async function loadEditorRubrics(assessmentItemId: string, record?: ScoreRecordVO): Promise<void> {
  if (!assessmentItemId) {
    editorRubrics.value = []
    editorRubricScores.value = []
    return
  }
  editorRubricsLoading.value = true
  try {
    const rubrics = await rubricItemApi.listByItem(assessmentItemId)
    const existingScores = new Map<string, number>()
    for (const item of record?.rubricScores ?? []) {
      if (!Number.isFinite(item.score)) continue
      existingScores.set(item.rubricItemId, item.score)
    }
    editorRubrics.value = rubrics
    editorRubricScores.value = rubrics.map((rubric) => ({
      rubricItemId: rubric.id,
      score: existingScores.get(rubric.id) ?? 0,
    }))
  } finally {
    editorRubricsLoading.value = false
  }
}

async function handleEditorAssessmentChange(value: SelectValue): Promise<void> {
  if (typeof value !== 'string') {
    showUserError(null, '考核环节选择无效，请重新选择')
    return
  }
  const selected = assessmentItems.value.find((item) => item.id === value)
  if (!selected) {
    showUserError(null, '所选考核环节不存在，请重新选择')
    return
  }
  editor.value.fullScore = selected.fullScore
  await loadEditorRubrics(value)
}

function handleEditorClassChange(value: string | null): void {
  editor.value.classId = value ?? ''
  editor.value.studentUserId = ''
  editor.value.studentNumber = ''
  editor.value.studentName = ''
}

function handleEditorStudentChange(value: string | null, option?: UserDto): void {
  editor.value.studentUserId = value ?? ''
  editor.value.studentNumber = option?.studentNumber ?? ''
  editor.value.studentName = option?.nickName ?? ''
}

async function openCreate() {
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
    score: 0,
    fullScore: 100,
    validFlag: true,
    invalidReason: '',
    errorCodes: '',
  }
  editorRubrics.value = []
  editorRubricScores.value = []
  if (selectedBatch.value.assessmentItemId) {
    editor.value.assessmentItemId = selectedBatch.value.assessmentItemId
    const selected = assessmentItems.value.find(
      (item) => item.id === selectedBatch.value?.assessmentItemId,
    )
    if (selected) {
      editor.value.fullScore = selected.fullScore
    }
    await loadEditorRubrics(selectedBatch.value.assessmentItemId)
  }
  editorVisible.value = true
}

async function openEdit(record: ScoreRecordVO) {
  editorMode.value = 'edit'
  editor.value = { ...record }
  await loadEditorRubrics(record.assessmentItemId, record)
  editorVisible.value = true
}

async function submitEditor() {
  const v = editor.value
  if (!v.assessmentItemId || v.score == null || v.fullScore == null) {
    message.error('请填写考核环节、得分、满分')
    return
  }
  editorSubmitting.value = true
  try {
    const request: ScoreRecordSaveRequest = {
      id: v.id,
      batchId: v.batchId,
      assessmentItemId: v.assessmentItemId,
      qualityCourseId: v.qualityCourseId,
      studentUserId: v.studentUserId,
      studentNumber: v.studentNumber,
      studentName: v.studentName,
      classId: v.classId,
      score: v.score,
      fullScore: v.fullScore,
      validFlag: v.validFlag,
      invalidReason: v.invalidReason,
      rubricScores: editorRubricScores.value,
      errorCodes: '',
    }
    if (editorMode.value === 'create') await scoreRecordApi.create(request)
    else await scoreRecordApi.update(request)
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
    content: `学号 ${record.studentNumber} 姓名 ${record.studentName}`,
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
    const page = await scoreRecordApi.listValidByItem({
      assessmentItemId: validByItemId.value,
      qualityCourseId: qualityStore.currentQualityCourseId,
      pageNum: 1,
      pageSize: 500,
    })
    validByItemRecords.value = page.list
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
      qualityStore.setTrainingPlan(qualityStore.trainingPlanOptions[0].id)
    }
  }
  if (qualityStore.currentQualityCourseId) {
    await Promise.all([loadBatches(), loadAssessmentItems()])
  }
})

function handlePlanChange(planId: string | null) {
  qualityStore.setTrainingPlan(planId || '')
}

function handleCourseChange(courseId: string | null) {
  qualityStore.setQualityCourse(courseId || '')
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
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'status'">
                <a-tag :color="batchStatusColor(record.status)">
                  {{ batchStatusLabel(record.status) }}
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
              <template #bodyCell="{ column, record }">
                <template v-if="column.key === 'studentNumber'">
                  {{ record.studentNumber }}
                </template>
                <template v-else-if="column.key === 'studentName'">
                  {{ record.studentName }}
                </template>
                <template v-else-if="column.key === 'assessmentItemRef'">
                  <span class="score-record__item-code">
                    {{ record.assessmentItemCode }}
                  </span>
                  {{ record.assessmentItemName }}
                </template>
                <template v-else-if="column.key === 'score'">
                  {{ record.score.toFixed(1) }} /
                  {{ record.fullScore.toFixed(0) }}
                </template>
                <template v-else-if="column.key === 'recordStatus'">
                  <a-space size="small">
                    <a-tag :color="record.validFlag ? 'green' : 'red'">
                      {{ record.validFlag ? '有效' : '无效' }}
                    </a-tag>
                    <a-tooltip v-if="record.errorCodes" :title="scoreRecordInvalidReason(record)">
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
          <a-select
            v-model:value="editor.assessmentItemId"
            placeholder="选择考核环节"
            @change="handleEditorAssessmentChange"
          >
            <a-select-option v-for="a in assessmentItems" :key="a.id" :value="a.id">
              <span class="score-record__item-code">{{ a.itemCode }}</span>
              {{ a.itemName }}（满分 {{ a.fullScore }}）
            </a-select-option>
          </a-select>
        </a-form-item>
        <a-row :gutter="12">
          <a-col :span="8">
            <a-form-item label="所属班级">
              <ClassSelector
                :value="editor.classId || null"
                placeholder="选择班级"
                @change="handleEditorClassChange"
              />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="学生" required>
              <StudentSelector
                :value="editor.studentUserId || null"
                :class-id="editor.classId || null"
                placeholder="选择学生"
                @change="handleEditorStudentChange"
              />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="学生信息">
              <div class="score-record__student-info">
                <span>{{ editor.studentName || '未选择学生' }}</span>
                <span v-if="editor.studentNumber" class="score-record__student-number">
                  {{ editor.studentNumber }}
                </span>
              </div>
            </a-form-item>
          </a-col>
        </a-row>
        <a-row :gutter="12">
          <a-col :span="8">
            <a-form-item label="得分" required>
              <a-input-number v-model:value="editor.score" :min="0" style="width: 100%" />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="满分" required>
              <a-input-number v-model:value="editor.fullScore" :min="0" style="width: 100%" />
            </a-form-item>
          </a-col>
        </a-row>
        <a-form-item label="评分项拆分">
          <a-spin :spinning="editorRubricsLoading">
            <div v-if="editorRubrics.length" class="score-record__rubrics">
              <div class="score-record__rubrics-head">
                <span>评分项</span>
                <strong>合计 {{ editorRubricTotal.toFixed(1) }}</strong>
              </div>
              <div
                v-for="(rubric, index) in editorRubrics"
                :key="rubric.id"
                class="score-record__rubric-row"
              >
                <div class="score-record__rubric-main">
                  <span v-if="rubric.rubricCode" class="score-record__item-code">
                    {{ rubric.rubricCode }}
                  </span>
                  <span class="score-record__rubric-name">{{ rubric.rubricName }}</span>
                  <span class="score-record__rubric-full">满分 {{ rubric.fullScore }}</span>
                </div>
                <a-input-number
                  v-model:value="editorRubricScores[index].score"
                  :min="0"
                  :max="rubric.fullScore"
                  :precision="2"
                  class="score-record__rubric-score"
                />
              </div>
            </div>
            <UiEmpty
              v-else
              description="当前考核环节尚未配置评分项，可直接维护总分"
              class="score-record__rubric-empty"
            />
          </a-spin>
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
          <template v-if="column.key === 'batchRef'">
            <span class="score-record__item-code">{{ record.batchCode }}</span>
            {{ record.batchName }}
          </template>
          <template v-else-if="column.key === 'score'">
            {{ record.score.toFixed(1) }} /
            {{ record.fullScore.toFixed(0) }}
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
    margin-right: 4px;
  }

  &__student-info {
    min-height: 32px;
    display: flex;
    align-items: center;
    gap: 8px;
    color: var(--dp-text-primary, #0f172a);
  }

  &__student-number {
    color: var(--dp-text-muted, #64748b);
    font-size: 12px;
  }

  &__rubrics {
    display: grid;
    gap: 8px;
    padding: 10px;
    border: 1px solid var(--dp-border, #e2e8f0);
    border-radius: 8px;
    background: var(--dp-surface-elevated, #f8fafc);
  }

  &__rubrics-head {
    display: flex;
    justify-content: space-between;
    align-items: center;
    color: var(--dp-text-secondary, #475569);
    font-size: 13px;
  }

  &__rubric-row {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 140px;
    align-items: center;
    gap: 12px;
    min-height: 42px;
    padding: 8px 10px;
    border: 1px solid var(--dp-border, #e2e8f0);
    border-radius: 6px;
    background: var(--dp-surface, #fff);
  }

  &__rubric-main {
    min-width: 0;
    display: flex;
    align-items: center;
    gap: 6px;
    flex-wrap: wrap;
  }

  &__rubric-name {
    color: var(--dp-text-primary, #0f172a);
    font-weight: 500;
  }

  &__rubric-full {
    color: var(--dp-text-muted, #64748b);
    font-size: 12px;
  }

  &__rubric-score {
    width: 100%;
  }

  &__rubric-empty {
    margin: 0;
    padding: 12px 0;
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
