<script setup lang="ts">
import type { PortfolioArchiveBagPreviewVO } from '@/apis/portfolio/bag-types'
import type {
  PortfolioTitlePromotionApplicationVO,
  PortfolioTitlePromotionTaskVO,
} from '@/apis/portfolio/title-promotion'
import { portfolioTitlePromotionApi } from '@/apis/portfolio/title-promotion'
import type { PortfolioArchiveRecordSummaryVO } from '@/apis/portfolio/types'
import { Checkbox, message, Select } from 'ant-design-vue'
import { computed, ref } from 'vue'
import { portfolioArchiveApi } from '@/apis/portfolio/archive'
import { PortfolioArchiveRecordStatusCode } from '@/apis/portfolio/enums'
import { portfolioArchiveBagApi } from '@/apis/portfolio/teacher-platform'
import UiCard from '@/components/ui-guide/ui/Card.vue'
import UiButton from '@/components/ui-guide/ui/UiButton.vue'
import UiEmpty from '@/components/ui-guide/ui/UiEmpty.vue'
import UiTag from '@/components/ui-guide/ui/UiTag.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import {
  usePortfolioPageScope,
  usePortfolioScopedLoader,
} from '@/composables/usePortfolioPageScope'
import { PortfolioTitlePromotionTaskStatusCode } from '@/types/enums/portfolio-title-promotion-task-status-enum'
import { showUserError } from '@/utils/error-handler'
import { handleDownloadFile } from '@/utils/file-download'

const { targetTeacherId, canPickTeachers } = usePortfolioPageScope()
const loading = ref(false)
const previewLoading = ref(false)
const exportLoading = ref(false)
const matchLoading = ref(false)
const draftLoading = ref(false)
const submitLoading = ref(false)
const records = ref<PortfolioArchiveRecordSummaryVO[]>([])
const selectedRecordIds = ref<string[]>([])
const preview = ref<PortfolioArchiveBagPreviewVO | null>(null)
const publishedTasks = ref<PortfolioTitlePromotionTaskVO[]>([])
const selectedTaskId = ref<string | undefined>()
const commitmentConfirmed = ref(false)
const matchResult = ref<PortfolioTitlePromotionApplicationVO | null>(null)
const applicationId = ref<string | undefined>()
const scopeRequestToken = ref(0)
const taskRequestToken = ref(0)
const recordRequestToken = ref(0)

const teacherRequest = computed(() =>
  targetTeacherId.value ? { teacherId: targetTeacherId.value } : {},
)
const canLoad = computed(() => Boolean(targetTeacherId.value) || !canPickTeachers.value)
const selectedCount = computed(() => selectedRecordIds.value.length)
const operationPending = computed(
  () =>
    loading.value ||
    previewLoading.value ||
    exportLoading.value ||
    matchLoading.value ||
    draftLoading.value ||
    submitLoading.value,
)
const selectedRequest = computed(() => ({
  ...teacherRequest.value,
  selectedOfficialRecordIds: selectedRecordIds.value,
}))
const taskOptions = computed(() =>
  publishedTasks.value.map((task) => ({
    value: task.id,
    label: `${task.taskName}（${task.targetTitleLevel} · ${task.reviewYear}）`,
  })),
)

async function loadPublishedTasks() {
  const currentToken = ++taskRequestToken.value
  try {
    const page = await portfolioTitlePromotionApi.pageTask({
      pageNum: 1,
      pageSize: 100,
      taskStatus: PortfolioTitlePromotionTaskStatusCode.PUBLISHED,
    })
    if (taskRequestToken.value !== currentToken) {
      return
    }
    publishedTasks.value = page.list
    if (!publishedTasks.value.some((task) => task.id === selectedTaskId.value)) {
      selectedTaskId.value = publishedTasks.value[0]?.id
    }
  } catch (error) {
    if (taskRequestToken.value !== currentToken) {
      return
    }
    publishedTasks.value = []
    selectedTaskId.value = undefined
    showUserError(error, '加载失败')
  }
}

/**
 * 加载当前教师可用于职称材料包的正式档案；不变量：草稿、审核中和已废止记录不得进入选择列表。
 */
async function loadOfficialRecords() {
  const currentScopeToken = scopeRequestToken.value
  const currentToken = ++recordRequestToken.value
  if (!canLoad.value) {
    records.value = []
    selectedRecordIds.value = []
    preview.value = null
    matchResult.value = null
    return
  }
  loading.value = true
  try {
    const requestTeacherId = targetTeacherId.value
    const allRecords: PortfolioArchiveRecordSummaryVO[] = []
    let pageNum = 1
    let total = 0
    do {
      const page = await portfolioArchiveApi.pageRecords({
        ...(requestTeacherId ? { teacherId: requestTeacherId } : {}),
        recordStatus: PortfolioArchiveRecordStatusCode.OFFICIAL,
        pageNum,
        pageSize: 200,
      })
      if (
        scopeRequestToken.value !== currentScopeToken ||
        recordRequestToken.value !== currentToken
      ) {
        return
      }
      allRecords.push(...page.list)
      total = page.total
      if (page.list.length === 0 && allRecords.length < total) {
        throw new Error('正式档案分页返回不完整，无法生成可靠的职称材料选择集')
      }
      pageNum += 1
    } while (allRecords.length < total)
    if (
      scopeRequestToken.value !== currentScopeToken ||
      recordRequestToken.value !== currentToken
    ) {
      return
    }
    records.value = allRecords
    selectedRecordIds.value = allRecords.map((item) => item.id)
    preview.value = null
    matchResult.value = null
    applicationId.value = undefined
  } catch (error) {
    if (
      scopeRequestToken.value !== currentScopeToken ||
      recordRequestToken.value !== currentToken
    ) {
      return
    }
    records.value = []
    selectedRecordIds.value = []
    preview.value = null
    matchResult.value = null
    applicationId.value = undefined
    showUserError(error, '加载失败')
  } finally {
    if (
      scopeRequestToken.value === currentScopeToken &&
      recordRequestToken.value === currentToken
    ) {
      loading.value = false
    }
  }
}

async function previewPromotionPackage() {
  if (operationPending.value || selectedCount.value === 0) {
    showUserError(null, '请至少选择一条正式档案')
    return
  }
  const currentScopeToken = scopeRequestToken.value
  const request = {
    ...selectedRequest.value,
    selectedOfficialRecordIds: [...selectedRecordIds.value],
  }
  previewLoading.value = true
  try {
    const nextPreview = await portfolioArchiveBagApi.preview(request)
    if (scopeRequestToken.value !== currentScopeToken) {
      return
    }
    preview.value = nextPreview
  } catch (error) {
    if (scopeRequestToken.value !== currentScopeToken) {
      return
    }
    preview.value = null
    showUserError(error, '校验职称材料包失败')
  } finally {
    if (scopeRequestToken.value === currentScopeToken) {
      previewLoading.value = false
    }
  }
}

async function exportPromotionPackage() {
  if (operationPending.value || selectedCount.value === 0) {
    showUserError(null, '请至少选择一条正式档案')
    return
  }
  const currentScopeToken = scopeRequestToken.value
  const request = {
    ...selectedRequest.value,
    selectedOfficialRecordIds: [...selectedRecordIds.value],
  }
  exportLoading.value = true
  try {
    const result = await portfolioArchiveBagApi.buildMaterialPackage(request)
    if (scopeRequestToken.value !== currentScopeToken) {
      return
    }
    if (!result.fileNodeId) {
      throw new Error('职称材料包未返回文件 ID')
    }
    await handleDownloadFile({ fileId: result.fileNodeId, fileName: result.fileName })
  } catch (error) {
    if (scopeRequestToken.value !== currentScopeToken) {
      return
    }
    showUserError(error, '生成职称材料包失败')
  } finally {
    if (scopeRequestToken.value === currentScopeToken) {
      exportLoading.value = false
    }
  }
}

async function previewMatch() {
  if (operationPending.value) {
    return
  }
  if (!selectedTaskId.value) {
    message.warning('请先选择已发布的职称申报任务')
    return
  }
  if (selectedCount.value === 0) {
    message.warning('请至少选择一条正式档案')
    return
  }
  const currentScopeToken = scopeRequestToken.value
  const requestTaskId = selectedTaskId.value
  const requestTeacherId = targetTeacherId.value
  const requestRecordIds = [...selectedRecordIds.value]
  const requestCommitment = commitmentConfirmed.value
  matchLoading.value = true
  try {
    const result = await portfolioTitlePromotionApi.previewMatch({
      taskId: requestTaskId,
      teacherUserId: requestTeacherId || undefined,
      selectedOfficialRecordIds: requestRecordIds,
      commitmentConfirmed: requestCommitment,
    })
    if (scopeRequestToken.value !== currentScopeToken) {
      return
    }
    matchResult.value = result
  } catch (error) {
    if (scopeRequestToken.value !== currentScopeToken) {
      return
    }
    matchResult.value = null
    showUserError(error, '预览匹配度失败')
  } finally {
    if (scopeRequestToken.value === currentScopeToken) {
      matchLoading.value = false
    }
  }
}

async function saveDraft() {
  if (operationPending.value) {
    return
  }
  if (!selectedTaskId.value) {
    message.warning('请先选择已发布的职称申报任务')
    return
  }
  if (selectedCount.value === 0) {
    message.warning('请至少选择一条正式档案')
    return
  }
  const currentScopeToken = scopeRequestToken.value
  const requestTaskId = selectedTaskId.value
  const requestTeacherId = targetTeacherId.value
  const requestRecordIds = [...selectedRecordIds.value]
  const requestCommitment = commitmentConfirmed.value
  draftLoading.value = true
  try {
    const result = await portfolioTitlePromotionApi.saveDraft({
      id: applicationId.value,
      taskId: requestTaskId,
      teacherUserId: requestTeacherId || undefined,
      selectedOfficialRecordIds: requestRecordIds,
      commitmentConfirmed: requestCommitment,
    })
    if (scopeRequestToken.value !== currentScopeToken) {
      return
    }
    applicationId.value = result.id
    matchResult.value = result
    message.success('申报草稿已保存并重算匹配度')
  } catch (error) {
    if (scopeRequestToken.value !== currentScopeToken) {
      return
    }
    showUserError(error, '保存申报草稿失败')
  } finally {
    if (scopeRequestToken.value === currentScopeToken) {
      draftLoading.value = false
    }
  }
}

async function submitApplication() {
  if (operationPending.value) {
    return
  }
  if (!applicationId.value) {
    message.warning('请先保存草稿')
    return
  }
  if (!commitmentConfirmed.value) {
    message.warning('请先确认申报材料真实、完整')
    return
  }
  const currentScopeToken = scopeRequestToken.value
  const requestApplicationId = applicationId.value
  submitLoading.value = true
  try {
    const result = await portfolioTitlePromotionApi.submit({ id: requestApplicationId })
    if (scopeRequestToken.value !== currentScopeToken) {
      return
    }
    matchResult.value = result
    message.success('已提交院审')
  } catch (error) {
    if (scopeRequestToken.value !== currentScopeToken) {
      return
    }
    showUserError(error, '提交申报失败')
  } finally {
    if (scopeRequestToken.value === currentScopeToken) {
      submitLoading.value = false
    }
  }
}

function resetApplicationDraftContext() {
  preview.value = null
  matchResult.value = null
  applicationId.value = undefined
}

async function reloadAll() {
  await Promise.all([loadPublishedTasks(), loadOfficialRecords()])
}

usePortfolioScopedLoader(
  () => {
    scopeRequestToken.value += 1
    taskRequestToken.value += 1
    recordRequestToken.value += 1
    loading.value = false
    previewLoading.value = false
    exportLoading.value = false
    matchLoading.value = false
    draftLoading.value = false
    submitLoading.value = false
    records.value = []
    selectedRecordIds.value = []
    commitmentConfirmed.value = false
    resetApplicationDraftContext()
    void reloadAll()
  },
  () => targetTeacherId.value,
)
</script>

<template>
  <StageWorkbenchShell>
    <template #context>
      <ContextBar show-title layout="workbench" title="职称材料包与申报">
        <template #actions>
          <UiButton :loading="loading" :disabled="!canLoad || operationPending" @click="reloadAll">
            刷新
          </UiButton>
          <UiButton
            :loading="previewLoading"
            :disabled="!canLoad || operationPending || selectedCount === 0"
            @click="previewPromotionPackage"
          >
            校验缺项
          </UiButton>
          <UiButton
            variant="primary"
            :loading="exportLoading"
            :disabled="!canLoad || operationPending || selectedCount === 0"
            @click="exportPromotionPackage"
          >
            生成材料包
          </UiButton>
        </template>
      </ContextBar>
    </template>

    <UiEmpty v-if="canPickTeachers && !targetTeacherId" title="暂无内容" />
    <template v-else>
      <UiCard title="申报任务">
        <Select
          v-model:value="selectedTaskId"
          allow-clear
          placeholder="选择已发布职称任务"
          style="width: 100%; max-width: 480px"
          :options="taskOptions"
          @change="resetApplicationDraftContext"
        />
        <p v-if="!publishedTasks.length" class="promotion-scene__summary">
          暂无已发布任务，请管理员先在「职称申报辅助」发布任务。
        </p>
      </UiCard>

      <UiCard title="正式档案选择" :loading="loading">
        <p class="promotion-scene__summary">
          已选择 {{ selectedCount }} 条正式档案，仅正式档案可进入职称材料包与申报。
        </p>
        <a-checkbox-group
          v-model:value="selectedRecordIds"
          class="promotion-scene__records"
          @change="resetApplicationDraftContext"
        >
          <div v-for="record in records" :key="record.id" class="promotion-scene__record-row">
            <a-checkbox :value="record.id">
              {{ record.categoryName || '未命名分类' }}
              <span class="promotion-scene__record-meta"
                >版本 v{{ record.documentVersionNo ?? 1 }} ·
                {{ record.updateTime || '未记录更新时间' }}</span
              >
            </a-checkbox>
            <UiTag tone="green" size="sm"> 正式档案 </UiTag>
          </div>
        </a-checkbox-group>
        <UiEmpty v-if="!loading && records.length === 0" title="暂无内容" />
      </UiCard>

      <UiCard title="匹配度与提交" class="promotion-scene__preview">
        <Checkbox v-model:checked="commitmentConfirmed" @change="resetApplicationDraftContext">
          本人确认申报材料真实、完整，并理解系统仅提供辅助核验、不替代评委会结论
        </Checkbox>
        <div class="promotion-scene__actions">
          <UiButton :loading="matchLoading" :disabled="operationPending" @click="previewMatch">
            预览匹配度
          </UiButton>
          <UiButton :loading="draftLoading" :disabled="operationPending" @click="saveDraft">
            保存草稿
          </UiButton>
          <UiButton
            :loading="submitLoading"
            :disabled="operationPending || !applicationId || !commitmentConfirmed"
            @click="submitApplication"
          >
            提交院审
          </UiButton>
        </div>
        <div v-if="matchResult" class="promotion-scene__match">
          <p>
            匹配度 {{ matchResult.matchScore }} （硬性 {{ matchResult.hardRate }} + 材料
            {{ matchResult.materialRate }} + 指标 {{ matchResult.indicatorRate }}）
          </p>
          <UiTag :tone="matchResult.redlineBlocked ? 'red' : 'green'">
            {{ matchResult.redlineBlocked ? '红线阻断' : '红线未阻断' }}
          </UiTag>
          <ul>
            <li v-for="item in matchResult.matchDetails" :key="item.itemCode">
              <UiTag :tone="item.satisfied ? 'green' : 'red'" size="sm">
                {{ item.satisfied ? '满足' : '不满足' }}
              </UiTag>
              {{ item.itemTitle }}：{{ item.evidenceSummary }}
              <span v-if="item.gapHint">（{{ item.gapHint }}）</span>
            </li>
          </ul>
        </div>
      </UiCard>

      <UiCard v-if="preview" title="缺项校验" class="promotion-scene__preview">
        <p>
          材料包包含 {{ preview.catalogItems.length }} 条目录、{{
            preview.totalAttachmentCount
          }}
          个附件。
        </p>
        <p v-if="preview.missingCategoryNames.length" class="promotion-scene__warning">
          档案缺项：{{ preview.missingCategoryNames.join('、') }}
        </p>
        <p v-else class="promotion-scene__success">当前档案完整度校验未发现缺失分类。</p>
      </UiCard>
    </template>
  </StageWorkbenchShell>
</template>

<style scoped>
.promotion-scene__summary,
.promotion-scene__preview p {
  margin: 0 0 var(--dp-space-3);
  color: var(--dp-text-secondary);
}
.promotion-scene__records {
  display: block;
}
.promotion-scene__record-row {
  display: flex;
  align-items: center;
  gap: var(--dp-space-3);
  padding: var(--dp-space-3) 0;
  border-bottom: 1px solid var(--ant-color-border-secondary);
}
.promotion-scene__record-meta {
  margin-left: var(--dp-space-2);
  color: var(--dp-text-secondary);
  font-size: var(--dp-font-size-sm);
}
.promotion-scene__preview {
  margin-top: var(--dp-space-4);
}
.promotion-scene__warning {
  color: var(--ant-color-warning);
}
.promotion-scene__success {
  color: var(--ant-color-success);
}
.promotion-scene__actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin: 12px 0;
}
.promotion-scene__match ul {
  margin: 8px 0 0;
  padding-left: 16px;
  font-size: 13px;
  line-height: 1.6;
}
</style>
