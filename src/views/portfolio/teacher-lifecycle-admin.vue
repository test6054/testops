<script setup lang="ts">
import type { ColumnsType } from 'ant-design-vue/es/table'
import type {PortfolioTeacherLifecycleApprovalStatusCode, PortfolioTeacherLifecycleChangeTypeCode, PortfolioTeacherLifecycleEventVO, PortfolioTeacherLifecycleStatusCode} from '@/apis/portfolio/teacher-lifecycle';
import message from 'ant-design-vue/es/message'
import { onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { FileUploadSceneKey } from '@/apis/platform/scene-keys'
import {
  PORTFOLIO_TEACHER_LIFECYCLE_CHANGE_OPTIONS,
  PORTFOLIO_TEACHER_LIFECYCLE_STATUS_LABEL,
  portfolioTeacherLifecycleApi
  
  
  
  
} from '@/apis/portfolio/teacher-lifecycle'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiCard from '@/components/ui-guide/ui/Card.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiInput from '@/components/ui-guide/ui/Input.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiForm from '@/components/ui-guide/ui/UiForm.vue'
import UiFormItem from '@/components/ui-guide/ui/UiFormItem.vue'
import UiSelect from '@/components/ui-guide/ui/UiSelect.vue'
import UiTag from '@/components/ui-guide/ui/UiTag.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import { stageBusinessFile } from '@/composables/platform/usePlatformFileStage'
import { DEFAULT_LIST_PAGE_SIZE } from '@/constants/pagination'
import { showFormValidationMessage, showUserError } from '@/utils/error-handler'
import { downloadPortfolioExcelExport } from '@/utils/portfolio-excel-export'

const router = useRouter()
const loading = ref(false)
const applying = ref(false)
const rows = ref<PortfolioTeacherLifecycleEventVO[]>([])
const total = ref(0)
const operationKey = ref('')

const query = reactive({
  pageNum: 1,
  pageSize: DEFAULT_LIST_PAGE_SIZE,
  teacherUserId: '' as string,
  changeType: undefined as PortfolioTeacherLifecycleChangeTypeCode | undefined,
  departmentId: '' as string,
  approvalStatus: undefined as PortfolioTeacherLifecycleApprovalStatusCode | undefined,
})

const approvalStatusOptions: Array<{ label: string, value: PortfolioTeacherLifecycleApprovalStatusCode }> = [
  { label: '待审批', value: 'PENDING' },
  { label: '已通过', value: 'APPROVED' },
  { label: '已驳回', value: 'REJECTED' },
  { label: '已生效', value: 'APPLIED' },
]

const applyForm = reactive({
  teacherUserId: '' as string,
  changeType: undefined as PortfolioTeacherLifecycleChangeTypeCode | undefined,
  reasonText: '' as string,
})

const changeTypeOptions = PORTFOLIO_TEACHER_LIFECYCLE_CHANGE_OPTIONS.map((item) => ({
  label: item.label,
  value: item.value,
}))

const columns: ColumnsType = [
  { title: '事件ID', dataIndex: 'id', key: 'id', width: 100 },
  { title: '教师ID', dataIndex: 'teacherUserId', key: 'teacherUserId', width: 120 },
  { title: '变更类型', key: 'changeType', width: 140 },
  { title: '状态流转', key: 'statusFlow', width: 200 },
  { title: '生效时间', dataIndex: 'effectiveTime', key: 'effectiveTime', width: 180 },
  { title: '来源', key: 'sourceType', width: 100 },
  { title: '审批', key: 'approvalStatus', width: 100 },
  { title: '原因', dataIndex: 'reasonText', key: 'reasonText', ellipsis: true },
  { title: '操作', key: 'actions', width: 200 },
]

function statusLabel(code?: string) {
  if (!code) return '—'
  return PORTFOLIO_TEACHER_LIFECYCLE_STATUS_LABEL[code as PortfolioTeacherLifecycleStatusCode] || code
}

/** 目标态是否参评 hold：与 BE holdsEvaluationTasks 对齐（ACTIVE 除外）。 */
function toStatusEvaluationHeld(code?: string): boolean {
  return Boolean(code && code !== 'ACTIVE')
}

/** 目标态是否档案写禁：TEMP_HOLD 可填报，其余非 ACTIVE 写禁。 */
function toStatusArchiveWriteForbidden(code?: string): boolean {
  return Boolean(code && code !== 'ACTIVE' && code !== 'TEMP_HOLD')
}

async function loadEvents() {
  loading.value = true
  try {
    const result = await portfolioTeacherLifecycleApi.pageEvents({
      pageNum: query.pageNum,
      pageSize: query.pageSize,
      teacherUserId: query.teacherUserId || undefined,
      changeType: query.changeType,
      departmentId: query.departmentId || undefined,
      approvalStatus: query.approvalStatus,
    })
    rows.value = result?.list ?? []
    total.value = Number(result?.total ?? 0)
  } catch (error) {
    rows.value = []
    total.value = 0
    showUserError(error, '加载生命周期事件失败')
  } finally {
    loading.value = false
  }
}

function onPageChange(pageNum: number, pageSize: number) {
  query.pageNum = pageNum
  query.pageSize = pageSize
  void loadEvents()
}

async function applyLifecycle() {
  if (!applyForm.teacherUserId || !applyForm.changeType) {
    showFormValidationMessage('请填写教师 ID 与变更类型')
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
    message.success(`已更新为${next.lifecycleStatusLabel || next.lifecycleStatus}${holdSuffix}`)
    applyForm.reasonText = ''
    await loadEvents()
  } catch (error) {
    showUserError(error, '生命周期变更失败')
  } finally {
    applying.value = false
  }
}

async function exportTransfer(teacherUserId: string | number) {
  const key = `export:${teacherUserId}`
  if (operationKey.value) return
  operationKey.value = key
  try {
    const result = await portfolioTeacherLifecycleApi.exportTransferPackage({ teacherUserId })
    if (result.fileNodeId) {
      await downloadPortfolioExcelExport({
        fileName: result.fileName || `teacher-transfer-${teacherUserId}.zip`,
        fileNodeId: String(result.fileNodeId),
      })
    }
    message.success(`迁出数据包已生成（正式档 ${result.officialRecordCount ?? 0}）`)
    await loadEvents()
  } catch (error) {
    showUserError(error, '导出迁出数据包失败')
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
    showFormValidationMessage('请先填写目标教师 ID 再导入迁出包')
    input.value = ''
    return
  }
  if (operationKey.value) {
    input.value = ''
    return
  }
  operationKey.value = `import:${applyForm.teacherUserId}`
  try {
    const uploaded = await stageBusinessFile(FileUploadSceneKey.PORTFOLIO_MATERIAL, file)
    const result = await portfolioTeacherLifecycleApi.importTransferPackage({
      targetTeacherUserId: applyForm.teacherUserId,
      fileNodeId: uploaded.id,
    })
    message.success(
      result.idempotentHit
        ? `迁出数据包已导入过（正式档 ${result.officialRecordCount ?? 0}）`
        : `迁出数据包导入成功（正式档 ${result.officialRecordCount ?? 0}）`,
    )
    await loadEvents()
  } catch (error) {
    showUserError(error, '导入迁出数据包失败')
  } finally {
    operationKey.value = ''
    input.value = ''
  }
}

async function selfDeclareLifecycle() {
  if (!applyForm.teacherUserId || !applyForm.changeType) {
    showFormValidationMessage('请填写教师 ID 与变更类型')
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
    message.success(`已提交自助申报（待审批 eventId=${event.id}）`)
    query.approvalStatus = 'PENDING'
    await loadEvents()
  } catch (error) {
    showUserError(error, '自助申报失败')
  } finally {
    applying.value = false
  }
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
    message.success(`已通过并生效：${next.lifecycleStatusLabel || next.lifecycleStatus}`)
    await loadEvents()
  } catch (error) {
    showUserError(error, '通过申报失败')
  } finally {
    operationKey.value = ''
  }
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
    message.success('已驳回自助申报')
    await loadEvents()
  } catch (error) {
    showUserError(error, '驳回申报失败')
  } finally {
    operationKey.value = ''
  }
}

function openTeacherDirectory(teacherUserId?: string | number) {
  void router.push({
    name: 'PortfolioTeacherDirectory',
    query: teacherUserId ? { teacherUserId: String(teacherUserId) } : undefined,
  })
}

onMounted(() => {
  void loadEvents()
})
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
          <UiFormItem label="教师ID">
            <UiInput v-model="applyForm.teacherUserId" placeholder="目标教师用户ID" style="width: 160px" />
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
          <UiButton variant="primary" :loading="applying" @click="applyLifecycle">管理员登记</UiButton>
          <UiButton :loading="applying" @click="selfDeclareLifecycle">自助申报</UiButton>
          <UiButton
            :disabled="!applyForm.teacherUserId || !!operationKey"
            :loading="operationKey.startsWith('export:')"
            @click="exportTransfer(applyForm.teacherUserId)"
          >
            导出迁出包
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
        <UiForm layout="inline" class="teacher-lifecycle-admin__form">
          <UiFormItem label="教师ID">
            <UiInput v-model="query.teacherUserId" placeholder="可选" style="width: 140px" />
          </UiFormItem>
          <UiFormItem label="院系ID">
            <UiInput v-model="query.departmentId" placeholder="校管可选" style="width: 140px" />
          </UiFormItem>
          <UiFormItem label="变更类型">
            <UiSelect
              v-model="query.changeType"
              allow-clear
              :options="changeTypeOptions"
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
          <UiButton variant="primary" :loading="loading" @click="() => { query.pageNum = 1; loadEvents() }">
            查询
          </UiButton>
        </UiForm>

        <UiDataTable
          :columns="columns"
          :data-source="rows"
          :loading="loading"
          :pagination="{
            current: query.pageNum,
            pageSize: query.pageSize,
            total,
            onChange: onPageChange,
          }"
          row-key="id"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'changeType'">
              {{ record.changeTypeLabel || record.changeType || '—' }}
            </template>
            <template v-else-if="column.key === 'statusFlow'">
              <span>
                {{ record.fromStatusLabel || statusLabel(record.fromStatus) }}
                →
                {{ record.toStatusLabel || statusLabel(record.toStatus) }}
              </span>
              <UiTag
                v-if="toStatusEvaluationHeld(record.toStatus)"
                tone="orange"
                class="ml-1"
              >
                参评 hold
              </UiTag>
              <UiTag
                v-if="toStatusArchiveWriteForbidden(record.toStatus)"
                tone="red"
                class="ml-1"
              >
                档案写禁
              </UiTag>
              <UiTag
                v-else-if="record.toStatus === 'TEMP_HOLD'"
                tone="green"
                class="ml-1"
              >
                档案可填报
              </UiTag>
            </template>
            <template v-else-if="column.key === 'actions'">
              <UiButton size="sm" variant="ghost" @click="openTeacherDirectory(record.teacherUserId)">
                名册
              </UiButton>
            </template>
          </template>
          <template #emptyText>
            <UiEmpty size="sm" description="暂无生命周期事件" />
          </template>
        </UiDataTable>
      </UiCard>
    </div>
  </StageWorkbenchShell>
</template>

<style scoped>
.teacher-lifecycle-admin {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.teacher-lifecycle-admin__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}
.teacher-lifecycle-admin__header h2 {
  margin: 0 0 4px;
  font-size: 20px;
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
  gap: 8px 12px;
  margin-bottom: 12px;
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
</style>
