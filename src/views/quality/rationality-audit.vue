<template>
  <StageWorkbenchShell>
    <template #context>
      <QualityPageContextBar show-title title="考核评价依据合理性审核">
        <template #status>
          <UiTag tone="blue" size="sm">覆盖率 {{ coverageRate }}%</UiTag>
          <UiTag :tone="coverageRate >= 100 ? 'green' : 'orange'" size="sm">
            {{ coverageRate >= 100 ? '已全部覆盖' : `${pendingCount} 门未通过/未审核` }}
          </UiTag>
        </template>
      </QualityPageContextBar>
    </template>

    <QualityPlanGateStrip
      v-if="planGateMode"
      :mode="planGateMode"
      class="rationality-audit__empty"
    />

    <UiCard v-else>
      <template #title>
        <SafetyCertificateOutlined />
        <span>考核评价依据合理性审核</span>
      </template>

      <UiFilterBar
        v-model="filterModel"
        :fields="filterFields"
        variant="plain"
        @search="handleSearch"
        @reset="handleReset"
      >
        <template #field-semester>
          <UiSelect
            size="sm"
            v-model="filterForm.semester"
            :options="SemesterOptions"
            placeholder="学期"
            allow-clear
            style="width: 100%"
          />
        </template>
      </UiFilterBar>

      <UiSpin :spinning="loading">
        <UiEmpty v-if="!loading && !list.length" size="sm" description="当前范围无待审核项" />
        <UiDataTable
          v-else
          pagination-mode="server"
          v-model:current="pageNum"
          v-model:page-size="pageSize"
          :columns="columns"
          :data-source="list"
          :loading="loading"
          row-key="qualityCourseId"
          flat
          :total="listTotal"
          @page-change="handlePageChange"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'auditStatus'">
              <UiTag :tone="auditStatusTone(record.auditStatus)" size="sm">
                {{ auditStatusLabel(record.auditStatus) }}
              </UiTag>
            </template>
            <template v-else-if="column.key === 'courseName'">
              <div class="course-cell">
                <div class="course-name">{{ record.courseName }}</div>
                <div v-if="record.courseCode" class="course-code">{{ record.courseCode }}</div>
              </div>
            </template>
            <template v-else-if="column.key === 'checks'">
              <div class="dp-space" style="--dp-space-gap: 8px">
                <UiTag :tone="booleanTagTone(record.contentAligned)" size="sm">内容一致</UiTag>
                <UiTag :tone="booleanTagTone(record.rubricMeasurable)" size="sm">标准可衡量</UiTag>
                <UiTag :tone="booleanTagTone(record.methodReasonable)" size="sm">方法合理</UiTag>
              </div>
            </template>
            <template v-else-if="column.key === 'source'">
              <UiTag :tone="record.hasAuditRecord ? 'blue' : 'orange'" size="sm">
                {{ record.hasAuditRecord ? '已有审核记录' : '未建审核记录' }}
              </UiTag>
            </template>
            <template v-else-if="column.key === 'actions'">
              <UiTableActions
                v-if="isCourseAuditMutable(record)"
                :items="[{ key: 'edit', label: record.hasAuditRecord ? '编辑审核' : '新建审核' }]"
                split
                @action="() => openEdit(record)"
              />
              <span v-else class="rationality-audit__locked-hint">已通过</span>
            </template>
          </template>
        </UiDataTable>
      </UiSpin>
    </UiCard>
    <!-- 审核编辑弹窗 -->
    <UiDialog
      v-model:open="editOpen"
      title="考核评价依据合理性审核"
      width="520px"
      :confirm-loading="editing"
      cancel-text="关闭"
    >
      <UiForm layout="vertical">
        <UiFormItem label="课程">
          <UiInput size="sm" :value="editForm.courseName || ''" disabled />
        </UiFormItem>
        <UiFormItem label="考核内容是否与课程目标一致">
          <UiSwitch size="sm" v-model="editForm.contentAligned" />
        </UiFormItem>
        <UiFormItem label="评分标准是否明确可衡量">
          <UiSwitch size="sm" v-model="editForm.rubricMeasurable" />
        </UiFormItem>
        <UiFormItem label="评价方法是否合理">
          <UiSwitch size="sm" v-model="editForm.methodReasonable" />
        </UiFormItem>
        <UiFormItem label="审核意见">
          <UiTextarea
            size="sm"
            v-model="editForm.auditOpinion"
            :rows="3"
            placeholder="审核意见..."
          />
        </UiFormItem>
      </UiForm>
      <template #footer>
        <div class="dp-space" style="--dp-space-gap: 8px">
          <UiButton size="sm" variant="outline" @click="editOpen = false">取消</UiButton>
          <UiButton
            size="sm"
            status="danger"
            :loading="editing"
            @click="submitAudit(AssessmentRationalityAuditStatusCode.REJECTED)"
          >
            驳回
          </UiButton>
          <UiButton
            size="sm"
            variant="primary"
            :loading="editing"
            :disabled="
              !editForm.contentAligned || !editForm.rubricMeasurable || !editForm.methodReasonable
            "
            @click="submitAudit(AssessmentRationalityAuditStatusCode.APPROVED)"
          >
            审核通过
          </UiButton>
        </div>
      </template>
    </UiDialog>
  </StageWorkbenchShell>
</template>

<script lang="ts" setup>
import type {
  RationalityAuditCourseLedgerItemVO,
  RationalityAuditCourseLedgerOverviewVO,
  RationalityAuditSaveRequest,
} from '@/apis/quality/rationality-audit'
import type { FilterField } from '@/components/ui-guide/ui/types'
import type { SemesterCode } from '@/types/enums/semester-enum'
import SafetyCertificateOutlined from '@ant-design/icons-vue/SafetyCertificateOutlined'
import message from 'ant-design-vue/es/message'
import { computed, onActivated, onMounted, reactive, ref } from 'vue'
import {
  createRationalityAudit,
  getRationalityAuditCourseLedgerOverview,
  pageRationalityAuditCourseLedger,
  updateRationalityAudit,
} from '@/apis/quality/rationality-audit'
import {
  AssessmentRationalityAuditStatusCode,
  AssessmentRationalityAuditStatusDescription,
  ConfirmationStatusCode,
} from '@/apis/quality/types'
import QualityPageContextBar from '@/components/quality/QualityPageContextBar.vue'
import QualityPlanGateStrip from '@/components/quality/QualityPlanGateStrip.vue'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiCard from '@/components/ui-guide/ui/Card.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiFilterBar from '@/components/ui-guide/ui/FilterBar.vue'
import UiInput from '@/components/ui-guide/ui/Input.vue'
import UiSwitch from '@/components/ui-guide/ui/Switch.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiTextarea from '@/components/ui-guide/ui/Textarea.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiDialog from '@/components/ui-guide/ui/UiDialog.vue'
import UiForm from '@/components/ui-guide/ui/UiForm.vue'
import UiFormItem from '@/components/ui-guide/ui/UiFormItem.vue'
import UiSelect from '@/components/ui-guide/ui/UiSelect.vue'
import UiSpin from '@/components/ui-guide/ui/UiSpin.vue'
import UiTableActions from '@/components/ui-guide/ui/UiTableActions.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import { useQualityScopedLoader } from '@/composables/useQualityPageScope'
import { useQualityStore } from '@/stores/modules/quality'
import { ALL_SEMESTER_CODES, SemesterOptions } from '@/types/enums/semester-enum'
import { showFormValidationMessage, showUserError } from '@/utils/error-handler'
import { strictEnumLabel } from '@/utils/strict-enum'

defineOptions({ name: 'QualityRationalityAudit' })

interface RationalityAuditEditForm {
  id?: string
  qualityCourseId?: string
  courseName?: string
  auditOpinion?: string
  contentAligned?: boolean
  rubricMeasurable?: boolean
  methodReasonable?: boolean
}

interface RationalityAuditFilterModel {
  [key: string]: unknown
  schoolYear: string
  semester?: SemesterCode
}

const loading = ref(false)
const qualityStore = useQualityStore()
const filterForm = reactive<RationalityAuditFilterModel>({
  schoolYear: '',
  semester: undefined,
})

const filterModel = computed<Record<string, unknown>>({
  get: () => filterForm,
  set: (value) => {
    Object.assign(filterForm, value)
  },
})

const filterFields: FilterField[] = [
  {
    key: 'schoolYear',
    type: 'input',
    placeholder: '2025-2026',
    allowClear: true,
    width: 140,
  },
  { key: 'semester', type: 'custom', width: 140 },
]
const list = ref<RationalityAuditCourseLedgerItemVO[]>([])
const listTotal = ref(0)
const pageNum = ref(1)
const pageSize = ref(20)
const overview = ref<RationalityAuditCourseLedgerOverviewVO>({
  totalCourseCount: 0,
  auditedCourseCount: 0,
  approvedCourseCount: 0,
  pendingCourseCount: 0,
  coverageRate: 0,
})
const editOpen = ref(false)
const editing = ref(false)
const editForm = ref<RationalityAuditEditForm>({})

const pendingCount = computed(() => overview.value.pendingCourseCount)
const coverageRate = computed(() => Number(overview.value.coverageRate ?? 0))

const columns = [
  { title: '课程', key: 'courseName', dataIndex: 'courseName', width: 200 },
  { title: '状态', key: 'auditStatus', width: 100 },
  { title: '台账来源', key: 'source', width: 120 },
  { title: '审核项', key: 'checks', width: 280 },
  { title: '审核意见', key: 'auditOpinion', dataIndex: 'auditOpinion', ellipsis: true },
  { title: '审核时间', key: 'auditedTime', dataIndex: 'auditedTime', width: 160 },
  { title: '操作', key: 'actions', width: 120 },
]

function auditStatusTone(s: AssessmentRationalityAuditStatusCode) {
  return s === AssessmentRationalityAuditStatusCode.APPROVED
    ? 'green'
    : s === AssessmentRationalityAuditStatusCode.REJECTED
      ? 'red'
      : 'orange'
}

function auditStatusLabel(s: AssessmentRationalityAuditStatusCode) {
  return strictEnumLabel(AssessmentRationalityAuditStatusDescription, s, '考核评价依据审核状态')
}

function isCourseAuditMutable(record: RationalityAuditCourseLedgerItemVO): boolean {
  return record.auditStatus !== AssessmentRationalityAuditStatusCode.APPROVED
}

function booleanTagTone(v?: boolean) {
  return v === true ? 'green' : v === false ? 'red' : 'orange'
}

async function loadList() {
  const trainingPlanId = qualityStore.currentTrainingPlanId
  const { schoolYear, semester } = filterForm
  if (!trainingPlanId || !schoolYear || !semester) {
    showFormValidationMessage('请选择培养方案、学年和学期')
    return
  }
  loading.value = true
  try {
    const scope = { trainingPlanId, schoolYear, semester }
    const pageResult = await pageRationalityAuditCourseLedger({
      ...scope,
      pageNum: pageNum.value,
      pageSize: pageSize.value,
    })
    list.value = pageResult.list
    listTotal.value = pageResult.total
    try {
      overview.value = await getRationalityAuditCourseLedgerOverview(scope)
    } catch (e: unknown) {
      overview.value = {
        totalCourseCount: 0,
        auditedCourseCount: 0,
        approvedCourseCount: 0,
        pendingCourseCount: 0,
        coverageRate: 0,
      }
      showUserError(e, '审核覆盖率概览加载失败')
    }
  } catch (e: unknown) {
    list.value = []
    listTotal.value = 0
    overview.value = {
      totalCourseCount: 0,
      auditedCourseCount: 0,
      approvedCourseCount: 0,
      pendingCourseCount: 0,
      coverageRate: 0,
    }
    showUserError(e, '加载审核列表失败')
  } finally {
    loading.value = false
  }
}

function handlePageChange(pageEvent: { current: number, pageSize: number }) {
  pageNum.value = pageEvent.current
  pageSize.value = pageEvent.pageSize
  void loadList()
}

function handleSearch() {
  pageNum.value = 1
  void loadList()
}

function handleReset() {
  Object.assign(filterForm, {
    schoolYear: '',
    semester: undefined,
  })
  pageNum.value = 1
  list.value = []
  listTotal.value = 0
  overview.value = {
    totalCourseCount: 0,
    auditedCourseCount: 0,
    approvedCourseCount: 0,
    pendingCourseCount: 0,
    coverageRate: 0,
  }
}

const planGateMode = computed<'need-plan' | 'need-confirm' | null>(() => {
  if (!qualityStore.currentTrainingPlanId) {
    return 'need-plan'
  }
  if (qualityStore.currentPlan?.confirmationStatus !== ConfirmationStatusCode.CONFIRMED) {
    return 'need-confirm'
  }
  return null
})

function handleScopeChange(): void {
  if (filterForm.schoolYear && filterForm.semester && qualityStore.currentTrainingPlanId) {
    void loadList()
  }
}

useQualityScopedLoader(handleScopeChange, {
  watchScope: true,
  immediate: false,
  reloadOnActivated: false,
})

onMounted(async () => {
  if (!filterForm.schoolYear && qualityStore.currentSchoolYear) {
    filterForm.schoolYear = qualityStore.currentSchoolYear
  }
  const currentSemester = ALL_SEMESTER_CODES.find((code) => code === qualityStore.currentSemester)
  if (!filterForm.semester && currentSemester) {
    filterForm.semester = currentSemester
  }
  if (filterForm.schoolYear && filterForm.semester && qualityStore.currentTrainingPlanId) {
    await loadList()
  }
})

onActivated(() => {
  handleScopeChange()
})

function openEdit(record: RationalityAuditCourseLedgerItemVO) {
  if (!isCourseAuditMutable(record)) {
    void message.warning('该课程合理性审核已通过，禁止修改')
    return
  }
  editForm.value = {
    id: record.id,
    qualityCourseId: record.qualityCourseId,
    courseName: record.courseName,
    auditOpinion: record.auditOpinion,
    contentAligned: record.contentAligned,
    rubricMeasurable: record.rubricMeasurable,
    methodReasonable: record.methodReasonable,
  }
  editOpen.value = true
}

async function submitAudit(
  status: Extract<AssessmentRationalityAuditStatusCode, 'APPROVED' | 'REJECTED'>,
) {
  if (!editForm.value.qualityCourseId) {
    void message.error('缺少课程信息，无法提交审核')
    return
  }
  if (!filterForm.schoolYear || !filterForm.semester) {
    void message.error('请先选择学年和学期')
    return
  }
  if (
    status === AssessmentRationalityAuditStatusCode.APPROVED
    && (!editForm.value.contentAligned
      || !editForm.value.rubricMeasurable
      || !editForm.value.methodReasonable)
  ) {
    void message.error('审核通过必须同时满足三项合理性检查')
    return
  }
  editing.value = true
  try {
    const request: RationalityAuditSaveRequest = {
      qualityCourseId: editForm.value.qualityCourseId,
      auditStatus: status,
      auditOpinion: editForm.value.auditOpinion || '',
      contentAligned: editForm.value.contentAligned ?? false,
      rubricMeasurable: editForm.value.rubricMeasurable ?? false,
      methodReasonable: editForm.value.methodReasonable ?? false,
      schoolYear: filterForm.schoolYear,
      semester: filterForm.semester,
    }
    if (editForm.value.id) {
      request.id = editForm.value.id
      await updateRationalityAudit(request)
    } else {
      await createRationalityAudit(request)
    }
    void message.success(
      status === AssessmentRationalityAuditStatusCode.APPROVED ? '审核已通过' : '已驳回',
    )
    editOpen.value = false
    await loadList()
  } catch (e: unknown) {
    showUserError(e, '操作失败')
  } finally {
    editing.value = false
  }
}
</script>

<style scoped lang="scss">
.course-cell {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.course-name {
  color: var(--dp-text);
  font-weight: 500;
  line-height: 22px;
}

.course-code {
  color: var(--dp-text-secondary);
  font-size: var(--dp-font-size-xs);
  line-height: 18px;
}
</style>
