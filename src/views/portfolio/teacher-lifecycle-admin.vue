<script setup lang="ts">
import type { ColumnsType } from 'ant-design-vue/es/table'
import type {
  PortfolioTeacherLifecycleEventVO,
} from '@/apis/portfolio/teacher-lifecycle'
import type { PortfolioTeacherSummaryVO } from '@/apis/portfolio/types'
import message from 'ant-design-vue/es/message'
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { FileUploadSceneKey } from '@/apis/platform/scene-keys'
import { portfolioSecurityApi } from '@/apis/portfolio/governance'
import { portfolioTeacherApi } from '@/apis/portfolio/teacher'
import {
  PORTFOLIO_TEACHER_LIFECYCLE_CHANGE_OPTIONS,
  portfolioTeacherLifecycleApi,
  PortfolioTeacherLifecycleStatusCode,
} from '@/apis/portfolio/teacher-lifecycle'
import {
  QUALITY_SELECTOR_PAGE_SIZE,
  QUALITY_SELECTOR_SEARCH_DEBOUNCE_MS,
} from '@/components/quality/selectors/page-contract'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiCard from '@/components/ui-guide/ui/Card.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiInput from '@/components/ui-guide/ui/Input.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiTextarea from '@/components/ui-guide/ui/Textarea.vue'
import UiAlertStrip from '@/components/ui-guide/ui/UiAlertStrip.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiDialog from '@/components/ui-guide/ui/UiDialog.vue'
import UiForm from '@/components/ui-guide/ui/UiForm.vue'
import UiFormItem from '@/components/ui-guide/ui/UiFormItem.vue'
import UiSelect from '@/components/ui-guide/ui/UiSelect.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import { stageBusinessFile } from '@/composables/platform/usePlatformFileStage'
import { usePortfolioOrgTree } from '@/composables/usePortfolioOrgTree'
import { DEFAULT_LIST_PAGE_SIZE } from '@/constants/pagination'
import { PortfolioExportTypeCode } from '@/types/enums/portfolio-export-type-enum'
import { PortfolioTeacherLifecycleApprovalStatusCode } from '@/types/enums/portfolio-teacher-lifecycle-approval-status-enum'
import { PortfolioTeacherLifecycleChangeTypeCode } from '@/types/enums/portfolio-teacher-lifecycle-change-type-enum'
import { showFormValidationMessage, showUserError } from '@/utils/error-handler'
import { portfolioLifecycleApprovalStatusDisplay, portfolioLifecycleChangeTypeDisplay, portfolioLifecycleSourceTypeDisplay, portfolioLifecycleStatusDisplay } from '@/utils/portfolio-lifecycle-tag'
import { formatPortfolioTeacherDisplay, portfolioTeacherSelectOptionsFromSummaries } from '@/utils/portfolio-teacher-display'

const route = useRoute()
const router = useRouter()
const { loadTree, departmentOptions } = usePortfolioOrgTree()
const loading = ref(false)
const loadError = ref(false)
const eventsRequestToken = ref(0)
const applying = ref(false)
const rows = ref<PortfolioTeacherLifecycleEventVO[]>([])
const total = ref(0)
const operationKey = ref('')
/** 迁出数据包导出审批用途 */
const transferExportModal = reactive({
  open: false,
  teacherUserId: '',
  purpose: '',
})
/** 站内信深链聚焦的事件 ID（eventId 查询参数）。 */
const focusedEventId = ref('')
const teachers = ref<PortfolioTeacherSummaryVO[]>([])
const teacherSearchToken = ref(0)
let teacherSearchTimer: ReturnType<typeof setTimeout> | undefined

const query = reactive({
  pageNum: 1,
  pageSize: DEFAULT_LIST_PAGE_SIZE,
  teacherUserId: undefined as string | undefined,
  changeType: undefined as PortfolioTeacherLifecycleChangeTypeCode | undefined,
  departmentId: undefined as string | undefined,
  approvalStatus: undefined as PortfolioTeacherLifecycleApprovalStatusCode | undefined,
})

const approvalStatusOptions: Array<{
  label: string
  value: PortfolioTeacherLifecycleApprovalStatusCode
}> = [
  { label: '待审批', value: PortfolioTeacherLifecycleApprovalStatusCode.PENDING },
  { label: '已通过', value: PortfolioTeacherLifecycleApprovalStatusCode.APPROVED },
  { label: '已驳回', value: PortfolioTeacherLifecycleApprovalStatusCode.REJECTED },
  { label: '已生效', value: PortfolioTeacherLifecycleApprovalStatusCode.APPLIED },
]

const applyForm = reactive({
  teacherUserId: undefined as string | undefined,
  changeType: undefined as PortfolioTeacherLifecycleChangeTypeCode | undefined,
  reasonText: '' as string,
})

/** 登记表单目标教师当前生命周期态；未加载前按 ACTIVE 过滤可选变更。 */
const applyTeacherLifecycleStatus = ref<PortfolioTeacherLifecycleStatusCode>(
  PortfolioTeacherLifecycleStatusCode.ACTIVE,
)

const changeTypeOptions = computed(() =>
  PORTFOLIO_TEACHER_LIFECYCLE_CHANGE_OPTIONS
    .filter((item) => item.from.includes(applyTeacherLifecycleStatus.value))
    .map((item) => ({
      label: item.label,
      value: item.value,
    })),
)

const queryChangeTypeOptions = PORTFOLIO_TEACHER_LIFECYCLE_CHANGE_OPTIONS.map((item) => ({
  label: item.label,
  value: item.value,
}))

const teacherSelectOptions = computed(() => portfolioTeacherSelectOptionsFromSummaries(teachers.value))
const departmentSelectOptions = computed(() => departmentOptions())

watch(
  () => applyForm.teacherUserId,
  (teacherUserId) => {
    applyForm.changeType = undefined
    if (!teacherUserId) {
      applyTeacherLifecycleStatus.value = PortfolioTeacherLifecycleStatusCode.ACTIVE
      return
    }
    void loadApplyTeacherLifecycle(teacherUserId)
  },
)

watch(changeTypeOptions, (options) => {
  if (!applyForm.changeType) {
    return
  }
  if (!options.some((item) => item.value === applyForm.changeType)) {
    applyForm.changeType = undefined
  }
})

async function loadApplyTeacherLifecycle(teacherUserId: string) {
  try {
    const state = await portfolioTeacherLifecycleApi.get({ teacherUserId })
    applyTeacherLifecycleStatus.value
      = state?.lifecycleStatus ?? PortfolioTeacherLifecycleStatusCode.ACTIVE
  } catch {
    applyTeacherLifecycleStatus.value = PortfolioTeacherLifecycleStatusCode.ACTIVE
    showFormValidationMessage('未能读取教师生命周期状态，变更类型暂按在职可选集展示')
  }
}

const columns: ColumnsType = [
  { title: '事件', dataIndex: 'id', key: 'id', width: 100 },
  { title: '教师', key: 'teacher', width: 180 },
  { title: '院系', dataIndex: 'departmentName', key: 'departmentName', width: 140 },
  { title: '变更类型', key: 'changeType', width: 140 },
  { title: '状态流转', key: 'statusFlow', width: 200 },
  { title: '生效时间', dataIndex: 'effectiveTime', key: 'effectiveTime', width: 170 },
  { title: '来源', key: 'sourceType', width: 100 },
  { title: '审批', key: 'approvalStatus', width: 100 },
  { title: '原因', dataIndex: 'reasonText', key: 'reasonText', ellipsis: true },
  { title: '操作', key: 'actions', width: 280 },
]

function statusLabel(code?: PortfolioTeacherLifecycleStatusCode) {
  if (!code) return '—'
  return portfolioLifecycleStatusDisplay(code)
}

function changeTypeLabel(code?: PortfolioTeacherLifecycleChangeTypeCode) {
  return portfolioLifecycleChangeTypeDisplay(code) || '—'
}

function sourceTypeLabel(code?: PortfolioTeacherLifecycleEventVO['sourceType']) {
  return portfolioLifecycleSourceTypeDisplay(code) || '—'
}

function approvalStatusLabel(code?: PortfolioTeacherLifecycleApprovalStatusCode) {
  return portfolioLifecycleApprovalStatusDisplay(code) || '—'
}

function teacherCellLabel(record: PortfolioTeacherLifecycleEventVO): string {
  if (record.teacherName && record.teacherNumber) {
    return formatPortfolioTeacherDisplay(record.teacherName, record.teacherNumber)
  }
  return record.teacherUserId ? String(record.teacherUserId) : '—'
}

function mergeTeacherOptions(rowsIn: PortfolioTeacherSummaryVO[]) {
  const optionMap = new Map(teachers.value.map((item) => [item.userId, item]))
  for (const row of rowsIn) {
    optionMap.set(row.userId, row)
  }
  teachers.value = Array.from(optionMap.values())
}

function keepSelectedTeacher(rowsIn: PortfolioTeacherSummaryVO[]): PortfolioTeacherSummaryVO[] {
  const selectedId = applyForm.teacherUserId || query.teacherUserId
  if (!selectedId) return rowsIn
  const selected = teachers.value.find((item) => item.userId === selectedId)
  if (!selected) return rowsIn
  if (rowsIn.some((item) => item.userId === selectedId)) return rowsIn
  return [selected, ...rowsIn]
}

async function loadTeachers(keyword?: string) {
  const currentToken = teacherSearchToken.value + 1
  teacherSearchToken.value = currentToken
  const requestKeyword = keyword?.trim() || ''
  try {
    const page = await portfolioTeacherApi.page({
      pageNum: 1,
      pageSize: QUALITY_SELECTOR_PAGE_SIZE,
      searchText: requestKeyword || undefined,
      departmentId: query.departmentId || undefined,
    })
    if (teacherSearchToken.value !== currentToken) return
    if (requestKeyword) {
      teachers.value = keepSelectedTeacher(page.list ?? [])
    } else {
      mergeTeacherOptions(page.list ?? [])
    }
  } catch (error) {
    if (teacherSearchToken.value !== currentToken) return
    showUserError(error, '加载教师名册失败')
  }
}

function handleTeacherSearch(value: string) {
  if (teacherSearchTimer) clearTimeout(teacherSearchTimer)
  teacherSearchTimer = setTimeout(() => {
    void loadTeachers(value.trim())
  }, QUALITY_SELECTOR_SEARCH_DEBOUNCE_MS)
}

/** 目标态是否参评 hold：与 BE holdsEvaluationTasks 对齐（ACTIVE 除外）。 */
function toStatusEvaluationHeld(code?: string): boolean {
  return Boolean(code && code !== 'ACTIVE')
}

/** 目标态是否档案写禁：TEMP_HOLD 可填报，其余非 ACTIVE 写禁。 */
function toStatusArchiveWriteForbidden(code?: string): boolean {
  return Boolean(code && code !== 'ACTIVE' && code !== 'TEMP_HOLD')
}

/** PF-P0-397：解析 route query 字符串参数（eventId / teacherUserId）。 */
function readRouteStringParam(value: unknown): string {
  if (typeof value === 'string') {
    return value.trim()
  }
  if (Array.isArray(value) && typeof value[0] === 'string') {
    return value[0].trim()
  }
  return ''
}

function isPendingSelfDeclare(record: PortfolioTeacherLifecycleEventVO): boolean {
  return record.approvalStatus === 'PENDING'
}

function eventRowClassName(record: PortfolioTeacherLifecycleEventVO): string {
  if (focusedEventId.value && String(record.id) === focusedEventId.value) {
    return 'teacher-lifecycle-admin__row--focus'
  }
  return ''
}

async function loadEvents(options?: { errorMessage?: string }): Promise<boolean> {
  const currentToken = eventsRequestToken.value + 1
  eventsRequestToken.value = currentToken
  loading.value = true
  loadError.value = false
  try {
    const result = await portfolioTeacherLifecycleApi.pageEvents({
      pageNum: query.pageNum,
      pageSize: query.pageSize,
      teacherUserId: query.teacherUserId || undefined,
      changeType: query.changeType,
      departmentId: query.departmentId || undefined,
      approvalStatus: query.approvalStatus,
    })
    if (eventsRequestToken.value !== currentToken) return false
    rows.value = result?.list ?? []
    total.value = Number(result?.total ?? 0)
    if (focusedEventId.value) {
      const hit = rows.value.some((row) => String(row.id) === focusedEventId.value)
      if (!hit) {
        void message.warning(`深链事件 eventId=${focusedEventId.value} 不在当前筛选结果中，请调整筛选条件`)
      }
    }
    return true
  } catch (error) {
    if (eventsRequestToken.value !== currentToken) return false
    loadError.value = true
    showUserError(error, options?.errorMessage ?? '加载生命周期事件失败')
    return false
  } finally {
    if (eventsRequestToken.value === currentToken) loading.value = false
  }
}

async function refreshEventsAfterWrite(settledLabel: string) {
  await loadEvents({ errorMessage: `${settledLabel}，事件列表刷新失败` })
}

/**
 * PF-P0-397 / PF-396：站内信 jumpUrl `/portfolio/teacher-lifecycle?eventId=&teacherUserId=`
 * 打开时自动带入筛选，便于院系立刻审批待审申报。
 */
async function applyLifecycleDeepLink() {
  const eventId = readRouteStringParam(route.query.eventId)
  const teacherUserId = readRouteStringParam(route.query.teacherUserId)
  focusedEventId.value = eventId
  if (teacherUserId) {
    query.teacherUserId = teacherUserId
    applyForm.teacherUserId = teacherUserId
  }
  if (eventId) {
    // 深链默认看待审；若用户已手动选状态则保留
    if (!query.approvalStatus) {
      query.approvalStatus = PortfolioTeacherLifecycleApprovalStatusCode.PENDING
    }
    query.pageNum = 1
  } else if (teacherUserId) {
    query.pageNum = 1
  }
  await loadEvents()
}

function onPageChange(pageNum: number, pageSize: number) {
  query.pageNum = pageNum
  query.pageSize = pageSize
  void loadEvents()
}

async function applyLifecycle() {
  if (!applyForm.teacherUserId || !applyForm.changeType) {
    showFormValidationMessage('请选择教师与变更类型')
    return
  }
  if (
    (applyForm.changeType === PortfolioTeacherLifecycleChangeTypeCode.TRANSFERRED_OUT
      || applyForm.changeType === PortfolioTeacherLifecycleChangeTypeCode.CANCEL_TRANSFER_OUT)
    && !applyForm.reasonText?.trim()
  ) {
    showFormValidationMessage(
      applyForm.changeType === PortfolioTeacherLifecycleChangeTypeCode.CANCEL_TRANSFER_OUT
        ? '撤销调出须填写原因（调令撤销文号、对方拒收或手续退回说明）'
        : '调出须填写原因（调令文号、接收单位与生效依据）',
    )
    return
  }
  if (applying.value) return
  applying.value = true
  try {
    const next = await portfolioTeacherLifecycleApi.apply({
      teacherUserId: applyForm.teacherUserId,
      changeType: applyForm.changeType,
      reasonText: applyForm.reasonText?.trim() || undefined,
    })
    const holdBits: string[] = []
    if (next.evaluationHeld) holdBits.push('参评 hold')
    if (next.archiveWriteForbidden) holdBits.push('档案写禁')
    else if (next.lifecycleStatus === 'TEMP_HOLD') holdBits.push('档案可填报')
    const holdSuffix = holdBits.length ? `（${holdBits.join(' · ')}）` : ''
    void message.success(
      `已更新为${portfolioLifecycleStatusDisplay(next.lifecycleStatus)}${holdSuffix}`,
    )
    applyTeacherLifecycleStatus.value = next.lifecycleStatus
    applyForm.changeType = undefined
    applyForm.reasonText = ''
  } catch (error) {
    showUserError(error, '生命周期变更失败')
    return
  } finally {
    applying.value = false
  }
  await refreshEventsAfterWrite('生命周期已更新')
}

async function exportTransfer(teacherUserId: string | number) {
  if (!teacherUserId) {
    showFormValidationMessage('请选择教师')
    return
  }
  transferExportModal.teacherUserId = String(teacherUserId)
  transferExportModal.purpose = ''
  transferExportModal.open = true
}

async function confirmTransferExportApply() {
  const teacherUserId = transferExportModal.teacherUserId
  const exportPurpose = transferExportModal.purpose.trim()
  if (!teacherUserId) {
    showFormValidationMessage('请选择教师')
    return Promise.reject(new Error('缺少目标教师'))
  }
  if (!exportPurpose) {
    showFormValidationMessage('请填写导出用途')
    return Promise.reject(new Error('导出用途为空'))
  }
  const key = `export:${teacherUserId}`
  if (operationKey.value) {
    return Promise.reject(new Error('操作进行中'))
  }
  operationKey.value = key
  try {
    await portfolioSecurityApi.applyExport({
      exportType: PortfolioExportTypeCode.TEACHER_TRANSFER_PACKAGE,
      businessRef: { teacherId: teacherUserId },
      exportPurpose,
    })
    transferExportModal.open = false
    void message.success('已提交迁出数据包导出审批；审批通过后生成包并推进生命周期')
    void router.push({ name: 'PortfolioExportApprovalMine' })
  } catch (error) {
    showUserError(error, '提交迁出数据包导出审批失败')
    return Promise.reject(error)
  } finally {
    operationKey.value = ''
  }
}

async function importTransferPackageFromFile(event: Event) {
  if (!(event.target instanceof HTMLInputElement)) return
  const input = event.target
  const file = input.files?.[0]
  if (!file) return
  if (!applyForm.teacherUserId) {
    showFormValidationMessage('请先选择目标教师再导入迁出包')
    input.value = ''
    return
  }
  if (operationKey.value) {
    input.value = ''
    return
  }
  const frozenTeacherUserId = applyForm.teacherUserId
  operationKey.value = `import:${frozenTeacherUserId}`
  try {
    const uploaded = await stageBusinessFile(FileUploadSceneKey.PORTFOLIO_MATERIAL, file)
    const result = await portfolioTeacherLifecycleApi.importTransferPackage({
      targetTeacherUserId: frozenTeacherUserId,
      fileNodeId: uploaded.id,
    })
    void message.success(
      result.idempotentHit
        ? `迁出数据包已导入过（正式档 ${result.officialRecordCount ?? 0}）`
        : `迁出数据包导入成功（正式档 ${result.officialRecordCount ?? 0}）`,
    )
  } catch (error) {
    showUserError(error, '导入迁出数据包失败')
    return
  } finally {
    operationKey.value = ''
    input.value = ''
  }
  await refreshEventsAfterWrite('迁出包已导入')
}

async function selfDeclareLifecycle() {
  if (!applyForm.teacherUserId || !applyForm.changeType) {
    showFormValidationMessage('请选择教师与变更类型')
    return
  }
  if (
    (applyForm.changeType === PortfolioTeacherLifecycleChangeTypeCode.TRANSFERRED_OUT
      || applyForm.changeType === PortfolioTeacherLifecycleChangeTypeCode.CANCEL_TRANSFER_OUT)
    && !applyForm.reasonText?.trim()
  ) {
    showFormValidationMessage(
      applyForm.changeType === PortfolioTeacherLifecycleChangeTypeCode.CANCEL_TRANSFER_OUT
        ? '撤销调出须填写原因（调令撤销文号、对方拒收或手续退回说明）'
        : '调出须填写原因（调令文号、接收单位与生效依据）',
    )
    return
  }
  if (applying.value) return
  applying.value = true
  try {
    const event = await portfolioTeacherLifecycleApi.selfDeclare({
      teacherUserId: applyForm.teacherUserId,
      changeType: applyForm.changeType,
      reasonText: applyForm.reasonText?.trim() || undefined,
    })
    void message.success(`已提交自助申报（待审批 eventId=${event.id}）`)
    query.approvalStatus = PortfolioTeacherLifecycleApprovalStatusCode.PENDING
  } catch (error) {
    showUserError(error, '自助申报失败')
    return
  } finally {
    applying.value = false
  }
  await refreshEventsAfterWrite('自助申报已提交')
}

async function approveDeclare(record: PortfolioTeacherLifecycleEventVO) {
  if (!record.id) return
  const key = `approve:${record.id}`
  if (operationKey.value) return
  operationKey.value = key
  try {
    const next = await portfolioTeacherLifecycleApi.approveDeclare({
      eventId: record.id,
      approvalComment: '院系确认通过',
    })
    void message.success(`已通过并生效：${portfolioLifecycleStatusDisplay(next.lifecycleStatus)}`)
  } catch (error) {
    showUserError(error, '通过申报失败')
    return
  } finally {
    operationKey.value = ''
  }
  await refreshEventsAfterWrite('申报已通过')
}

async function rejectDeclare(record: PortfolioTeacherLifecycleEventVO) {
  if (!record.id) return
  const key = `reject:${record.id}`
  if (operationKey.value) return
  operationKey.value = key
  try {
    await portfolioTeacherLifecycleApi.rejectDeclare({
      eventId: record.id,
      approvalComment: '院系驳回',
    })
    void message.success('已驳回自助申报')
  } catch (error) {
    showUserError(error, '驳回申报失败')
    return
  } finally {
    operationKey.value = ''
  }
  await refreshEventsAfterWrite('申报已驳回')
}

function openTeacherDirectory(teacherUserId?: string | number) {
  void router.push({
    name: 'PortfolioTeacherDirectory',
    query: teacherUserId ? { teacherUserId: String(teacherUserId) } : undefined,
  })
}

onMounted(async () => {
  await loadTree(false)
  await loadTeachers()
  await applyLifecycleDeepLink()
})

watch(
  () => [route.query.eventId, route.query.teacherUserId],
  (next, prev) => {
    if (JSON.stringify(next) === JSON.stringify(prev)) {
      return
    }
    void applyLifecycleDeepLink()
  },
)
</script>

<template>
  <StageWorkbenchShell>
    <div class="teacher-lifecycle-admin">
      <header class="teacher-lifecycle-admin__header">
        <div>
          <h2>教师生命周期管理</h2>
          <p>登记在职状态变更、查看院系/全校事件、导出/导入迁出数据包（§6.21 / §7.26.15）。</p>
        </div>
        <UiButton size="sm" @click="openTeacherDirectory()">打开教师名册</UiButton>
      </header>

      <UiCard class="teacher-lifecycle-admin__card" title="登记生命周期变更">
        <UiForm layout="inline" class="teacher-lifecycle-admin__form">
          <UiFormItem label="教师">
            <UiSelect
              v-model="applyForm.teacherUserId"
              allow-search
              :options="teacherSelectOptions"
              placeholder="搜索姓名/工号"
              style="min-width: 220px"
              @search="handleTeacherSearch"
            />
          </UiFormItem>
          <UiFormItem label="变更类型">
            <UiSelect
              v-model="applyForm.changeType"
              :options="changeTypeOptions"
              placeholder="选择变更"
              style="min-width: 200px"
            />
          </UiFormItem>
          <UiFormItem label="原因">
            <UiInput v-model="applyForm.reasonText" placeholder="可选" style="width: 220px" />
          </UiFormItem>
          <UiButton variant="primary" :loading="applying" @click="applyLifecycle">
            管理员登记
          </UiButton>
          <UiButton :loading="applying" @click="selfDeclareLifecycle">自助申报</UiButton>
          <UiButton
            :disabled="!applyForm.teacherUserId || !!operationKey"
            :loading="operationKey.startsWith('export:')"
            @click="exportTransfer(applyForm.teacherUserId!)"
          >
            申请导出迁出包
          </UiButton>
          <label class="teacher-lifecycle-admin__import">
            <span class="teacher-lifecycle-admin__import-btn">
              <UiButton variant="primary" size="sm" :loading="operationKey.startsWith('import:')">导入迁出包</UiButton>
            </span>
            <input
              class="teacher-lifecycle-admin__import-input"
              type="file"
              accept=".zip,application/zip"
              :disabled="!!operationKey"
              @change="importTransferPackageFromFile"
            />
          </label>
        </UiForm>
      </UiCard>

      <UiCard class="teacher-lifecycle-admin__card" title="生命周期事件">
        <UiAlertStrip
          v-if="loadError"
          tone="error"
          dense
          :inline="false"
          title="事件列表加载失败"
          style="margin-bottom: var(--dp-space-component)"
        />
        <UiForm layout="inline" class="teacher-lifecycle-admin__form">
          <UiFormItem label="教师">
            <UiSelect
              v-model="query.teacherUserId"
              allow-clear
              allow-search
              :options="teacherSelectOptions"
              placeholder="全部"
              style="min-width: 220px"
              @search="handleTeacherSearch"
            />
          </UiFormItem>
          <UiFormItem label="院系">
            <UiSelect
              v-model="query.departmentId"
              allow-clear
              allow-search
              :options="departmentSelectOptions"
              placeholder="校管可选"
              style="min-width: 200px"
            />
          </UiFormItem>
          <UiFormItem label="变更类型">
            <UiSelect
              v-model="query.changeType"
              allow-clear
              :options="queryChangeTypeOptions"
              placeholder="全部"
              style="min-width: 180px"
            />
          </UiFormItem>
          <UiFormItem label="审批状态">
            <UiSelect
              v-model="query.approvalStatus"
              allow-clear
              :options="approvalStatusOptions"
              placeholder="全部"
              style="min-width: 140px"
            />
          </UiFormItem>
          <UiButton
            variant="primary"
            :loading="loading"
            @click="
              () => {
                query.pageNum = 1
                void loadEvents()
              }
            "
          >
            查询
          </UiButton>
        </UiForm>

        <UiDataTable
          :columns="columns"
          :data-source="rows"
          :loading="loading"
          :load-error="loadError"
          :pagination="{
            current: query.pageNum,
            pageSize: query.pageSize,
            total,
            onChange: onPageChange,
          }"
          row-key="id"
          :row-class-name="eventRowClassName"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'teacher'">
              {{ teacherCellLabel(record) }}
            </template>
            <template v-else-if="column.key === 'departmentName'">
              {{ record.departmentName || '—' }}
            </template>
            <template v-else-if="column.key === 'changeType'">
              {{ changeTypeLabel(record.changeType) }}
            </template>
            <template v-else-if="column.key === 'statusFlow'">
              <span>
                {{ statusLabel(record.fromStatus) }}
                →
                {{ statusLabel(record.toStatus) }}
              </span>
              <UiTag v-if="toStatusEvaluationHeld(record.toStatus)" tone="orange" class="ml-1">
                参评 hold
              </UiTag>
              <UiTag v-if="toStatusArchiveWriteForbidden(record.toStatus)" tone="red" class="ml-1">
                档案写禁
              </UiTag>
              <UiTag v-else-if="record.toStatus === 'TEMP_HOLD'" tone="green" class="ml-1">
                档案可填报
              </UiTag>
            </template>
            <template v-else-if="column.key === 'sourceType'">
              {{ sourceTypeLabel(record.sourceType) }}
            </template>
            <template v-else-if="column.key === 'approvalStatus'">
              <UiTag
                v-if="record.approvalStatus === 'PENDING'"
                tone="orange"
              >
                {{ approvalStatusLabel(record.approvalStatus) }}
              </UiTag>
              <UiTag
                v-else-if="record.approvalStatus === 'APPROVED' || record.approvalStatus === 'APPLIED'"
                tone="green"
              >
                {{ approvalStatusLabel(record.approvalStatus) }}
              </UiTag>
              <UiTag
                v-else-if="record.approvalStatus === 'REJECTED'"
                tone="red"
              >
                {{ approvalStatusLabel(record.approvalStatus) }}
              </UiTag>
              <span v-else>{{ approvalStatusLabel(record.approvalStatus) }}</span>
            </template>
            <template v-else-if="column.key === 'actions'">
              <div class="teacher-lifecycle-admin__actions">
                <UiButton
                  v-if="isPendingSelfDeclare(record)"
                  size="sm"
                  variant="primary"
                  :loading="operationKey === `approve:${record.id}`"
                  :disabled="!!operationKey && operationKey !== `approve:${record.id}`"
                  @click="approveDeclare(record)"
                >
                  通过
                </UiButton>
                <UiButton
                  v-if="isPendingSelfDeclare(record)"
                  size="sm"
                  variant="outline"
                  :loading="operationKey === `reject:${record.id}`"
                  :disabled="!!operationKey && operationKey !== `reject:${record.id}`"
                  @click="rejectDeclare(record)"
                >
                  驳回
                </UiButton>
                <UiButton
                  size="sm"
                  variant="ghost"
                  @click="openTeacherDirectory(record.teacherUserId)"
                >
                  名册
                </UiButton>
              </div>
            </template>
          </template>
          <template #emptyText>
            <UiEmpty size="sm" description="暂无生命周期事件" />
          </template>
        </UiDataTable>
      </UiCard>
    </div>
    <UiDialog
      v-model:open="transferExportModal.open"
      title="申请导出迁出数据包"
      ok-text="提交审批"
      cancel-text="取消"
      :confirm-loading="operationKey.startsWith('export:')"
      @ok="confirmTransferExportApply"
    >
      <UiTextarea
        size="sm"
        v-model="transferExportModal.purpose"
        :rows="3"
        placeholder="请填写导出用途（必填，将写入审批记录）"
      />
    </UiDialog>
  </StageWorkbenchShell>
</template>

<style scoped>
.teacher-lifecycle-admin {
  display: flex;
  flex-direction: column;
  gap: var(--dp-space-block);
}
.teacher-lifecycle-admin__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--dp-space-block);
}
.teacher-lifecycle-admin__header h2 {
  margin: 0 0 var(--dp-space-component-xs);
  font-size: var(--dp-font-size-2xl);
  font-weight: 600;
}
.teacher-lifecycle-admin__header p {
  margin: 0;
  color: var(--dp-text-secondary);
}
.teacher-lifecycle-admin__card {
  width: 100%;
}
.teacher-lifecycle-admin__form {
  display: flex;
  flex-wrap: wrap;
  gap: var(--dp-space-component-tight) var(--dp-space-component);
  margin-bottom: var(--dp-space-component);
  align-items: center;
}
.teacher-lifecycle-admin__import {
  position: relative;
  display: inline-flex;
  cursor: pointer;
}
.teacher-lifecycle-admin__import-input {
  position: absolute;
  inset: 0;
  opacity: 0;
  cursor: pointer;
}
.teacher-lifecycle-admin__actions {
  display: inline-flex;
  flex-wrap: wrap;
  gap: var(--dp-space-component-xs);
  align-items: center;
}
:deep(.teacher-lifecycle-admin__row--focus > td) {
  background: color-mix(in srgb, var(--dp-color-primary) 10%, transparent);
}
</style>
