<script setup lang="ts">
import type { PortfolioDualTeacherApplicationVO } from '@/apis/portfolio/teacher-platform'
import { message } from 'ant-design-vue'
import { onMounted, reactive, ref } from 'vue'
import { FileUploadSceneKey } from '@/apis/platform/scene-keys'
import { PortfolioDualTeacherApplicationStatusDescription } from '@/apis/portfolio/enums'
import { portfolioDualTeacherApi } from '@/apis/portfolio/teacher-platform'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiCard from '@/components/ui-guide/ui/Card.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import { stageBusinessFile } from '@/composables/platform/usePlatformFileStage'
import { usePortfolioTeacherAccess } from '@/composables/usePortfolioTeacherAccess'
import { showUserError } from '@/utils/error-handler'

const { currentUserId } = usePortfolioTeacherAccess()
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

const form = reactive({
  id: '',
  certLevel: '',
  certYear: String(new Date().getFullYear()),
  enterprisePracticeDays: 0,
})

function statusLabel(status: PortfolioDualTeacherApplicationVO['applicationStatus']) {
  return PortfolioDualTeacherApplicationStatusDescription[status]
}

const canEdit = () => {
  const status = application.value?.applicationStatus
  if (!status) {
    return true
  }
  if (status === 'REJECTED') {
    return !form.id
  }
  return status === 'DRAFT' || status === 'COLLEGE_RETURNED' || status === 'ACADEMIC_RETURNED'
}

const canSubmit = () => canEdit()

async function loadMine() {
  if (!currentUserId.value) {
    return
  }
  try {
    const page = await portfolioDualTeacherApi.page({
      pageNum: 1,
      pageSize: 1,
      teacherUserId: currentUserId.value,
    })
    const mine = page.list?.[0]
    if (!mine) {
      application.value = null
      form.id = ''
      attachmentItems.value = []
      return
    }
    application.value = await portfolioDualTeacherApi.get({ id: mine.id })
    if (application.value.applicationStatus === 'REJECTED') {
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
    showUserError(error)
  }
}

function openAttachmentPicker() {
  attachmentInputRef.value?.click()
}

async function onAttachmentPick(event: Event) {
  if (!(event.target instanceof HTMLInputElement)) {
    return
  }
  const input = event.target
  const files = input.files
  if (!files?.length) {
    return
  }
  uploading.value = true
  try {
    for (const file of Array.from(files)) {
      const uploaded = await stageBusinessFile(FileUploadSceneKey.PORTFOLIO_MATERIAL, file)
      attachmentItems.value = [
        ...attachmentItems.value,
        { fileNodeId: uploaded.id, fileName: uploaded.nodeName },
      ]
    }
    message.success('附件已上传')
  } catch (error) {
    showUserError(error, '附件上传失败')
  } finally {
    uploading.value = false
    input.value = ''
  }
}

function removeAttachment(fileNodeId: string) {
  attachmentItems.value = attachmentItems.value.filter((item) => item.fileNodeId !== fileNodeId)
}

function attachmentFileIds(): string[] {
  return attachmentItems.value.map((item) => item.fileNodeId)
}

function buildDraftPayload() {
  if (!currentUserId.value) {
    throw new Error('未获取当前用户')
  }
  return {
    id: form.id || undefined,
    teacherUserId: currentUserId.value,
    certLevel: form.certLevel.trim() || undefined,
    certYear: form.certYear.trim() || undefined,
    enterprisePracticeDays: form.enterprisePracticeDays ?? undefined,
    attachmentFileIds: attachmentFileIds().length ? attachmentFileIds() : undefined,
  }
}

async function persistDraft() {
  form.id = await portfolioDualTeacherApi.saveDraft(buildDraftPayload())
}

async function saveDraft() {
  if (!currentUserId.value) {
    message.warning('未获取当前用户')
    return
  }
  saving.value = true
  try {
    await persistDraft()
    message.success('草稿已保存')
    await loadMine()
  } catch (error) {
    showUserError(error)
  } finally {
    saving.value = false
  }
}

async function submitApplication() {
  if (!currentUserId.value) {
    message.warning('未获取当前用户')
    return
  }
  if (!canEdit()) {
    message.warning('当前状态不可提交')
    return
  }
  submitting.value = true
  try {
    await persistDraft()
    await portfolioDualTeacherApi.submit({ id: form.id })
    message.success('已提交审核')
    await loadMine()
  } catch (error) {
    showUserError(error)
  } finally {
    submitting.value = false
  }
}

onMounted(loadMine)
</script>

<template>
  <StageWorkbenchShell>
    <template #context>
      <ContextBar show-title layout="workbench" title="双师认定申请" />
    </template>
    <UiCard>
      <div v-if="application" class="status-bar">
        <span>申请单号 {{ application.applicationNo }}</span>
        <span>状态 {{ statusLabel(application.applicationStatus) }}</span>
      </div>
      <a-form layout="vertical" class="form">
        <a-form-item label="认定等级">
          <a-input v-model:value="form.certLevel" :disabled="!canEdit()" placeholder="如 高级" />
        </a-form-item>
        <a-form-item label="认定年度">
          <a-input v-model:value="form.certYear" :disabled="!canEdit()" />
        </a-form-item>
        <a-form-item label="企业实践天数">
          <a-input-number
            v-model:value="form.enterprisePracticeDays"
            :disabled="!canEdit()"
            :min="0"
            style="width: 100%"
          />
        </a-form-item>
        <a-form-item label="证明材料">
          <input
            ref="attachmentInputRef"
            type="file"
            class="sr-only"
            accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
            multiple
            @change="onAttachmentPick"
          />
          <UiButton :loading="uploading" :disabled="!canEdit()" @click="openAttachmentPicker">
            上传附件
          </UiButton>
          <ul v-if="attachmentItems.length" class="attachment-list">
            <li v-for="item in attachmentItems" :key="item.fileNodeId">
              <span>{{ item.fileName }}</span>
              <a v-if="canEdit()" @click="removeAttachment(item.fileNodeId)">移除</a>
            </li>
          </ul>
        </a-form-item>
        <div class="actions">
          <UiButton :loading="saving" :disabled="!canEdit()" @click="saveDraft">
            保存草稿
          </UiButton>
          <UiButton
            variant="primary"
            :loading="submitting"
            :disabled="!canSubmit()"
            @click="submitApplication"
          >
            提交审核
          </UiButton>
        </div>
      </a-form>
    </UiCard>
  </StageWorkbenchShell>
</template>

<style scoped>
.status-bar {
  display: flex;
  gap: 16px;
  margin-bottom: 16px;
  font-size: 14px;
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
