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
} from '@/apis/quality/accreditation-standard'
import type {
  ProgramEvaluationProfileQueryRequest,
  ProgramEvaluationProfileSaveRequest,
  ProgramEvaluationProfileVO,
} from '@/apis/quality/program-evaluation-profile'
import type {
  AccreditationType,
  EvaluationCycle,
  EvaluationMethod,
} from '@/apis/quality/types'
import type { FilterField } from '@/components/ui-guide/ui/types'
import type { SignalMetric } from '@/types/workbench'
import { message } from 'ant-design-vue'
import { computed, onActivated, onMounted, reactive, ref } from 'vue'
import { accreditationStandardApi } from '@/apis/quality/accreditation-standard'
import { programEvaluationProfileApi } from '@/apis/quality/program-evaluation-profile'
import {
  ACCREDITATION_TYPE_LABEL,
  EVALUATION_CYCLE_LABEL,
  EVALUATION_METHOD_LABEL,
} from '@/apis/quality/types'
import { ProgramSelector } from '@/components/quality/selectors'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiCard from '@/components/ui-guide/ui/Card.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiFilterBar from '@/components/ui-guide/ui/FilterBar.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiDrawer from '@/components/ui-guide/ui/UiDrawer.vue'
import SignalBand from '@/components/workbench/SignalBand.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import { confirmAsync } from '@/composables/useConfirmDialog'
import { useQualityScopedLoader } from '@/composables/useQualityPageScope'
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

interface ProgramProfileFilterModel {
  accreditationType?: AccreditationType
  keyword: string
}

const listFilterForm = reactive<ProgramProfileFilterModel>({
  accreditationType: undefined,
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

const filterFields: FilterField[] = [
  {
    key: 'accreditationType',
    type: 'select',
    label: '认证类型',
    placeholder: '认证类型',
    allowClear: true,
    width: 160,
    options: accreditationOptions,
  },
  {
    key: 'keyword',
    type: 'input',
    label: '专业名称',
    placeholder: '专业名称',
    allowClear: true,
    width: 160,
    triggerSearchOnChange: false,
  },
]
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
    query.pageNum = page.pageNum
    query.pageSize = page.pageSize
    total.value = readPageTotal(page, '专业评价口径加载失败，请稍后重试')
    if (list.value.length === 0 && total.value > 0 && query.pageNum > 1) {
      query.pageNum -= 1
      await loadList()
    }
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

function syncListFilterToQuery() {
  query.accreditationType = listFilterForm.accreditationType
  query.keyword = listFilterForm.keyword
}

function handleSearch() {
  query.pageNum = 1
  syncListFilterToQuery()
  loadList()
}

function resetQuery() {
  query.pageNum = 1
  syncListFilterToQuery()
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

useQualityScopedLoader(() => {
  void loadList()
}, { watchScope: true, immediate: false, reloadOnActivated: false })

onMounted(async () => {
  await Promise.all([loadList(), loadDicts()])
})

onActivated(() => {
  void Promise.all([loadList(), loadDicts()])
})
</script>

<template>
  <StageWorkbenchShell>
    <SignalBand :metrics="signals" compact class="program-profile__signals" />

    <UiCard class="detail-table-card program-profile__table-card">
      <template #title>口径列表</template>
      <template #extra>
        <UiButton size="sm" @click="openCreate">新建评价口径</UiButton>
      </template>

      <UiFilterBar
        variant="plain"
        v-model="listFilterForm"
        :fields="filterFields"
        show-labels
        search-text="查询"
        @search="handleSearch"
        @reset="resetQuery"
      />

      <UiEmpty
        v-if="!loading && total === 0"
        description="未配置专业评价口径"
      />
      <UiDataTable
        v-else
        class="student-detail-table__data-table"
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
            <UiTag :tone="record.enabled ? 'green' : 'gray'">
              {{ record.enabled ? '启用' : '停用' }}
            </UiTag>
          </template>
          <template v-else-if="column.key === 'actions'">
            <div class="operations-cell" @click.stop>
              <UiTextAction @click="openEdit(record)">编辑</UiTextAction>
              <UiTextAction tone="danger" @click="handleDelete(record)">删除</UiTextAction>
            </div>
          </template>
        </template>
      </UiDataTable>
    </UiCard>

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
              <ProgramSelector
                :value="editor.programId || null"
                :disabled="editorMode === 'edit'"
                @change="handleProgramChange"
              />
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
            :allow-clear="editorMode === 'create'"
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
    margin-bottom: 12px;
  }

  &__panel {
    background: var(--dp-surface);
    border: 1px solid var(--dp-border);
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
    color: var(--dp-text-primary);
  }
}
</style>
