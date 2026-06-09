<script setup lang="ts">
import type { ColumnsType } from 'ant-design-vue/es/table'
/**
 * 质量评价 - 专业评价口径配置
 *
 * 后端：/api/quality/program-evaluation-profiles
 * 配置某专业采用的认证标准、评价方法、评价周期、样本范围、责任链与归档策略。
 */
import type {
  AccreditationStandardVO,
  AccreditationType,
  EvaluationCycle,
  EvaluationMethod,
  ProgramEvaluationProfileQueryRequest,
  ProgramEvaluationProfileSaveRequest,
  ProgramEvaluationProfileVO,
} from '@/apis/quality'
import type { SignalMetric } from '@/types/workbench'
import { message } from 'ant-design-vue'
import { computed, onMounted, reactive, ref } from 'vue'
import {
  ACCREDITATION_TYPE_LABEL,
  accreditationStandardApi,
  EVALUATION_CYCLE_LABEL,
  EVALUATION_METHOD_LABEL,
  programEvaluationProfileApi,
} from '@/apis/quality'
import { ProgramSelector } from '@/components/quality/selectors'
import { UiButton, UiDataTable, UiDrawer } from '@/components/ui-guide/ui'
import { SignalBand, StageWorkbenchShell } from '@/components/workbench'
import { confirmAsync } from '@/composables/useConfirmDialog'
import { readAllPages, readPageList, readPageTotal } from '@/utils/page-result'
import { strictEnumLabel } from '@/utils/strict-enum'

const ACCREDITATION_STANDARD_OPTION_PAGE_SIZE = 100

const columns: ColumnsType = [
  { title: '专业', dataIndex: 'programName', key: 'programName' },
  { title: '认证类型', dataIndex: 'accreditationType', key: 'accreditationType', width: 200 },
  { title: '级别', dataIndex: 'accreditationLevel', key: 'accreditationLevel', width: 100 },
  { title: '评价方法', dataIndex: 'evaluationMethod', key: 'evaluationMethod', width: 180 },
  { title: '评价周期', dataIndex: 'evaluationCycle', key: 'evaluationCycle', width: 120 },
  { title: '启用', dataIndex: 'enabled', key: 'enabled', width: 80 },
  { title: '操作', key: 'actions', width: 160, fixed: 'right' },
]

const list = ref<ProgramEvaluationProfileVO[]>([])
const total = ref(0)
const loading = ref(false)
const standards = ref<AccreditationStandardVO[]>([])

const query = reactive<ProgramEvaluationProfileQueryRequest>({
  pageNum: 1,
  pageSize: 10,
  accreditationType: undefined,
  enabled: undefined,
  keyword: '',
})

const accreditationTypes: AccreditationType[] = [
  'ENGINEERING_ACCREDITATION',
  'TEACHER_ACCREDITATION',
  'MEDICAL_HEALTH_ACCREDITATION',
  'ART_DESIGN_QUALITY_EVALUATION',
  'ECONOMICS_FINANCE_QUALITY_EVALUATION',
  'LAW_QUALITY_EVALUATION',
  'AGRICULTURE_ACCREDITATION',
  'GENERAL_QUALITY_EVALUATION',
]

const evaluationMethods: EvaluationMethod[] = [
  'DIRECT_ONLY',
  'DIRECT_INDIRECT_WEIGHTED',
  'MANUAL_REVIEW_CONFIRMED',
]

const accreditationOptions = accreditationTypes.map((value) => ({
  value,
  label: strictEnumLabel(ACCREDITATION_TYPE_LABEL, value, '认证类型'),
}))
const evaluationMethodOptions = evaluationMethods.map((value) => ({
  value,
  label: strictEnumLabel(EVALUATION_METHOD_LABEL, value, '评价方法'),
}))

const evaluationCycleOptions: Array<{ value: EvaluationCycle, label: string }> = [
  { value: 'SEMESTER', label: EVALUATION_CYCLE_LABEL.SEMESTER },
  { value: 'YEAR', label: EVALUATION_CYCLE_LABEL.YEAR },
  { value: 'BIENNIAL', label: EVALUATION_CYCLE_LABEL.BIENNIAL },
  { value: 'TRIENNIAL', label: EVALUATION_CYCLE_LABEL.TRIENNIAL },
  { value: 'PROGRAM_CYCLE', label: EVALUATION_CYCLE_LABEL.PROGRAM_CYCLE },
]

const editorVisible = ref(false)
const editorMode = ref<'create' | 'edit'>('create')
const editor = reactive<ProgramEvaluationProfileSaveRequest>({
  programId: '',
  schoolId: '',
  departmentId: '',
  accreditationType: 'ENGINEERING_ACCREDITATION',
  standardId: undefined,
  standardYear: '',
  accreditationLevel: '',
  evaluationMethod: 'DIRECT_INDIRECT_WEIGHTED',
  evaluationCycle: 'YEAR',
  includeGraduateSamples: true,
  includeEmployerSamples: true,
  includeAlumniSamples: true,
  includeCurrentStudentSamples: false,
  sampleScopeRemark: '',
  collegeReviewOwner: '',
  departmentReviewOwner: '',
  programReviewOwner: '',
  reviewChainRemark: '',
  archiveRetentionYears: 5,
  archiveLocation: '',
  archiveResponsibleUnit: '',
  archivePolicyRemark: '',
  enabled: true,
})
const submitting = ref(false)

async function loadList() {
  loading.value = true
  try {
    const page = await programEvaluationProfileApi.page({
      ...query,
      keyword: query.keyword?.trim() || undefined,
    })
    list.value = readPageList(page, '专业评价口径加载失败，请稍后重试')
    total.value = readPageTotal(page, '专业评价口径加载失败，请稍后重试')
  } finally {
    loading.value = false
  }
}

function accreditationLabel(value: AccreditationType): string {
  return strictEnumLabel(ACCREDITATION_TYPE_LABEL, value, '认证类型')
}

function evaluationMethodLabel(value: EvaluationMethod): string {
  return strictEnumLabel(EVALUATION_METHOD_LABEL, value, '评价方法')
}

function evaluationCycleLabel(value: EvaluationCycle): string {
  return strictEnumLabel(EVALUATION_CYCLE_LABEL, value, '评价周期')
}

const enabledCount = computed(() => list.value.filter((item) => item.enabled).length)
const disabledCount = computed(() => list.value.filter((item) => !item.enabled).length)

const signals = computed<SignalMetric[]>(() => {
  const engineering = list.value.filter(
    (item) => item.accreditationType === 'ENGINEERING_ACCREDITATION',
  ).length
  return [
    { key: 'overall', label: '总口径', value: total.value, tone: 'gray' },
    { key: 'page', label: '本页', value: list.value.length, tone: 'blue' },
    {
      key: 'enabled',
      label: '启用',
      value: enabledCount.value,
      tone: enabledCount.value > 0 ? 'green' : 'gray',
    },
    {
      key: 'disabled',
      label: '停用',
      value: disabledCount.value,
      tone: disabledCount.value > 0 ? 'orange' : 'gray',
    },
    {
      key: 'engineering',
      label: '工程认证',
      value: engineering,
      tone: engineering > 0 ? 'blue' : 'gray',
    },
  ]
})

async function loadDicts() {
  standards.value = await readAllPages(
    (pageNum) => accreditationStandardApi.page({
      pageNum,
      pageSize: ACCREDITATION_STANDARD_OPTION_PAGE_SIZE,
      enabled: true,
    }),
    '认证标准列表加载失败，请稍后重试',
  )
}

function handlePageChange(page: { current: number, pageSize: number }) {
  query.pageNum = page.current
  query.pageSize = page.pageSize
  loadList()
}

function resetQuery() {
  query.pageNum = 1
  query.accreditationType = undefined
  query.enabled = undefined
  query.keyword = ''
  loadList()
}

function openCreate() {
  editorMode.value = 'create'
  Object.assign(editor, {
    id: undefined,
    programId: '',
    schoolId: '',
    departmentId: '',
    accreditationType: 'ENGINEERING_ACCREDITATION',
    standardId: undefined,
    standardYear: '',
    accreditationLevel: '',
    evaluationMethod: 'DIRECT_INDIRECT_WEIGHTED',
    evaluationCycle: 'YEAR',
    includeGraduateSamples: true,
    includeEmployerSamples: true,
    includeAlumniSamples: true,
    includeCurrentStudentSamples: false,
    sampleScopeRemark: '',
    collegeReviewOwner: '',
    departmentReviewOwner: '',
    programReviewOwner: '',
    reviewChainRemark: '',
    archiveRetentionYears: 5,
    archiveLocation: '',
    archiveResponsibleUnit: '',
    archivePolicyRemark: '',
    enabled: true,
  })
  editorVisible.value = true
}

function openEdit(record: ProgramEvaluationProfileVO) {
  editorMode.value = 'edit'
  Object.assign(editor, record)
  editorVisible.value = true
}

function handleProgramChange(value: string | null) {
  editor.programId = value ?? ''
}

async function submitEditor() {
  if (!editor.programId || !editor.accreditationType) {
    message.error('请选择专业和认证类型')
    return
  }
  submitting.value = true
  try {
    if (editorMode.value === 'create') await programEvaluationProfileApi.create(editor)
    else await programEvaluationProfileApi.update(editor)
    message.success('已保存')
    editorVisible.value = false
    await loadList()
  } finally {
    submitting.value = false
  }
}

async function handleDelete(record: ProgramEvaluationProfileVO) {
  void confirmAsync({
    title: `删除专业 ${record.programName} 的评价口径？`,
    type: 'error',
    onOk: async () => {
      await programEvaluationProfileApi.delete(record.id)
      message.success('已删除')
      await loadList()
    },
  })
}

onMounted(async () => {
  await Promise.all([loadList(), loadDicts()])
})
</script>

<template>
  <StageWorkbenchShell>
    <SignalBand :metrics="signals" compact class="program-profile__signals" />

    <a-card :bordered="false" class="detail-table-card program-profile__table-card">
      <template #title>口径列表</template>

      <div class="filter-card">
        <a-form layout="inline" class="filter-form filter-form--toolbar" @submit.prevent="loadList">
          <a-form-item label="认证类型">
            <a-select
              v-model:value="query.accreditationType"
              placeholder="认证类型"
              allow-clear
              style="width: 160px"
              :options="accreditationOptions"
            />
          </a-form-item>
          <a-form-item label="专业名称">
            <a-input
              v-model:value="query.keyword"
              placeholder="专业名称"
              style="width: 160px"
              @press-enter="loadList"
            />
          </a-form-item>
          <a-form-item class="filter-form__actions">
            <a-space class="filter-form__action-group">
              <UiButton size="sm" @click="loadList">查询</UiButton>
              <span class="op-link" role="button" @click="resetQuery">重置</span>
              <UiButton variant="outline" size="sm" :loading="loading" @click="loadList">刷新</UiButton>
              <UiButton size="sm" @click="openCreate">新建评价口径</UiButton>
            </a-space>
          </a-form-item>
        </a-form>
      </div>

      <UiDataTable class="student-detail-table__data-table"
        v-model:current="query.pageNum"
        v-model:page-size="query.pageSize"
        :columns="columns"
        :data-source="list"
        :loading="loading"
        row-key="id"
        size="middle"
        :total="total"
        flat
        @page-change="handlePageChange"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'accreditationType'">
            {{ accreditationLabel(record.accreditationType) }}
          </template>
          <template v-else-if="column.key === 'programName'">
            {{ record.programName }}
          </template>
          <template v-else-if="column.key === 'accreditationLevel'">
            {{ record.accreditationLevel || '未配置认证级别' }}
          </template>
          <template v-else-if="column.key === 'evaluationMethod'">
            {{ evaluationMethodLabel(record.evaluationMethod) }}
          </template>
          <template v-else-if="column.key === 'evaluationCycle'">
            {{ evaluationCycleLabel(record.evaluationCycle) }}
          </template>
          <template v-else-if="column.key === 'enabled'">
            <a-tag :color="record.enabled ? 'green' : 'default'">
              {{ record.enabled ? '启用' : '停用' }}
            </a-tag>
          </template>
          <template v-else-if="column.key === 'actions'"><div class="operations-cell" @click.stop>
<span class="op-link" role="button" @click="openEdit(record)">编辑</span>
              <span class="op-link danger" role="button" @click="handleDelete(record)">删除</span>
            </div></template>
        </template>
      </UiDataTable>
    </a-card>

    <UiDrawer
      v-model:open="editorVisible"
      :title="editorMode === 'create' ? '新建专业评价口径' : '编辑专业评价口径'"
      :width="640"
      :confirm-loading="submitting"
      :hide-footer="false"
      ok-text="保存"
      @ok="submitEditor"
    >
      <a-form layout="vertical" :model="editor">
        <a-row :gutter="12">
          <a-col :span="24">
            <a-form-item label="专业" required>
              <ProgramSelector :value="editor.programId || null" @change="handleProgramChange" />
            </a-form-item>
          </a-col>
        </a-row>
        <a-row :gutter="12">
          <a-col :span="8">
            <a-form-item label="认证类型" required>
              <a-select v-model:value="editor.accreditationType" :options="accreditationOptions" />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="认证级别">
              <a-input v-model:value="editor.accreditationLevel" placeholder="如 二级 / 三级" />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="标准年份">
              <a-input v-model:value="editor.standardYear" />
            </a-form-item>
          </a-col>
        </a-row>
        <a-form-item label="关联认证标准">
          <a-select
            v-model:value="editor.standardId"
            allow-clear
            show-search
            option-filter-prop="label"
          >
            <a-select-option
              v-for="s in standards"
              :key="s.id"
              :value="s.id"
              :label="`${s.standardCode} · ${s.standardName}`"
            >
              {{ s.standardCode }} · {{ s.standardName }}
            </a-select-option>
          </a-select>
        </a-form-item>
        <a-row :gutter="12">
          <a-col :span="12">
            <a-form-item label="评价方法" required>
              <a-select
                v-model:value="editor.evaluationMethod"
                :options="evaluationMethodOptions"
              />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="评价周期" required>
              <a-select v-model:value="editor.evaluationCycle" :options="evaluationCycleOptions" />
            </a-form-item>
          </a-col>
        </a-row>
        <a-divider orientation="left">样本范围</a-divider>
        <a-form-item>
          <a-space wrap>
            <a-checkbox v-model:checked="editor.includeGraduateSamples">毕业生</a-checkbox>
            <a-checkbox v-model:checked="editor.includeEmployerSamples">用人单位</a-checkbox>
            <a-checkbox v-model:checked="editor.includeAlumniSamples">校友</a-checkbox>
            <a-checkbox v-model:checked="editor.includeCurrentStudentSamples">在校生</a-checkbox>
          </a-space>
        </a-form-item>
        <a-form-item label="样本范围补充说明">
          <a-input
            v-model:value="editor.sampleScopeRemark"
            placeholder="如覆盖年级、抽样口径或排除条件"
          />
        </a-form-item>

        <a-divider orientation="left">责任链</a-divider>
        <a-row :gutter="12">
          <a-col :span="8">
            <a-form-item label="校级责任">
              <a-input v-model:value="editor.collegeReviewOwner" placeholder="责任单位或负责人" />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="院系责任">
              <a-input
                v-model:value="editor.departmentReviewOwner"
                placeholder="责任单位或负责人"
              />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="专业责任">
              <a-input v-model:value="editor.programReviewOwner" placeholder="责任单位或负责人" />
            </a-form-item>
          </a-col>
        </a-row>
        <a-form-item label="责任链补充说明">
          <a-input
            v-model:value="editor.reviewChainRemark"
            placeholder="如复核顺序、签字节点或归口要求"
          />
        </a-form-item>

        <a-divider orientation="left">归档策略</a-divider>
        <a-row :gutter="12">
          <a-col :span="8">
            <a-form-item label="保存年限">
              <a-input-number
                v-model:value="editor.archiveRetentionYears"
                :min="0"
                style="width: 100%"
              />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="归档位置">
              <a-input v-model:value="editor.archiveLocation" />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="责任单位">
              <a-input v-model:value="editor.archiveResponsibleUnit" />
            </a-form-item>
          </a-col>
        </a-row>
        <a-form-item label="归档策略补充说明">
          <a-input
            v-model:value="editor.archivePolicyRemark"
            placeholder="如电子/纸质材料同步要求"
          />
        </a-form-item>
        <a-checkbox v-model:checked="editor.enabled"> 启用 </a-checkbox>
      </a-form>
    </UiDrawer>
  </StageWorkbenchShell>
</template>

<style scoped lang="scss">
.program-profile {
  &__filter {
    width: 200px;
  }

  &__signals {
    margin-bottom: 16px;
    padding: 16px 20px;
    background: var(--dp-surface-elevated, #f8fafc);
    border: 1px solid var(--dp-border, #e2e8f0);
    border-radius: 8px;
  }

  &__panel {
    background: var(--dp-surface, #fff);
    border: 1px solid var(--dp-border, #e2e8f0);
    border-radius: 8px;
    padding: 16px;
  }

  &__panel-header {
    margin-bottom: 12px;
  }

  &__panel-title {
    margin: 0;
    font-size: 16px;
    font-weight: 600;
    color: var(--dp-text-primary, #0f172a);
  }
}
</style>
