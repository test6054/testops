<script setup lang="ts">
import type {
  PortfolioArchiveRecordFieldInput,
  PortfolioGapTaskDetailVO,
} from '@/apis/portfolio/types'
import type { ScanDispatchResultPayload } from '@/views/teacher/archive-volume/components/ScanDispatchResultDialog.vue'
import ScanDispatchResultDialog from '@/views/teacher/archive-volume/components/ScanDispatchResultDialog.vue'
import message from 'ant-design-vue/es/message'
import { computed, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { buildScanDispatchKioskUrl, createScanDispatch } from '@/apis/mark/scanner-dispatch'
import { PortfolioCollectModeCode, ScanTaskKindCode } from '@/apis/mark/scanner-work-order'
import { FileUploadSceneKey } from '@/apis/platform/scene-keys'
import { portfolioArchiveApi } from '@/apis/portfolio/archive'
import {
  PortfolioGapTaskStatusCode,
  PortfolioGapTaskStatusDescription,
} from '@/apis/portfolio/enums'
import { portfolioGapApi } from '@/apis/portfolio/gap'
import UiPlatformFileField from '@/components/platform/UiPlatformFileField.vue'
import PortfolioTeacherPickGate from '@/components/portfolio/PortfolioTeacherPickGate.vue'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiCard from '@/components/ui-guide/ui/Card.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiInput from '@/components/ui-guide/ui/Input.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiAlertStrip from '@/components/ui-guide/ui/UiAlertStrip.vue'
import UiForm from '@/components/ui-guide/ui/UiForm.vue'
import UiFormItem from '@/components/ui-guide/ui/UiFormItem.vue'
import UiSpin from '@/components/ui-guide/ui/UiSpin.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import { usePortfolioArchiveWriteGuard } from '@/composables/usePortfolioArchiveWriteGuard'
import {
  usePortfolioPageScope,
  usePortfolioScopedLoader,
} from '@/composables/usePortfolioPageScope'
import { usePortfolioProxyWriteGuard } from '@/composables/usePortfolioProxyWriteGuard'
import { showFormValidationMessage, showUserError } from '@/utils/error-handler'
import { strictEnumLabel } from '@/utils/strict-enum'
import PortfolioOwnerIdentityLayersCell from '@/views/portfolio/components/PortfolioOwnerIdentityLayersCell.vue'

function gapTaskStatusLabel(status: PortfolioGapTaskStatusCode): string {
  return strictEnumLabel(PortfolioGapTaskStatusDescription, status, '补采任务状态')
}

function readRouteParamString(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

const route = useRoute()
const router = useRouter()
const { targetTeacherId, canPickTeachers } = usePortfolioPageScope()
const { confirmProxyWrite } = usePortfolioProxyWriteGuard()
const { archiveWriteForbidden, archiveWriteBlockMessage, assertArchiveWritable } =
  usePortfolioArchiveWriteGuard()

function lifecycleTagTone(status?: string): 'green' | 'orange' | 'gray' | 'red' {
  if (status === 'ACTIVE') return 'green'
  if (status === 'TEMP_HOLD') return 'orange'
  if (status === 'SEALED' || status === 'TRANSFERRED') return 'red'
  return 'gray'
}

const loading = ref(false)
const submitting = ref(false)
const saving = ref(false)
const scanOpening = ref(false)
const dispatchResultOpen = ref(false)
const dispatchResult = ref<ScanDispatchResultPayload | null>(null)
const detail = ref<PortfolioGapTaskDetailVO | null>(null)
const fieldValues = reactive<Record<string, string>>({})
const evidenceRefs = reactive<Record<string, string>>({})
const attachmentFileNodeId = ref<string>()
const attachmentFileName = ref<string>()
const scopeRequestToken = ref(0)

const gapTaskId = computed(() => readRouteParamString(route.params.taskId))
const teacherRequest = computed(() =>
  targetTeacherId.value ? { teacherId: targetTeacherId.value } : {},
)

const statusLabel = computed(() =>
  detail.value ? gapTaskStatusLabel(detail.value.taskStatus) : '',
)

const courseScopeText = computed(() => {
  if (!detail.value?.courseCode) {
    return ''
  }
  const parts = [detail.value.courseCode]
  if (detail.value.academicYear) {
    parts.push(detail.value.academicYear)
  }
  if (detail.value.semester) {
    parts.push(`第${detail.value.semester}学期`)
  }
  return parts.join(' · ')
})

const gapSubmissionAvailable = computed(() => {
  if (!detail.value) {
    return false
  }
  if (
    detail.value.taskStatus !== PortfolioGapTaskStatusCode.PENDING &&
    detail.value.taskStatus !== PortfolioGapTaskStatusCode.RETURNED
  ) {
    return false
  }
  if (!detail.value.dueTime) {
    return true
  }
  return new Date(detail.value.dueTime.replace(' ', 'T')).getTime() > Date.now()
})

const formWritable = computed(() => gapSubmissionAvailable.value && !archiveWriteForbidden.value)

/** 清空当前补采表单；请求代际只由加载入口统一推进。 */
function resetFormState(): void {
  for (const key of Object.keys(fieldValues)) {
    delete fieldValues[key]
  }
  for (const key of Object.keys(evidenceRefs)) {
    delete evidenceRefs[key]
  }
  attachmentFileNodeId.value = undefined
  attachmentFileName.value = undefined
  dispatchResultOpen.value = false
  dispatchResult.value = null
}

/** 按当前教师与补采任务加载详情，旧范围响应不得写回。 */
async function loadTask(): Promise<void> {
  const requestToken = scopeRequestToken.value + 1
  scopeRequestToken.value = requestToken
  if (!gapTaskId.value) {
    detail.value = null
    resetFormState()
    loading.value = false
    return
  }
  loading.value = true
  detail.value = null
  resetFormState()
  try {
    const task = await portfolioGapApi.getTask(gapTaskId.value)
    if (scopeRequestToken.value !== requestToken) {
      return
    }
    detail.value = task
    for (const field of task.missingFields) {
      fieldValues[field.fieldCode] = field.currentValue ?? ''
      evidenceRefs[field.fieldCode] = ''
    }
    if (task.courseCode) {
      fieldValues.courseCode = task.courseCode
    }
    if (task.academicYear) {
      fieldValues.academicYear = task.academicYear
    }
    if (task.semester) {
      fieldValues.semester = task.semester
    }
  } catch (error) {
    if (scopeRequestToken.value !== requestToken) {
      return
    }
    showUserError(error, '加载补采任务失败')
  } finally {
    if (scopeRequestToken.value === requestToken) {
      loading.value = false
    }
  }
}

function buildFieldInputs(): PortfolioArchiveRecordFieldInput[] {
  if (!detail.value) {
    return []
  }
  const inputs = detail.value.missingFields.map((field) => ({
    fieldCode: field.fieldCode,
    fieldValue: fieldValues[field.fieldCode] ?? '',
    evidenceRef: evidenceRefs[field.fieldCode] || undefined,
  }))
  const fieldCodes = new Set(inputs.map((item) => item.fieldCode))
  if (detail.value.courseCode && !fieldCodes.has('courseCode')) {
    inputs.push({
      fieldCode: 'courseCode',
      fieldValue: detail.value.courseCode,
      evidenceRef: undefined,
    })
  }
  if (detail.value.academicYear && !fieldCodes.has('academicYear')) {
    inputs.push({
      fieldCode: 'academicYear',
      fieldValue: detail.value.academicYear,
      evidenceRef: undefined,
    })
  }
  if (detail.value.semester && !fieldCodes.has('semester')) {
    inputs.push({
      fieldCode: 'semester',
      fieldValue: detail.value.semester,
      evidenceRef: undefined,
    })
  }
  return inputs
}

async function handleSaveDraft() {
  if (!detail.value || !formWritable.value) {
    return
  }
  if (!assertArchiveWritable()) {
    return
  }
  if (!(await confirmProxyWrite('补齐档案缺口草稿'))) {
    return
  }

  const requestToken = scopeRequestToken.value
  saving.value = true
  try {
    await portfolioArchiveApi.saveDraft({
      ...teacherRequest.value,
      recordId: detail.value.archiveRecordId,
      categoryId: detail.value.categoryId,
      fields: buildFieldInputs(),
    })
    if (scopeRequestToken.value !== requestToken) {
      return
    }
    void message.success('草稿已保存')
    saving.value = false
    await loadTask()
  } catch (error) {
    if (scopeRequestToken.value !== requestToken) {
      return
    }
    showUserError(error, '保存草稿失败')
  } finally {
    if (scopeRequestToken.value === requestToken) {
      saving.value = false
    }
  }
}

async function handleSubmit() {
  if (!detail.value || !gapSubmissionAvailable.value) {
    showFormValidationMessage('补采任务已逾期或已结束，请联系院系办理延期')
    return
  }
  if (!assertArchiveWritable()) {
    return
  }
  if (!(await confirmProxyWrite('提交补采'))) {
    return
  }
  const requestToken = scopeRequestToken.value
  submitting.value = true
  try {
    await portfolioGapApi.submitTask({
      gapTaskId: detail.value.id,
      ...teacherRequest.value,
      fileNodeId: attachmentFileNodeId.value,
      fields: buildFieldInputs(),
    })
    if (scopeRequestToken.value !== requestToken) {
      return
    }
    void message.success('补采已提交审核')
    void router.push({
      path: '/portfolio/teacher/home',
      query: targetTeacherId.value ? { teacherId: targetTeacherId.value } : {},
    })
  } catch (error) {
    if (scopeRequestToken.value !== requestToken) {
      return
    }
    showUserError(error, '提交补采失败')
  } finally {
    if (scopeRequestToken.value === requestToken) {
      submitting.value = false
    }
  }
}

function goBack() {
  void router.push({
    path: '/portfolio/teacher/home',
    query: targetTeacherId.value ? { teacherId: targetTeacherId.value } : {},
  })
}

async function openPortfolioGapScan() {
  if (!detail.value || !targetTeacherId.value) {
    showFormValidationMessage('补采任务或教师信息未就绪')
    return
  }
  if (!gapSubmissionAvailable.value) {
    showFormValidationMessage('补采任务已逾期或已结束，不能创建扫描派单')
    return
  }
  if (!assertArchiveWritable()) {
    return
  }
  const requestToken = scopeRequestToken.value
  scanOpening.value = true
  try {
    const created = await createScanDispatch({
      taskKind: ScanTaskKindCode.PORTFOLIO_COLLECT,
      collectMode: PortfolioCollectModeCode.GAP_ATTACHMENT,
      teacherId: targetTeacherId.value,
      gapTaskId: detail.value.id,
      categoryId: detail.value.categoryId,
    })
    const ticket = created.ticket
    if (!ticket?.ticketId) {
      if (scopeRequestToken.value !== requestToken) {
        return
      }
      showUserError(null, '创建档案袋派单失败')
      return
    }
    if (scopeRequestToken.value !== requestToken) {
      return
    }
    dispatchResult.value = {
      ticketId: ticket.ticketId,
      kioskUrl: buildScanDispatchKioskUrl(ticket, route.fullPath),
      status: ticket.status,
      taskKind: ScanTaskKindCode.PORTFOLIO_COLLECT,
      contextLabel: ticket.portfolioSnapshot?.gapTaskTitle ?? detail.value.taskTitle,
      gapTaskId: detail.value.id,
      canCancelTicket: ticket.canCancelTicket,
    }
    dispatchResultOpen.value = true
  } catch (error) {
    if (scopeRequestToken.value !== requestToken) {
      return
    }
    showUserError(error, '创建档案袋扫描派单失败')
  } finally {
    if (scopeRequestToken.value === requestToken) {
      scanOpening.value = false
    }
  }
}

usePortfolioScopedLoader(
  () => {
    void loadTask()
  },
  () => `${targetTeacherId.value}:${gapTaskId.value}`,
)

watch(
  () => route.query.scanCommitted,
  async (value) => {
    if (value !== '1') {
      return
    }
    const fileNodeId =
      typeof route.query.scanFileNodeId === 'string' ? route.query.scanFileNodeId : ''
    const nextQuery = { ...route.query }
    delete nextQuery.scanCommitted
    delete nextQuery.scanFileNodeId
    void router.replace({ path: route.path, query: nextQuery })
    await loadTask()
    if (!detail.value) {
      return
    }
    if (fileNodeId) {
      attachmentFileNodeId.value = fileNodeId
    }
  },
  { immediate: true },
)
</script>

<template>
  <StageWorkbenchShell>
    <template #context>
      <ContextBar show-title layout="workbench" :title="detail?.taskTitle ?? '补采任务'">
        <template #actions>
          <UiButton size="sm" variant="ghost" @click="goBack"> 返回首页 </UiButton>
          <template v-if="!(canPickTeachers && !targetTeacherId)">
            <UiButton
              size="sm"
              variant="outline"
              :loading="saving"
              :disabled="loading || !formWritable"
              @click="handleSaveDraft"
            >
              保存草稿
            </UiButton>
            <UiButton
              size="sm"
              variant="primary"
              :loading="submitting"
              :disabled="loading || !formWritable"
              @click="handleSubmit"
            >
              提交补采
            </UiButton>
          </template>
        </template>
      </ContextBar>
    </template>

    <PortfolioTeacherPickGate v-if="canPickTeachers && !targetTeacherId" />
    <template v-else>
      <UiAlertStrip
        v-if="archiveWriteForbidden"
        tone="warning"
        title="档案已封存写禁"
        :description="archiveWriteBlockMessage"
        class="mb-3"
      />
      <UiSpin :spinning="loading">
        <template v-if="detail">
          <p class="teacher-gap__meta">
            <UiTag tone="blue">
              {{ statusLabel }}
            </UiTag>
            <UiTag v-if="detail.lifecycleStatus" :tone="lifecycleTagTone(detail.lifecycleStatus)">
              {{ detail.lifecycleStatusLabel || detail.lifecycleStatus }}
            </UiTag>
            <UiTag v-if="detail.evaluationHeld" tone="orange" class="ml-1">参评 hold</UiTag>
            <UiTag v-if="detail.countsInCurrentFacultyStructure === false" tone="gray">
              非当前在岗
            </UiTag>
            <PortfolioOwnerIdentityLayersCell
              v-if="detail.ownerIdentityLayers?.length"
              class="teacher-gap__identity"
              :layers="detail.ownerIdentityLayers"
              :note="detail.ownerMultiIdentityNote"
            />
            <span v-if="detail.categoryName">{{ detail.categoryName }}</span>
            <span v-if="courseScopeText">课程 {{ courseScopeText }}</span>
            <span v-if="detail.dueTime">截止 {{ detail.dueTime }}</span>
          </p>
          <p v-if="detail.returnReason" class="teacher-gap__return">
            退回原因：{{ detail.returnReason }}
          </p>
          <UiCard v-if="detail.missingFields.length" title="必填字段补采">
            <UiForm layout="vertical">
              <UiFormItem label="补交附件">
                <UiPlatformFileField
                  v-model:file-node-id="attachmentFileNodeId"
                  v-model:file-name="attachmentFileName"
                  :disabled="!formWritable"
                  :scene-key="FileUploadSceneKey.PORTFOLIO_MATERIAL"
                  accept=".pdf,.doc,.docx,.png,.jpg"
                  button-text="上传附件"
                />
                <UiButton
                  size="sm"
                  class="teacher-gap__scan-btn"
                  variant="outline"
                  :loading="scanOpening"
                  :disabled="!formWritable"
                  @click="openPortfolioGapScan"
                >
                  一体机扫描
                </UiButton>
              </UiFormItem>
              <UiFormItem
                v-for="field in detail.missingFields"
                :key="field.fieldCode"
                :label="field.fieldLabel ?? field.fieldCode"
                :required="field.missing"
              >
                <UiInput
                  v-model="fieldValues[field.fieldCode]"
                  size="sm"
                  :disabled="!formWritable"
                  placeholder="必填"
                />
                <UiInput
                  v-model="evidenceRefs[field.fieldCode]"
                  size="sm"
                  class="teacher-gap__evidence"
                  :disabled="!formWritable"
                  placeholder="证据引用（可选）"
                />
              </UiFormItem>
            </UiForm>
          </UiCard>
          <UiEmpty v-else size="sm" description="该分类必填字段已补全，可直接提交或返回首页" />
        </template>
      </UiSpin>
    </template>

    <ScanDispatchResultDialog
      v-model:open="dispatchResultOpen"
      :payload="dispatchResult"
      :task-kind="ScanTaskKindCode.PORTFOLIO_COLLECT"
    />
  </StageWorkbenchShell>
</template>

<style scoped lang="scss">
.teacher-gap__meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--dp-space-2);
  margin: 0 0 var(--dp-space-4);
  font-size: 14px;
  color: var(--dp-text-secondary);
}

.teacher-gap__return {
  margin: 0 0 var(--dp-space-4);
  font-size: 14px;
  color: var(--dp-warning);
}

.teacher-gap__evidence {
  margin-top: var(--dp-space-2);
}

.teacher-gap__scan-btn {
  margin-top: var(--dp-space-2);
}

.teacher-gap__file-id {
  margin-left: var(--dp-space-2);
  font-size: 12px;
  color: var(--dp-text-secondary);
}
</style>
