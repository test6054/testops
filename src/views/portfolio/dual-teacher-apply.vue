<script setup lang="ts">
import type { PortfolioDualTeacherApplicationStatus } from '@/apis/portfolio/enums'
import type { PortfolioDualTeacherApplicationVO } from '@/apis/portfolio/teacher-platform'
import { message } from 'ant-design-vue'
import { onMounted, reactive, ref } from 'vue'
import { uploadFile } from '@/apis/edu/file-management'
import { PORTFOLIO_DUAL_TEACHER_APPLICATION_STATUS_LABEL } from '@/apis/portfolio/enums'
import { portfolioDualTeacherApi } from '@/apis/portfolio/teacher-platform'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiCard from '@/components/ui-guide/ui/Card.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import { usePortfolioTeacherAccess } from '@/composables/usePortfolioTeacherAccess'
import { showUserError } from '@/utils/error-handler'
import { strictEnumLabel } from '@/utils/strict-enum'

const { currentUserId } = usePortfolioTeacherAccess()
const saving = ref(false)
const submitting = ref(false)
const uploading = ref(false)
const application = ref<PortfolioDualTeacherApplicationVO | null>(null)
const attachmentFileIds = ref<string[]>([])

const form = reactive({
  id: '',
  certLevel: '',
  certYear: String(new Date().getFullYear()),
  enterprisePracticeDays: 0,
})

function statusLabel(status: string) {
  return strictEnumLabel(
    PORTFOLIO_DUAL_TEACHER_APPLICATION_STATUS_LABEL,
    status as PortfolioDualTeacherApplicationStatus,
    '双师申请状态',
  )
}

const canEdit = () => {
  const status = application.value?.applicationStatus
  return (
    !status || status === 'DRAFT' || status === 'COLLEGE_RETURNED' || status === 'ACADEMIC_RETURNED'
  )
}

const canSubmit = () => Boolean(form.id && canEdit())

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
      attachmentFileIds.value = []
      return
    }
    application.value = await portfolioDualTeacherApi.get({ id: mine.id })
    form.id = application.value.id
    form.certLevel = application.value.certLevel ?? ''
    form.certYear = application.value.certYear ?? form.certYear
    form.enterprisePracticeDays = application.value.enterprisePracticeDays ?? 0
    attachmentFileIds.value = application.value.attachmentFileIds ?? []
  } catch (error) {
    showUserError(error)
  }
}

async function handleUploadAttachment(file: File) {
  uploading.value = true
  try {
    const uploaded = await uploadFile(file, { businessType: 'PORTFOLIO_MATERIAL' })
    attachmentFileIds.value = [...attachmentFileIds.value, uploaded.id]
    message.success('附件已上传')
  } catch (error) {
    showUserError(error, '附件上传失败')
  } finally {
    uploading.value = false
  }
  return false
}

function removeAttachment(fileId: string) {
  attachmentFileIds.value = attachmentFileIds.value.filter((id) => id !== fileId)
}

async function saveDraft() {
  if (!currentUserId.value) {
    message.warning('未获取当前用户')
    return
  }
  saving.value = true
  try {
    form.id = await portfolioDualTeacherApi.saveDraft({
      id: form.id || undefined,
      teacherUserId: currentUserId.value,
      certLevel: form.certLevel.trim() || undefined,
      certYear: form.certYear.trim() || undefined,
      enterprisePracticeDays: form.enterprisePracticeDays || undefined,
      attachmentFileIds: attachmentFileIds.value.length ? attachmentFileIds.value : undefined,
    })
    message.success('草稿已保存')
    await loadMine()
  } catch (error) {
    showUserError(error)
  } finally {
    saving.value = false
  }
}

async function submitApplication() {
  if (!form.id) {
    message.warning('请先保存草稿')
    return
  }
  submitting.value = true
  try {
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
    <ContextBar title="双师认定申请" subtitle="草稿保存 · 提交院审" />
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
          <a-upload
            :before-upload="handleUploadAttachment"
            :show-upload-list="false"
            :disabled="!canEdit()"
            accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
            multiple
          >
            <UiButton :loading="uploading" :disabled="!canEdit()"> 上传附件 </UiButton>
          </a-upload>
          <ul v-if="attachmentFileIds.length" class="attachment-list">
            <li v-for="fileId in attachmentFileIds" :key="fileId">
              <span>{{ fileId }}</span>
              <a v-if="canEdit()" @click="removeAttachment(fileId)">移除</a>
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
