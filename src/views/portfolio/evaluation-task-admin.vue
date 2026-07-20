<script setup lang="ts">
import type { ColumnsType } from 'ant-design-vue/es/table'
import type { PortfolioEvaluationTaskStatusCode } from '@/apis/portfolio/enums'
import type { PortfolioTenantIndicatorConfigVO } from '@/apis/portfolio/indicator-types'
import type { PortfolioEvaluationSubjectTeacherOptionVO } from '@/apis/portfolio/teacher-platform'
import type {
  PortfolioEvaluationMaterialPreviewVO,
  PortfolioEvaluationTeacherNoticeVO,
} from '@/apis/portfolio/types'
import type { EvaluationWorkgroupVO } from '@/apis/quality/evaluation-workgroup'
import message from 'ant-design-vue/es/message'
import { computed, onMounted, reactive, ref } from 'vue'
import {
  PORTFOLIO_EVALUATION_MODE_OPTIONS,
  PORTFOLIO_EVALUATION_NOTICE_MATERIAL_OPERABLE_STATUSES,
  PORTFOLIO_EVALUATION_TASK_STATUS_OPTIONS,
  PORTFOLIO_EVALUATION_TASK_STATUS_TONE,
  PortfolioEvaluationModeCode,
  PortfolioEvaluationModeDescription,
  PortfolioEvaluationTaskStatusDescription,
  PortfolioEvaluationTeacherNoticeStatusCode,
  PortfolioEvaluationTeacherNoticeStatusDescription,
} from '@/apis/portfolio/enums'
import { portfolioEvaluationNoticeApi } from '@/apis/portfolio/evaluation-notice'
import { portfolioIndicatorTenantApi } from '@/apis/portfolio/indicator'
import { portfolioEvaluationTaskApi } from '@/apis/portfolio/teacher-platform'
import { PORTFOLIO_EVALUATION_TEACHER_NOTICE_STATUS_TONE } from '@/apis/portfolio/types'
import { evaluationWorkgroupApi } from '@/apis/quality/evaluation-workgroup'
import { QUALITY_SELECTOR_PAGE_SIZE } from '@/components/quality/selectors/page-contract'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiCard from '@/components/ui-guide/ui/Card.vue'
import UiDatePicker from '@/components/ui-guide/ui/DatePicker.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiTextarea from '@/components/ui-guide/ui/Textarea.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiDialog from '@/components/ui-guide/ui/UiDialog.vue'
import UiSelect from '@/components/ui-guide/ui/UiSelect.vue'
import UiTableActions from '@/components/ui-guide/ui/UiTableActions.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import WorkbenchContextGateStrip from '@/components/workbench/WorkbenchContextGateStrip.vue'
import { confirmAsync } from '@/composables/useConfirmDialog'
import { useQueryTable } from '@/composables/useQueryTable'
import { showFormValidationMessage, showUserError } from '@/utils/error-handler'
import { loadAllPages } from '@/utils/load-all-pages'
import { downloadPortfolioExcelExport } from '@/utils/portfolio-excel-export'
import { strictEnumLabel, strictEnumTone } from '@/utils/strict-enum'

const workgroups = ref<EvaluationWorkgroupVO[]>([])
const indicatorConfigs = ref<PortfolioTenantIndicatorConfigVO[]>([])
const previewTeacherOptions = ref<Array<{ value: string, label: string }>>([])
const previewOpen = ref(false)
const previewLoading = ref(false)
const previewTaskId = ref('')
const previewTeacherId = ref('')
const preview = ref<PortfolioEvaluationMaterialPreviewVO | null>(null)
const previewNotice = ref<PortfolioEvaluationTeacherNoticeVO | null>(null)
const previewRequestToken = ref(0)
const returnReason = ref('')
const returnDueTime = ref('')
const returning = ref(false)
const taskOperationKey = ref('')
const exporting = ref(false)
const taskWriting = computed(() => Boolean(taskOperationKey.value))

const categoryColumns = [
  { title: '分类', dataIndex: 'categoryName', key: 'categoryName' },
  { title: '课程维度', key: 'courseScope', width: 140 },
  { title: '完成', key: 'completed', width: 100 },
]

const identityMaterialColumns = [
  { title: '分类编码', dataIndex: 'categoryCode', key: 'categoryCode', width: 140 },
  { title: '分类名称', dataIndex: 'categoryName', key: 'categoryName' },
  { title: '学年', dataIndex: 'academicYear', key: 'academicYear', width: 120 },
  { title: '身份切片', key: 'identityScope', width: 110 },
  { title: '校内硬性', key: 'usableForCampusHardCriteria', width: 130 },
]

function evaluationMaterialCourseScopeLabel(record: unknown): string {
  const category = record as NonNullable<PortfolioEvaluationMaterialPreviewVO['categories']>[number]
  if (!category.courseCode) {
    return '—'
  }
  const parts = [category.courseCode]
  if (category.academicYear) {
    parts.push(category.academicYear)
  }
  if (category.semester) {
    parts.push(`第${category.semester}学期`)
  }
  return parts.join(' · ')
}

function evaluationCourseArchiveMeta(preview: PortfolioEvaluationMaterialPreviewVO): string {
  if ((preview.courseArchiveTaughtCourseCount ?? 0) <= 0) {
    return ''
  }
  return ` · 讲授 ${preview.courseArchiveTaughtCourseCount} 门 · 五框架 ${preview.courseArchiveFrameworkSlotDone ?? 0}/${preview.courseArchiveFrameworkSlotTotal ?? 0}`
}

function identityScopeLabel(scope?: string): string {
  if (scope === 'CAMPUS') return '校内'
  if (scope === 'EXTERNAL') return '仅外部'
  if (scope === 'SHARED') return '共享'
  return scope || '—'
}

function identityScopeTone(scope?: string): 'blue' | 'orange' | 'green' | 'gray' {
  if (scope === 'CAMPUS') return 'blue'
  if (scope === 'EXTERNAL') return 'orange'
  if (scope === 'SHARED') return 'green'
  return 'gray'
}

function identityMaterialRowKey(record: unknown): string {
  const item = record as {
    archiveRecordId?: string
    categoryCode?: string
    academicYear?: string
    identityScope?: string
  }
  return [
    item.archiveRecordId ?? '',
    item.categoryCode ?? '',
    item.academicYear ?? '',
    item.identityScope ?? '',
  ].join(':')
}

function evaluationMaterialRowKey(record: unknown): string {
  const category = record as NonNullable<PortfolioEvaluationMaterialPreviewVO['categories']>[number]
  return [
    category.categoryId,
    category.courseCode ?? '',
    category.academicYear ?? '',
    category.semester ?? '',
  ].join(':')
}
interface PortfolioEvaluationTaskForm {
  taskName: string
  evaluationMode: PortfolioEvaluationModeCode
  targetIndicatorCode: string
  workgroupId: string
  startTime: string
  endTime: string
}

type PortfolioEvaluationTaskStatusFilter = '' | PortfolioEvaluationTaskStatusCode

const form = reactive<PortfolioEvaluationTaskForm>({
  taskName: '',
  evaluationMode: PortfolioEvaluationModeCode.BY_PERSON,
  targetIndicatorCode: '',
  workgroupId: '',
  startTime: '',
  endTime: '',
})
const {
  loading,
  rows,
  pageNum,
  pageSize,
  pageTotal,
  filters: query,
  loadError,
  loadPage,
  search,
  handlePageChange,
} = useQueryTable(
  (params) =>
    portfolioEvaluationTaskApi.page({
      ...params,
      taskStatus: params.taskStatus || undefined,
    }),
  {
    defaultFilters: () => ({ taskStatus: '' as PortfolioEvaluationTaskStatusFilter }),
    immediate: false,
  },
)

const columns: ColumnsType = [
  { title: '任务名称', dataIndex: 'taskName', key: 'taskName' },
  { title: '模式', dataIndex: 'evaluationMode', key: 'evaluationMode', width: 100 },
  { title: '回流指标', dataIndex: 'targetIndicatorCode', key: 'targetIndicatorCode', width: 120 },
  { title: '工作组', dataIndex: 'workgroupId', key: 'workgroupId', width: 100 },
  { title: '时间窗', key: 'timeWindow', width: 180 },
  { title: '状态', dataIndex: 'taskStatus', key: 'taskStatus', width: 88 },
  { title: '四冻结', key: 'freeze', width: 100 },
  { title: '创建时间', dataIndex: 'createTime', key: 'createTime', width: 160 },
  { title: '操作', key: 'actions', width: 140 },
]

function evaluationModeLabel(mode: PortfolioEvaluationModeCode): string {
  return strictEnumLabel(PortfolioEvaluationModeDescription, mode, '多元评价模式')
}

function taskStatusLabel(status: PortfolioEvaluationTaskStatusCode): string {
  return strictEnumLabel(PortfolioEvaluationTaskStatusDescription, status, '多元评价任务状态')
}

function taskStatusTone(status: PortfolioEvaluationTaskStatusCode) {
  return strictEnumTone(PORTFOLIO_EVALUATION_TASK_STATUS_TONE, status, '多元评价任务状态')
}

function noticeStatusLabel(status: PortfolioEvaluationTeacherNoticeStatusCode): string {
  return strictEnumLabel(
    PortfolioEvaluationTeacherNoticeStatusDescription,
    status,
    '评价材料通知状态',
  )
}

function noticeStatusTone(status: PortfolioEvaluationTeacherNoticeStatusCode) {
  return strictEnumTone(PORTFOLIO_EVALUATION_TEACHER_NOTICE_STATUS_TONE, status, '评价材料通知状态')
}

function canReturnNotice(notice: PortfolioEvaluationTeacherNoticeVO | null): boolean {
  const taskStatus = preview.value?.taskStatus
  if (
    !taskStatus
    || !PORTFOLIO_EVALUATION_NOTICE_MATERIAL_OPERABLE_STATUSES.includes(taskStatus)
  ) {
    return false
  }
  return (
    notice?.noticeStatus === PortfolioEvaluationTeacherNoticeStatusCode.MATERIAL_CONFIRM
    || notice?.noticeStatus === PortfolioEvaluationTeacherNoticeStatusCode.CONFIRMED
  )
}

function workgroupName(id?: string) {
  if (!id) {
    return '—'
  }
  return workgroups.value.find((item) => item.id === id)?.workgroupName ?? id
}

async function loadWorkgroups() {
  try {
    workgroups.value = await loadAllPages(
      ({ pageNum, pageSize }) =>
        evaluationWorkgroupApi.page({
          pageNum,
          pageSize,
        }),
      QUALITY_SELECTOR_PAGE_SIZE,
    )
  } catch (error) {
    showUserError(error, '加载评价工作组失败')
  }
}

async function loadIndicatorConfigs() {
  try {
    indicatorConfigs.value = (await portfolioIndicatorTenantApi.listConfig()).filter(
      (item) => item.enabled,
    )
  } catch (error) {
    showUserError(error, '加载可回流指标失败')
  }
}

/** 材料预览必须限定在当前评价任务参评教师范围内，避免误用全局教师名册第一页导致错人预览。 */
function buildPreviewTeacherOptions(rows: PortfolioEvaluationSubjectTeacherOptionVO[]) {
  return rows.map((item) => {
    const name = item.fullName?.trim() ? item.fullName : item.teacherUserId
    const hold = item.evaluationHeld
      ? `（${item.lifecycleStatusLabel || item.lifecycleStatus || '参评hold'}）`
      : ''
    return {
      value: item.teacherUserId,
      label: `${name}${hold}`,
    }
  })
}

async function openMaterialPreview(taskId: string) {
  const currentToken = ++previewRequestToken.value
  previewTaskId.value = taskId
  previewTeacherId.value = ''
  previewTeacherOptions.value = []
  preview.value = null
  previewNotice.value = null
  returnReason.value = ''
  returnDueTime.value = ''
  previewOpen.value = true
  previewLoading.value = true
  try {
    const fillContext = await portfolioEvaluationTaskApi.fillContext({ id: taskId })
    if (currentToken !== previewRequestToken.value || previewTaskId.value !== taskId) {
      return
    }
    previewTeacherOptions.value = buildPreviewTeacherOptions(
      fillContext.subjectTeacherOptions ?? [],
    )
    previewTeacherId.value = previewTeacherOptions.value[0]?.value ?? ''
    if (!previewTeacherId.value) {
      preview.value = null
      return
    }
    await loadMaterialPreview()
  } catch (error) {
    if (currentToken !== previewRequestToken.value || previewTaskId.value !== taskId) {
      return
    }
    previewTeacherOptions.value = []
    previewTeacherId.value = ''
    preview.value = null
    previewNotice.value = null
    showUserError(error, '加载任务参评教师失败')
  } finally {
    if (currentToken === previewRequestToken.value && previewTaskId.value === taskId) {
      previewLoading.value = false
    }
  }
}

async function loadMaterialPreview() {
  const currentToken = ++previewRequestToken.value
  if (!previewTaskId.value || !previewTeacherId.value) {
    showFormValidationMessage('请选择教师后再预览材料')
    return
  }
  const taskId = previewTaskId.value
  const teacherId = previewTeacherId.value
  preview.value = null
  previewNotice.value = null
  returnReason.value = ''
  returnDueTime.value = ''
  previewLoading.value = true
  try {
    const nextPreview = await portfolioEvaluationNoticeApi.materialPreview({
      evaluationTaskId: taskId,
      teacherId,
    })
    if (
      currentToken !== previewRequestToken.value
      || previewTaskId.value !== taskId
      || previewTeacherId.value !== teacherId
    ) {
      return
    }
    preview.value = nextPreview
    returnDueTime.value = nextPreview.endTime ?? ''
    try {
      const noticePage = await portfolioEvaluationNoticeApi.pageNotices({
        pageNum: 1,
        pageSize: 10,
        evaluationTaskId: taskId,
        teacherId,
      })
      if (
        currentToken !== previewRequestToken.value
        || previewTaskId.value !== taskId
        || previewTeacherId.value !== teacherId
      ) {
        return
      }
      previewNotice.value = noticePage.list?.[0] ?? null
      returnDueTime.value = previewNotice.value?.dueTime ?? nextPreview.endTime ?? ''
    } catch (error) {
      if (
        currentToken !== previewRequestToken.value
        || previewTaskId.value !== taskId
        || previewTeacherId.value !== teacherId
      ) {
        return
      }
      previewNotice.value = null
      showUserError(error, '加载材料预览通知失败')
    }
  } catch (error) {
    if (
      currentToken !== previewRequestToken.value
      || previewTaskId.value !== taskId
      || previewTeacherId.value !== teacherId
    ) {
      return
    }
    preview.value = null
    previewNotice.value = null
    showUserError(error, '加载材料预览失败')
  } finally {
    if (
      currentToken === previewRequestToken.value
      && previewTaskId.value === taskId
      && previewTeacherId.value === teacherId
    ) {
      previewLoading.value = false
    }
  }
}

async function returnMaterialForSupplement() {
  const notice = previewNotice.value
  const reason = returnReason.value.trim()
  if (!notice || !canReturnNotice(notice)) {
    showFormValidationMessage('当前材料通知状态不可退回')
    return
  }
  if (!reason) {
    showFormValidationMessage('请填写退回补充原因')
    return
  }
  const confirmed = await confirmAsync({
    title: '确认退回教师补充材料？',
    content: '退回后教师须按原因补充材料并重新确认，当前已确认状态将失效。',
    type: 'warning',
  })
  if (!confirmed) return

  const noticeId = notice.id
  const taskId = previewTaskId.value
  const teacherId = previewTeacherId.value
  returning.value = true
  try {
    const updated = await portfolioEvaluationNoticeApi.returnNotice({
      noticeId,
      returnReason: reason,
      dueTime: returnDueTime.value || undefined,
    })
    if (previewTaskId.value !== taskId || previewTeacherId.value !== teacherId) return
    previewNotice.value = updated
    returnReason.value = ''
    message.success('已退回教师补充材料')
  } catch (error) {
    showUserError(error, '退回补充失败')
  } finally {
    returning.value = false
  }
}

async function createTask() {
  if (taskWriting.value) return
  if (!form.taskName.trim()) {
    showFormValidationMessage('请填写任务名称')
    return
  }
  if (!form.workgroupId) {
    showFormValidationMessage('请选择评价工作组')
    return
  }
  if (
    form.evaluationMode === PortfolioEvaluationModeCode.BY_PERSON
    && !form.targetIndicatorCode.trim()
  ) {
    showFormValidationMessage('按人评价须填写画像回流目标指标编码')
    return
  }
  if (!form.startTime) {
    showFormValidationMessage('请填写开始时间')
    return
  }
  if (!form.endTime) {
    showFormValidationMessage('请填写结束时间')
    return
  }
  taskOperationKey.value = 'create'
  try {
    await portfolioEvaluationTaskApi.create({
      taskName: form.taskName.trim(),
      evaluationMode: form.evaluationMode,
      targetIndicatorCode:
        form.evaluationMode === PortfolioEvaluationModeCode.BY_PERSON
          ? form.targetIndicatorCode.trim()
          : undefined,
      workgroupId: form.workgroupId,
      startTime: form.startTime,
      endTime: form.endTime,
    })
    message.success('评价任务已创建')
    form.taskName = ''
    form.workgroupId = ''
    form.targetIndicatorCode = ''
    form.startTime = ''
    form.endTime = ''
    await loadPage()
  } catch (error) {
    showUserError(error, '创建评价任务失败')
  } finally {
    if (taskOperationKey.value === 'create') taskOperationKey.value = ''
  }
}

async function publishTask(id: string) {
  if (taskWriting.value) return
  const operation = `publish:${id}`
  taskOperationKey.value = operation
  try {
    const confirmed = await confirmAsync({
      title: '确认发布评价任务？',
      content: '发布后将生成参评教师通知并开放材料确认与评价填报，任务基础范围不可按草稿方式修改。',
      type: 'warning',
      okText: '确认发布',
    })
    if (!confirmed) return
    await portfolioEvaluationTaskApi.publish({ id })
    message.success('任务已发布')
    await loadPage()
  } catch (error) {
    showUserError(error, '发布评价任务失败')
  } finally {
    if (taskOperationKey.value === operation) taskOperationKey.value = ''
  }
}

async function exportExcel() {
  if (exporting.value || taskWriting.value) {
    return
  }
  exporting.value = true
  try {
    const result = await portfolioEvaluationTaskApi.exportExcel()
    await downloadPortfolioExcelExport(result)
    message.success('评价任务已导出')
  } catch (error) {
    showUserError(error, '导出评价任务失败')
  } finally {
    exporting.value = false
  }
}

onMounted(async () => {
  await Promise.all([loadWorkgroups(), loadIndicatorConfigs()])
  await loadPage()
})
</script>

<template>
  <StageWorkbenchShell>
    <template #context>
      <ContextBar show-title layout="workbench" title="多元评价任务">
        <template #actions>
          <UiButton size="sm" variant="primary" :loading="exporting" :disabled="exporting || taskWriting" @click="exportExcel"> 导出表格文件 </UiButton>
        </template>
      </ContextBar>
    </template>
    <UiCard>
      <div class="form-row">
        <input
          v-model="form.taskName"
          class="input input--wide"
          placeholder="任务名称"
          :disabled="taskWriting"
        />
        <UiSelect
          size="sm"
          v-model="form.evaluationMode"
          placeholder="评价模式"
          style="width: 120px"
          :options="PORTFOLIO_EVALUATION_MODE_OPTIONS"
          :disabled="taskWriting"
        />
        <UiSelect
          v-if="form.evaluationMode === PortfolioEvaluationModeCode.BY_PERSON"
          v-model="form.targetIndicatorCode"
          placeholder="选择画像回流指标"
          style="width: 180px"
          size="sm"
          :disabled="taskWriting"
          :options="indicatorConfigs.map((indicator) => ({
            value: indicator.indicatorCode,
            label: indicator.indicatorName || indicator.indicatorCode,
          }))"
        />
        <UiSelect
          v-model="form.workgroupId"
          placeholder="评价工作组"
          style="width: 200px"
          :disabled="taskWriting"
          size="sm"
          :options="workgroups.map((wg) => ({ value: wg.id, label: wg.workgroupName }))"
        />
        <UiDatePicker
          size="sm"
          v-model="form.startTime"
          value-format="YYYY-MM-DD HH:mm:ss"
          :show-time="true"
          placeholder="开始时间"
          :disabled="taskWriting"
        />
        <UiDatePicker
          size="sm"
          v-model="form.endTime"
          value-format="YYYY-MM-DD HH:mm:ss"
          :show-time="true"
          placeholder="结束时间"
          :disabled="taskWriting"
        />
        <UiButton
          size="sm"
          variant="primary"
          :loading="taskOperationKey === 'create'"
          :disabled="taskWriting"
          @click="createTask"
        >
          创建任务
        </UiButton>
      </div>
      <div class="filter-row">
        <UiSelect
          size="sm"
          v-model="query.taskStatus"
          allow-clear
          placeholder="任务状态"
          style="width: 120px"
          :options="PORTFOLIO_EVALUATION_TASK_STATUS_OPTIONS"
          @change="search"
        />
        <UiButton size="sm" :disabled="taskWriting" @click="search"> 查询 </UiButton>
      </div>
      <WorkbenchContextGateStrip
        v-if="!loadError && !loading && rows.length === 0"
        tag="无任务"
        body="当前筛选无评价任务；可在上方填写后创建，或调整筛选条件"
        cta-label="创建任务"
        @cta="createTask"
      />
      <UiDataTable
        v-else
        v-model:current="pageNum"
        v-model:page-size="pageSize"
        pagination-mode="server"
        :total="pageTotal"
        :columns="columns"
        :data-source="rows"
        :loading="loading"
        :load-error="loadError"
        row-key="id"
        @page-change="handlePageChange"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'evaluationMode'">
            {{ evaluationModeLabel(record.evaluationMode) }}
          </template>
          <template v-else-if="column.key === 'taskStatus'">
            <UiTag :tone="taskStatusTone(record.taskStatus)">
              {{ taskStatusLabel(record.taskStatus) }}
            </UiTag>
          </template>
          <template v-else-if="column.key === 'freeze'">
            <UiTag :tone="record.freezeCompleted ? 'green' : 'gray'">
              {{ record.freezeCompleted ? '已冻结' : '未冻结' }}
            </UiTag>
            <div v-if="record.freezeTime" class="text-xs text-[var(--dp-text-tertiary)]">
              {{ record.freezeTime }}
            </div>
          </template>
          <template v-else-if="column.key === 'workgroupId'">
            {{ workgroupName(record.workgroupId) }}
          </template>
          <template v-else-if="column.key === 'timeWindow'">
            <span v-if="record.startTime || record.endTime">
              {{ record.startTime ?? '—' }} ~ {{ record.endTime ?? '—' }}
            </span>
            <span v-else>—</span>
          </template>
          <template v-else-if="column.key === 'actions'">
            <UiTableActions
              :items="[
                {
                  key: 'publish',
                  label: '发布',
                  hidden: record.taskStatus === 'PUBLISHED' || record.taskStatus === 'CLOSED',
                  disabled: taskWriting,
                },
                { key: 'preview', label: '材料预览', disabled: taskWriting },
              ]"
              split
              @action="
                (key) =>
                  key === 'preview' ? openMaterialPreview(record.id) : publishTask(record.id)
              "
            />
          </template>
        </template>
      </UiDataTable>
    </UiCard>
    <UiDialog v-model:open="previewOpen" title="评价材料预览" :width="720" hide-footer>
      <div class="evaluation-task-admin__preview-bar">
        <UiSelect
          size="sm"
          v-model="previewTeacherId"
          placeholder="选择教师"
          :options="previewTeacherOptions"
          style="width: 240px"
          option-label-prop="label"
          :disabled="returning"
        />
        <UiButton
          size="sm"
          variant="primary"
          :loading="previewLoading"
          :disabled="returning"
          @click="loadMaterialPreview"
        >
          加载预览
        </UiButton>
      </div>
      <template v-if="preview">
        <p class="evaluation-task-admin__preview-meta">
          任务：{{ preview.taskName }} · 完整度 {{ preview.completenessPercent }}% · 必填分类
          {{ preview.requiredCategoryDone }} / {{ preview.requiredCategoryTotal
          }}{{ evaluationCourseArchiveMeta(preview) }}
        </p>
        <div
          v-if="preview.identityMaterialPackage"
          class="evaluation-task-admin__identity-material"
        >
          <p class="evaluation-task-admin__preview-meta">
            身份材料：正式档 {{ preview.identityMaterialPackage.officialRecordCount ?? 0 }}
            · 校内硬性可用 {{ preview.identityMaterialPackage.campusHardUsableCount ?? 0 }}
            · 仅外部 {{ preview.identityMaterialPackage.externalOnlyCount ?? 0 }}
            · 共享 {{ preview.identityMaterialPackage.sharedCount ?? 0 }}
          </p>
          <p
            v-if="preview.identityMaterialPackage.citationPolicy"
            class="evaluation-task-admin__identity-policy"
          >
            {{ preview.identityMaterialPackage.citationPolicy }}
          </p>
          <ul
            v-if="preview.identityMaterialPackage.identityLayers?.length"
            class="evaluation-task-admin__identity-layers"
          >
            <li
              v-for="(layer, idx) in preview.identityMaterialPackage.identityLayers"
              :key="layer.identityId || `${layer.identityType}-${idx}`"
            >
              <UiTag :tone="layer.externalIdentity ? 'orange' : 'blue'">
                {{ layer.identityTypeLabel || layer.identityType || '身份' }}
              </UiTag>
              <span>材料 {{ layer.materialCount ?? 0 }} 条</span>
              <span v-if="layer.externalIdentity">（外部层，不替代校内硬门槛）</span>
            </li>
          </ul>
          <UiDataTable
            v-if="preview.identityMaterialPackage.mergedMaterials?.length"
            :row-key="identityMaterialRowKey"
            size="small"
            pagination-mode="none"
            :columns="identityMaterialColumns"
            :data-source="preview.identityMaterialPackage.mergedMaterials"
            :show-pagination="false"
            :sticky-header="false"
            flat
          >
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'identityScope'">
                <UiTag :tone="identityScopeTone(record.identityScope)">
                  {{ identityScopeLabel(record.identityScope) }}
                </UiTag>
              </template>
              <template v-else-if="column.key === 'usableForCampusHardCriteria'">
                <UiTag :tone="record.usableForCampusHardCriteria ? 'green' : 'orange'">
                  {{ record.usableForCampusHardCriteria ? '校内硬性可用' : '不可作校内硬性' }}
                </UiTag>
              </template>
            </template>
          </UiDataTable>
        </div>
        <UiDataTable
          v-if="preview.categories?.length"
          :row-key="evaluationMaterialRowKey"
          size="small"
          pagination-mode="none"
          :columns="categoryColumns"
          :data-source="preview.categories"
          :show-pagination="false"
          :sticky-header="false"
          flat
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'courseScope'">
              {{ evaluationMaterialCourseScopeLabel(record) }}
            </template>
            <template v-else-if="column.key === 'completed'">
              <UiTag :tone="record.completed ? 'green' : 'orange'">
                {{ record.completed ? '已完成' : '未完成' }}
              </UiTag>
            </template>
          </template>
        </UiDataTable>
        <UiEmpty size="sm" v-else description="暂无分类明细" />
        <div v-if="previewNotice" class="evaluation-task-admin__notice">
          <div class="evaluation-task-admin__notice-meta">
            <span>材料通知</span>
            <UiTag :tone="noticeStatusTone(previewNotice.noticeStatus)">
              {{ noticeStatusLabel(previewNotice.noticeStatus) }}
            </UiTag>
            <span>截止：{{ previewNotice.dueTime ?? '—' }}</span>
          </div>
          <template v-if="canReturnNotice(previewNotice)">
            <UiTextarea
              size="sm"
              v-model="returnReason"
              :rows="3"
              placeholder="填写需补充的材料与原因"
              :disabled="returning"
            />
            <div class="evaluation-task-admin__return-actions">
              <UiDatePicker
                size="sm"
                v-model="returnDueTime"
                value-format="YYYY-MM-DD HH:mm:ss"
                :show-time="true"
                placeholder="补充截止时间"
                :disabled="returning"
              />
              <UiButton
                size="sm"
                variant="outline"
                status="warning"
                :loading="returning"
                @click="returnMaterialForSupplement"
              >
                退回补充
              </UiButton>
            </div>
          </template>
          <p v-else-if="previewNotice.returnReason" class="evaluation-task-admin__return-reason">
            退回原因：{{ previewNotice.returnReason }}
          </p>
        </div>
        <UiEmpty size="sm" v-else description="该教师当前没有评价材料通知" />
      </template>
    </UiDialog>
  </StageWorkbenchShell>
</template>

<style scoped>
.form-row,
.filter-row {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
  margin-bottom: 12px;
}
.input {
  padding: 6px 8px;
  border: 1px solid var(--dp-border);
  border-radius: 4px;
}
.input--wide {
  flex: 1;
  min-width: 200px;
}
.evaluation-task-admin__preview-bar {
  display: flex;
  gap: 8px;
  align-items: center;
  margin-bottom: 12px;
}
.evaluation-task-admin__preview-meta {
  margin: 0 0 12px;
  font-size: 13px;
  color: var(--dp-text-secondary);
}
.evaluation-task-admin__identity-material {
  margin: 0 0 12px;
  padding: 12px;
  border: 1px solid var(--dp-border-subtle);
  border-radius: 6px;
  background: var(--dp-bg-subtle);
}
.evaluation-task-admin__identity-policy {
  margin: 8px 0 0;
  font-size: 12px;
  line-height: 1.5;
  color: var(--dp-text-secondary);
}
.evaluation-task-admin__identity-layers {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 16px;
  margin: 8px 0 0;
  padding: 0;
  list-style: none;
  font-size: 13px;
  color: var(--dp-text-secondary);
}
.evaluation-task-admin__identity-layers li {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}
.evaluation-task-admin__notice {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid var(--dp-border-subtle);
}
.evaluation-task-admin__notice-meta,
.evaluation-task-admin__return-actions {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
}
.evaluation-task-admin__return-actions {
  justify-content: flex-end;
  margin-top: 12px;
  margin-bottom: 0;
}
.evaluation-task-admin__return-reason {
  margin: 12px 0 0;
  color: var(--dp-text-secondary);
}
</style>
