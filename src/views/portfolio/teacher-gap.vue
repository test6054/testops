<script setup lang="ts">
import type {
  PortfolioArchiveRecordFieldInput,
  PortfolioGapTaskDetailVO,
  PortfolioGapTaskStatus,
} from '@/apis/portfolio/types'
import { message } from 'ant-design-vue'
import { computed, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { FileUploadSceneKey } from '@/apis/platform/scene-keys'
import UiPlatformFileField from '@/components/platform/UiPlatformFileField.vue'
import { portfolioArchiveApi } from '@/apis/portfolio/archive'
import { portfolioGapApi } from '@/apis/portfolio/gap'
import { PORTFOLIO_GAP_TASK_STATUS_LABEL } from '@/apis/portfolio/types'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiCard from '@/components/ui-guide/ui/Card.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import { usePortfolioPageScope, usePortfolioScopedLoader } from '@/composables/usePortfolioPageScope'
import { showUserError } from '@/utils/error-handler'
import { strictEnumLabel } from '@/utils/strict-enum'

function gapTaskStatusLabel(status: PortfolioGapTaskStatus): string {
  return strictEnumLabel(PORTFOLIO_GAP_TASK_STATUS_LABEL, status, '补采任务状态')
}

function readRouteParamString(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

const route = useRoute()
const router = useRouter()
const { targetTeacherId } = usePortfolioPageScope()

const loading = ref(false)
const submitting = ref(false)
const saving = ref(false)
const detail = ref<PortfolioGapTaskDetailVO | null>(null)
const fieldValues = reactive<Record<string, string>>({})
const evidenceRefs = reactive<Record<string, string>>({})
const attachmentFileNodeId = ref<string>()
const attachmentFileName = ref<string>()

const gapTaskId = computed(() => readRouteParamString(route.params.taskId))
const teacherRequest = computed(() =>
  targetTeacherId.value ? { teacherId: targetTeacherId.value } : {},
)

const statusLabel = computed(() =>
  detail.value ? gapTaskStatusLabel(detail.value.taskStatus) : '',
)

async function loadTask() {
  if (!gapTaskId.value) {
    return
  }
  loading.value = true
  detail.value = null
  try {
    const task = await portfolioGapApi.getTask(gapTaskId.value)
    detail.value = task
    for (const field of task.missingFields) {
      fieldValues[field.fieldCode] = field.currentValue ?? ''
      evidenceRefs[field.fieldCode] = ''
    }
  } catch (error) {
    showUserError(error, '加载补采任务失败')
  } finally {
    loading.value = false
  }
}

function buildFieldInputs(): PortfolioArchiveRecordFieldInput[] {
  if (!detail.value) {
    return []
  }
  return detail.value.missingFields.map((field) => ({
    fieldCode: field.fieldCode,
    fieldValue: fieldValues[field.fieldCode] ?? '',
    evidenceRef: evidenceRefs[field.fieldCode] || undefined,
  }))
}

async function handleSaveDraft() {
  if (!detail.value) {
    return
  }
  saving.value = true
  try {
    await portfolioArchiveApi.saveDraft({
      ...teacherRequest.value,
      recordId: detail.value.archiveRecordId,
      categoryId: detail.value.categoryId,
      fields: buildFieldInputs(),
    })
    message.success('草稿已保存')
    await loadTask()
  } catch (error) {
    showUserError(error, '保存草稿失败')
  } finally {
    saving.value = false
  }
}

async function handleSubmit() {
  if (!detail.value) {
    return
  }
  submitting.value = true
  try {
    await portfolioGapApi.submitTask({
      gapTaskId: detail.value.id,
      ...teacherRequest.value,
      fileNodeId: attachmentFileNodeId.value,
      fields: buildFieldInputs(),
    })
    message.success('补采已提交审核')
    void router.push({
      path: '/portfolio/teacher/home',
      query: targetTeacherId.value ? { teacherId: targetTeacherId.value } : {},
    })
  } catch (error) {
    showUserError(error, '提交补采失败')
  } finally {
    submitting.value = false
  }
}

function goBack() {
  void router.push({
    path: '/portfolio/teacher/home',
    query: targetTeacherId.value ? { teacherId: targetTeacherId.value } : {},
  })
}

function openPortfolioGapScan() {
  if (!detail.value || !targetTeacherId.value) {
    message.warning('补采任务或教师信息未就绪')
    return
  }
  void router.push({
    path: '/scanner-kiosk/portfolio/session',
    query: {
      collectMode: 'GAP_ATTACHMENT',
      teacherId: targetTeacherId.value,
      gapTaskId: detail.value.id,
      categoryId: detail.value.categoryId,
      returnTo: route.fullPath,
    },
  })
}

usePortfolioScopedLoader(() => {
  void loadTask()
}, () => `${targetTeacherId.value}:${gapTaskId.value}`)
</script>

<template>
  <StageWorkbenchShell>
    <ContextBar
      :title="detail?.taskTitle ?? '补采任务'"
      description="缺口字段补采 · 提交审核（§7.27.1 / §7.26.5）"
    >
      <template #actions>
        <UiButton @click="goBack"> 返回首页 </UiButton>
        <UiButton :loading="saving" :disabled="loading || !detail" @click="handleSaveDraft">
          保存草稿
        </UiButton>
        <UiButton :loading="submitting" :disabled="loading || !detail" @click="handleSubmit">
          提交补采
        </UiButton>
      </template>
    </ContextBar>

    <a-spin :spinning="loading">
      <template v-if="detail">
        <p class="teacher-gap__meta">
          <UiTag tone="blue">
            {{ statusLabel }}
          </UiTag>
          <span v-if="detail.categoryName">{{ detail.categoryName }}</span>
          <span v-if="detail.dueTime">截止 {{ detail.dueTime }}</span>
        </p>
        <p v-if="detail.returnReason" class="teacher-gap__return">
          退回原因：{{ detail.returnReason }}
        </p>
        <UiCard v-if="detail.missingFields.length" title="必填字段补采">
          <a-form layout="vertical">
            <a-form-item label="补交附件">
              <UiPlatformFileField
                v-model:file-node-id="attachmentFileNodeId"
                v-model:file-name="attachmentFileName"
                :scene-key="FileUploadSceneKey.PORTFOLIO_MATERIAL"
                accept=".pdf,.doc,.docx,.png,.jpg"
                button-text="上传附件"
              />
              <UiButton class="teacher-gap__scan-btn" variant="outline" @click="openPortfolioGapScan">
                一体机扫描
              </UiButton>
            </a-form-item>
            <a-form-item
              v-for="field in detail.missingFields"
              :key="field.fieldCode"
              :label="field.fieldLabel ?? field.fieldCode"
              :required="field.missing"
            >
              <a-input v-model:value="fieldValues[field.fieldCode]" placeholder="必填" />
              <a-input
                v-model:value="evidenceRefs[field.fieldCode]"
                class="teacher-gap__evidence"
                placeholder="证据引用（可选）"
              />
            </a-form-item>
          </a-form>
        </UiCard>
        <UiEmpty v-else description="该分类必填字段已补全，可直接提交或返回首页" />
      </template>
    </a-spin>
  </StageWorkbenchShell>
</template>

<style scoped lang="scss">
.teacher-gap__meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--dp-space-2, 8px);
  margin: 0 0 var(--dp-space-4, 16px);
  font-size: 14px;
  color: var(--dp-text-secondary);
}

.teacher-gap__return {
  margin: 0 0 var(--dp-space-4, 16px);
  font-size: 14px;
  color: var(--ant-color-warning);
}

.teacher-gap__evidence {
  margin-top: var(--dp-space-2, 8px);
}

.teacher-gap__file-id {
  margin-left: var(--dp-space-2, 8px);
  font-size: 12px;
  color: var(--dp-text-secondary);
}
</style>
