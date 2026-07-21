<script setup lang="ts">
import type { PortfolioDualTeacherApplicationVO } from '@/apis/portfolio/teacher-platform'
import message from 'ant-design-vue/es/message'
import { computed, reactive, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { FileUploadSceneKey } from '@/apis/platform/scene-keys'
import {
  PortfolioDualTeacherApplicationStatusCode,
  PortfolioDualTeacherApplicationStatusDescription,
} from '@/apis/portfolio/enums'
import { portfolioDualTeacherApi } from '@/apis/portfolio/teacher-platform'
import PortfolioTeacherPickGate from '@/components/portfolio/PortfolioTeacherPickGate.vue'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiCard from '@/components/ui-guide/ui/Card.vue'
import UiInput from '@/components/ui-guide/ui/Input.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiAlertStrip from '@/components/ui-guide/ui/UiAlertStrip.vue'
import UiForm from '@/components/ui-guide/ui/UiForm.vue'
import UiFormItem from '@/components/ui-guide/ui/UiFormItem.vue'
import UiInputNumber from '@/components/ui-guide/ui/UiInputNumber.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import { stageBusinessFile } from '@/composables/platform/usePlatformFileStage'
import { usePortfolioArchiveWriteGuard } from '@/composables/usePortfolioArchiveWriteGuard'
import { usePortfolioPageScope } from '@/composables/usePortfolioPageScope'
import { showFormValidationMessage, showUserError } from '@/utils/error-handler'
import { strictEnumLabel } from '@/utils/strict-enum'
import PortfolioOwnerIdentityLayersCell from '@/views/portfolio/components/PortfolioOwnerIdentityLayersCell.vue'

const route = useRoute()
const { targetTeacherId, canPickTeachers, currentUserId } = usePortfolioPageScope()
const { archiveWriteForbidden, archiveWriteBlockMessage, assertArchiveWritable }
  = usePortfolioArchiveWriteGuard()

/** 管理员代办：可代写草稿，不可把申请错绑到操作人本人。 */
const isProxyMode = computed(() =>
  Boolean(
    canPickTeachers.value && targetTeacherId.value && targetTeacherId.value !== currentUserId.value,
  ),
)

function readRouteStringParam(value: unknown): string {
  if (typeof value === 'string') {
    return value.trim()
  }
  if (Array.isArray(value) && typeof value[0] === 'string') {
    return value[0].trim()
  }
  return ''
}
const saving = ref(false)
const submitting = ref(false)
interface AttachmentItem {
  fileNodeId: string
  fileName: string
}

const attachmentItems = ref<AttachmentItem[]>([])
const attachmentInputRef = ref<HTMLInputElement | null>(null)
const uploading = ref(false)
const application = ref<PortfolioDualTeacherApplicationVO | null>(null)
const applicationRequestToken = ref(0)
const applicationFormEpoch = ref(0)
const operationPending = computed(() => saving.value || submitting.value || uploading.value)

const form = reactive({
  id: '',
  certLevel: '',
  certYear: String(new Date().getFullYear()),
  enterprisePracticeDays: 0,
})

/** 申请单作用域变化时清空旧表单，避免旧加载结果回写当前申请页。 */
function resetApplicationContext(): void {
  applicationRequestToken.value += 1
  applicationFormEpoch.value += 1
  saving.value = false
  submitting.value = false
  uploading.value = false
  application.value = null
  form.id = ''
  form.certLevel = ''
  form.certYear = String(new Date().getFullYear())
  form.enterprisePracticeDays = 0
  attachmentItems.value = []
}

function statusLabel(status: PortfolioDualTeacherApplicationVO['applicationStatus']) {
  return strictEnumLabel(PortfolioDualTeacherApplicationStatusDescription, status, '双师申请状态')
}

const canEdit = computed(() => {
  if (archiveWriteForbidden.value) {
    return false
  }
  const status = application.value?.applicationStatus
  if (!status) {
    return true
  }
  // 驳回或已通过后可发起新单：清空 form.id 后进入可编辑
  if (
    status === PortfolioDualTeacherApplicationStatusCode.REJECTED
    || status === PortfolioDualTeacherApplicationStatusCode.APPROVED
  ) {
    return !form.id
  }
  return (
    status === PortfolioDualTeacherApplicationStatusCode.DRAFT
    || status === PortfolioDualTeacherApplicationStatusCode.COLLEGE_RETURNED
    || status === PortfolioDualTeacherApplicationStatusCode.ACADEMIC_RETURNED
  )
})

/** 已认定通过且仍绑定旧单时，允许发起年度复核（新建申请）。 */
const canStartReReview = computed(() => {
  return (
    application.value?.applicationStatus === PortfolioDualTeacherApplicationStatusCode.APPROVED
    && !!form.id
    && !operationPending.value
  )
})

/** 复核填写中：已通过态下已清空申请主键，尚未保存新草稿。 */
const reReviewDrafting = computed(() => {
  return (
    application.value?.applicationStatus === PortfolioDualTeacherApplicationStatusCode.APPROVED
    && !form.id
  )
})

/** 清空主键与材料，进入复核新建；字段预填最近一次认定结果供修改。 */
function startReReview() {
  if (!canStartReReview.value) {
    return
  }
  applicationFormEpoch.value += 1
  form.id = ''
  form.certLevel = application.value?.certLevel ?? ''
  form.certYear = String(new Date().getFullYear())
  form.enterprisePracticeDays = application.value?.enterprisePracticeDays ?? 0
  attachmentItems.value = []
  void message.info('已进入复核申请，保存草稿将创建新申请单')
}

const canSubmit = computed(() => {
  if (!canEdit.value || operationPending.value) {
    return false
  }
  if (!form.certLevel.trim()) {
    return false
  }
  return /^\d{4}$/.test(form.certYear.trim())
})

/**
 * PF-P0-287：按 page-scope 目标教师加载申请；优先消费 applicationId 深链，禁止把代办绑到操作人本人。
 */
async function loadApplication() {
  const currentToken = ++applicationRequestToken.value
  const teacherId = targetTeacherId.value
  if (!teacherId) {
    resetApplicationContext()
    return
  }
  try {
    const deepLinkedApplicationId = readRouteStringParam(route.query.applicationId)
    let detail: PortfolioDualTeacherApplicationVO | null = null
    if (deepLinkedApplicationId) {
      detail = await portfolioDualTeacherApi.get({ id: deepLinkedApplicationId })
      if (currentToken !== applicationRequestToken.value) {
        return
      }
      if (detail.teacherUserId !== teacherId) {
        showFormValidationMessage('深链申请单与当前目标教师不一致，已忽略该申请单')
        detail = null
      }
    }
    if (!detail) {
      const page = await portfolioDualTeacherApi.page({
        pageNum: 1,
        pageSize: 1,
        teacherUserId: teacherId,
      })
      if (currentToken !== applicationRequestToken.value) {
        return
      }
      const mine = page.list?.[0]
      if (!mine) {
        // 保留 token 递增后的空表单，允许新建
        application.value = null
        form.id = ''
        form.certLevel = ''
        form.certYear = String(new Date().getFullYear())
        form.enterprisePracticeDays = 0
        attachmentItems.value = []
        return
      }
      detail = await portfolioDualTeacherApi.get({ id: mine.id })
      if (currentToken !== applicationRequestToken.value) {
        return
      }
    }
    application.value = detail
    if (
      application.value.applicationStatus === PortfolioDualTeacherApplicationStatusCode.REJECTED
    ) {
      form.id = ''
      form.certLevel = application.value.certLevel ?? ''
      form.certYear = application.value.certYear ?? form.certYear
      form.enterprisePracticeDays = application.value.enterprisePracticeDays ?? 0
      attachmentItems.value = []
      return
    }
    form.id = application.value.id
    form.certLevel = application.value.certLevel ?? ''
    form.certYear = application.value.certYear ?? form.certYear
    form.enterprisePracticeDays = application.value.enterprisePracticeDays ?? 0
    attachmentItems.value = (application.value.attachmentFileIds ?? []).map((fileNodeId) => ({
      fileNodeId,
      fileName: fileNodeId,
    }))
  } catch (error) {
    if (currentToken !== applicationRequestToken.value) {
      return
    }
    resetApplicationContext()
    showUserError(error, '加载双师认定申请失败')
  }
}

function openAttachmentPicker() {
  attachmentInputRef.value?.click()
}

/** 上传结果绑定教师、申请单和表单代际，旧申请附件不得追加到新表单。 */
async function onAttachmentPick(event: Event): Promise<void> {
  if (!(event.target instanceof HTMLInputElement)) {
    return
  }
  const input = event.target
  const files = input.files
  if (!files?.length) {
    return
  }
  if (!canEdit.value || operationPending.value) {
    input.value = ''
    return
  }
  const context = {
    teacherId: targetTeacherId.value,
    applicationId: form.id || undefined,
    epoch: applicationFormEpoch.value,
  }
  uploading.value = true
  try {
    for (const file of Array.from(files)) {
      const uploaded = await stageBusinessFile(FileUploadSceneKey.PORTFOLIO_MATERIAL, file)
      if (
        applicationFormEpoch.value !== context.epoch
        || targetTeacherId.value !== context.teacherId
        || (form.id || undefined) !== context.applicationId
      ) {
        return
      }
      if (!attachmentItems.value.some((item) => item.fileNodeId === uploaded.id)) {
        attachmentItems.value = [
          ...attachmentItems.value,
          { fileNodeId: uploaded.id, fileName: uploaded.nodeName },
        ]
      }
    }
    void message.success('附件已上传')
  } catch (error) {
    if (applicationFormEpoch.value !== context.epoch) {
      return
    }
    showUserError(error, '附件上传失败')
  } finally {
    if (applicationFormEpoch.value === context.epoch) {
      uploading.value = false
    }
    input.value = ''
  }
}

function removeAttachment(fileNodeId: string) {
  if (!canEdit.value || operationPending.value) {
    return
  }
  attachmentItems.value = attachmentItems.value.filter((item) => item.fileNodeId !== fileNodeId)
}

function attachmentFileIds(): string[] {
  return attachmentItems.value.map((item) => item.fileNodeId)
}

function buildDraftPayload() {
  return {
    id: form.id || undefined,
    teacherUserId: targetTeacherId.value!,
    certLevel: form.certLevel.trim() || undefined,
    certYear: form.certYear.trim() || undefined,
    enterprisePracticeDays: form.enterprisePracticeDays ?? undefined,
    attachmentFileIds: attachmentFileIds().length ? attachmentFileIds() : undefined,
  }
}

async function persistDraft() {
  if (!assertArchiveWritable()) {
    return
  }
  form.id = await portfolioDualTeacherApi.saveDraft(buildDraftPayload())
}

async function saveDraft() {
  if (!assertArchiveWritable()) {
    return
  }
  if (!targetTeacherId.value) {
    showFormValidationMessage('请先选择目标教师')
    return
  }
  if (!canEdit.value || operationPending.value) {
    return
  }
  saving.value = true
  try {
    await persistDraft()
    void message.success('草稿已保存')
    await loadApplication()
  } catch (error) {
    showUserError(error, '保存双师认定草稿失败')
  } finally {
    saving.value = false
  }
}

async function submitApplication() {
  if (!assertArchiveWritable()) {
    return
  }
  if (!targetTeacherId.value) {
    showFormValidationMessage('请先选择目标教师')
    return
  }
  if (!canEdit.value || operationPending.value) {
    showFormValidationMessage('当前状态不可提交')
    return
  }
  if (!form.certLevel.trim()) {
    showFormValidationMessage('请填写认定等级')
    return
  }
  if (!/^\d{4}$/.test(form.certYear.trim())) {
    showFormValidationMessage('认定年度须为 4 位自然年')
    return
  }
  submitting.value = true
  try {
    await persistDraft()
    await portfolioDualTeacherApi.submit({ id: form.id })
    void message.success('已提交审核')
    await loadApplication()
  } catch (error) {
    showUserError(error, '提交双师认定申请失败')
  } finally {
    submitting.value = false
  }
}

watch(
  () => [targetTeacherId.value, readRouteStringParam(route.query.applicationId)],
  () => {
    resetApplicationContext()
    void loadApplication()
  },
  { immediate: true },
)
</script>

<template>
  <StageWorkbenchShell>
    <template #context>
      <ContextBar show-title layout="workbench" title="双师认定申请" />
    </template>
    <PortfolioTeacherPickGate v-if="canPickTeachers && !targetTeacherId" />
    <template v-else>
      <UiAlertStrip
        v-if="isProxyMode"
        tone="info"
        title="代办模式"
        description="当前正在代目标教师办理双师认定申请；保存与提交将写入该教师档案。"
        class="mb-3"
      />
      <UiAlertStrip
        v-if="archiveWriteForbidden"
        tone="warning"
        title="档案已封存写禁"
        :description="archiveWriteBlockMessage"
        class="mb-3"
      />

      <UiCard>
        <div v-if="application" class="status-bar">
          <span>申请单号 {{ application.applicationNo }}</span>
          <span>状态 {{ statusLabel(application.applicationStatus) }}</span>
          <UiTag
            v-if="application.lifecycleStatus"
            :tone="
              application.lifecycleStatus === 'ACTIVE'
                ? 'green'
                : application.lifecycleStatus === 'TEMP_HOLD'
                  ? 'orange'
                  : application.lifecycleStatus === 'SEALED'
                    ? 'red'
                    : 'gray'
            "
          >
            {{ application.lifecycleStatusLabel || application.lifecycleStatus }}
          </UiTag>
          <UiTag v-if="application.evaluationHeld" tone="orange">参评 hold</UiTag>
          <PortfolioOwnerIdentityLayersCell
            v-if="application.ownerIdentityLayers?.length"
            :layers="application.ownerIdentityLayers"
            :note="application.ownerMultiIdentityNote"
          />
          <span v-if="reReviewDrafting" class="re-review-hint">正在填写复核申请（尚未保存）</span>
        </div>
        <UiForm layout="vertical" class="form">
          <UiFormItem label="认定等级" required>
            <UiInput
              size="sm"
              v-model="form.certLevel"
              :disabled="!canEdit || operationPending"
              placeholder="如 高级"
            />
          </UiFormItem>
          <UiFormItem label="认定年度" required>
            <UiInput size="sm" v-model="form.certYear" :disabled="!canEdit || operationPending" />
          </UiFormItem>
          <UiFormItem label="企业实践天数">
            <UiInputNumber
              size="sm"
              v-model="form.enterprisePracticeDays"
              :disabled="!canEdit || operationPending"
              :min="0"
              style="width: 100%"
            />
          </UiFormItem>
          <UiFormItem label="证明材料">
            <input
              ref="attachmentInputRef"
              type="file"
              class="sr-only"
              accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
              multiple
              @change="onAttachmentPick"
            />
            <UiButton
              variant="primary"
              size="sm"
              :loading="uploading"
              :disabled="!canEdit || operationPending"
              @click="openAttachmentPicker"
            >
              上传附件
            </UiButton>
            <ul v-if="attachmentItems.length" class="attachment-list">
              <li v-for="item in attachmentItems" :key="item.fileNodeId">
                <span>{{ item.fileName }}</span>
                <a v-if="canEdit && !operationPending" @click="removeAttachment(item.fileNodeId)">移除</a>
              </li>
            </ul>
          </UiFormItem>
          <div class="actions">
            <UiButton
              v-if="canStartReReview"
              size="sm"
              variant="primary"
              :disabled="operationPending"
              @click="startReReview"
            >
              发起复核申请
            </UiButton>
            <UiButton
              variant="primary"
              size="sm"
              :loading="saving"
              :disabled="!canEdit || operationPending"
              @click="saveDraft"
            >
              保存草稿
            </UiButton>
            <UiButton
              size="sm"
              variant="primary"
              :loading="submitting"
              :disabled="!canSubmit"
              @click="submitApplication"
            >
              提交审核
            </UiButton>
          </div>
        </UiForm>
      </UiCard>
    </template>
  </StageWorkbenchShell>
</template>

<style scoped>
.status-bar {
  display: flex;
  flex-wrap: wrap;
  gap: var(--dp-space-3, 12px);
  margin-bottom: var(--dp-space-3, 12px);
  font-size: 14px;
}
.re-review-hint {
  color: var(--dp-color-warning);
}
.form {
  max-width: 480px;
}
.actions {
  display: flex;
  gap: 8px;
}
.attachment-list {
  margin: 8px 0 0;
  padding: 0;
  list-style: none;
  font-size: 13px;
}
.attachment-list li {
  display: flex;
  gap: 8px;
  padding: 4px 0;
}
</style>
