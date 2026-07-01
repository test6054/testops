<script setup lang="ts">
/**
 * 间接评价管理 - 问卷 + 题项 + 答卷
 *
 * 后端：
 * - /api/quality/indirect-forms       问卷 CRUD
 * - /api/quality/indirect-items       题项 CRUD
 * - /api/quality/indirect-responses   答卷 CRUD + 批量
 *
 * 设计：先选问卷 → 显示题项 → 选题项查看答卷
 */
import type { IndirectEvaluationFormVO } from '@/apis/quality/indirect-form'
import { indirectFormApi } from '@/apis/quality/indirect-form'
import type { IndirectEvaluationItemVO } from '@/apis/quality/indirect-item'
import type { SignalMetric } from '@/types/workbench'
import { computed, onActivated, onMounted, ref, watch } from 'vue'
import QualityIngestPageShell from '@/components/quality/QualityIngestPageShell.vue'
import QualityPageContextBar from '@/components/quality/QualityPageContextBar.vue'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import SignalBand from '@/components/workbench/SignalBand.vue'
import { useQualityScopedLoader } from '@/composables/useQualityPageScope'
import IndirectResponseReviewPanel from './components/indirect-evaluation/IndirectResponseReviewPanel.vue'
import IndirectSurveyTemplatePanel from './components/indirect-evaluation/IndirectSurveyTemplatePanel.vue'
import IndirectTaskDispatchPanel from './components/indirect-evaluation/IndirectTaskDispatchPanel.vue'

const selectedForm = ref<IndirectEvaluationFormVO | null>(null)
const selectedItem = ref<IndirectEvaluationItemVO | null>(null)

const surveyPanelRef = ref<InstanceType<typeof IndirectSurveyTemplatePanel>>()
const taskPanelRef = ref<InstanceType<typeof IndirectTaskDispatchPanel>>()
const responsePanelRef = ref<InstanceType<typeof IndirectResponseReviewPanel>>()

const formsLoading = computed(() => surveyPanelRef.value?.formsLoading ?? false)

const progressSummary = ref({
  submissionCount: 0,
  expectedSample: 0,
  receivedResponseCount: 0,
  expectedResponseCount: 0,
  pendingConversionCount: 0,
})

/** 按启用问卷聚合 progress，与达成度覆盖率 / 样本回收率口径一致 */
async function refreshProgressSummary(): Promise<void> {
  const forms = surveyPanelRef.value?.forms ?? []
  let submissionCount = 0
  let expectedSample = 0
  let receivedResponseCount = 0
  let expectedResponseCount = 0
  let pendingConversionCount = 0
  for (const form of forms) {
    if (!form.enabled) continue
    const progress = await indirectFormApi.progress(form.id)
    submissionCount += progress.submissionCount ?? 0
    expectedSample += progress.expectedSample ?? 0
    receivedResponseCount += progress.receivedResponseCount ?? 0
    expectedResponseCount += progress.expectedResponseCount ?? 0
    pendingConversionCount += progress.pendingConversionCount ?? 0
  }
  progressSummary.value = {
    submissionCount,
    expectedSample,
    receivedResponseCount,
    expectedResponseCount,
    pendingConversionCount,
  }
}

const signals = computed<SignalMetric[]>(() => {
  const forms = surveyPanelRef.value?.forms ?? []
  const items = surveyPanelRef.value?.items ?? []
  const responses = responsePanelRef.value?.responses ?? []
  const summary = progressSummary.value

  const enabledForms = forms.filter((f) => f.enabled).length
  const totalItems = items.length
  const completionRate =
    summary.expectedSample > 0
      ? Number((summary.submissionCount / summary.expectedSample).toFixed(2))
      : 0
  const collectionRate =
    summary.expectedResponseCount > 0
      ? Number((summary.receivedResponseCount / summary.expectedResponseCount).toFixed(2))
      : 0
  const validResponses = responses.filter((r) => r.validFlag === true).length
  const pendingConfirmResponses = responses.filter((r) => r.validFlag == null).length
  const invalidResponses = responses.filter((r) => r.validFlag === false).length

  return [
    { key: 'forms-total', label: '问卷总数', value: forms.length, tone: 'blue' },
    {
      key: 'forms-enabled',
      label: '启用问卷',
      value: enabledForms,
      tone: enabledForms > 0 ? 'green' : 'gray',
    },
    { key: 'items-total', label: '题项总数', value: totalItems, tone: 'blue' },
    {
      key: 'received-total',
      label: '有效回收答卷',
      value: summary.receivedResponseCount,
      tone: summary.receivedResponseCount > 0 ? 'green' : 'gray',
    },
    {
      key: 'completion-rate',
      label: '填答完成率',
      value: completionRate,
      tone: completionRate >= 1 ? 'green' : completionRate > 0 ? 'orange' : 'gray',
    },
    {
      key: 'collection-rate',
      label: '样本回收率',
      value: collectionRate,
      tone: collectionRate >= 1 ? 'green' : collectionRate > 0 ? 'orange' : 'gray',
    },
    {
      key: 'pending-conversion',
      label: '待换算答卷',
      value: summary.pendingConversionCount,
      tone: summary.pendingConversionCount > 0 ? 'orange' : 'gray',
    },
    {
      key: 'responses-valid',
      label: '当前题项有效',
      value: validResponses,
      tone: validResponses > 0 ? 'green' : 'gray',
    },
    {
      key: 'responses-pending',
      label: '当前题项待确认',
      value: pendingConfirmResponses,
      tone: pendingConfirmResponses > 0 ? 'orange' : 'gray',
    },
    {
      key: 'responses-invalid',
      label: '当前题项无效',
      value: invalidResponses,
      tone: invalidResponses > 0 ? 'red' : 'gray',
    },
  ]
})

async function handleScopeChange(): Promise<void> {
  await reloadIndirectWorkbench()
}

/** 培养方案作用域变更后按序刷新问卷、题项与答卷 */
async function reloadIndirectWorkbench(): Promise<void> {
  await surveyPanelRef.value?.loadForms()
  await refreshProgressSummary()
  if (selectedForm.value) {
    await surveyPanelRef.value?.loadItems()
    await surveyPanelRef.value?.refreshValidCounts()
    if (selectedItem.value) {
      await responsePanelRef.value?.loadResponses()
    }
  }
}

useQualityScopedLoader(handleScopeChange, {
  watchScope: true,
  immediate: false,
  reloadOnActivated: false,
})

async function onFormsReloaded(formId?: string) {
  await surveyPanelRef.value?.reloadFormsAndSync(formId)
  await refreshProgressSummary()
}

async function onImportDone() {
  await surveyPanelRef.value?.refreshValidCounts()
  await refreshProgressSummary()
}

watch(selectedForm, async () => {
  selectedItem.value = null
  responsePanelRef.value?.clearResponses()
  await surveyPanelRef.value?.loadItems()
  await surveyPanelRef.value?.refreshValidCounts()
})

watch(selectedItem, () => {
  void responsePanelRef.value?.loadResponses()
})

onMounted(async () => {
  await surveyPanelRef.value?.loadScaleRules()
  await reloadIndirectWorkbench()
})

onActivated(async () => {
  await surveyPanelRef.value?.loadScaleRules()
  await reloadIndirectWorkbench()
})
</script>

<template>
  <QualityIngestPageShell embedded>
    <template #context>
      <QualityPageContextBar>
        <template #actions>
          <UiButton variant="outline" size="sm" :loading="formsLoading" @click="handleScopeChange">
            刷新
          </UiButton>
        </template>
      </QualityPageContextBar>
    </template>

    <SignalBand :metrics="signals" compact class="ie__signals" />

    <IndirectSurveyTemplatePanel
      ref="surveyPanelRef"
      v-model:selected-form="selectedForm"
      v-model:selected-item="selectedItem"
      @publish="taskPanelRef?.openPublishDrawer"
      @close="taskPanelRef?.handleCloseForm"
      @progress="taskPanelRef?.openProgressDrawer"
      @statistics="taskPanelRef?.openStatisticsDrawer"
      @copy-link="taskPanelRef?.copySurveyLink"
    >
      <template #after-forms>
        <IndirectTaskDispatchPanel
          ref="taskPanelRef"
          :selected-form="selectedForm"
          @forms-reloaded="onFormsReloaded"
        />
      </template>
      <template #response>
        <IndirectResponseReviewPanel
          ref="responsePanelRef"
          :selected-form="selectedForm"
          :selected-item="selectedItem"
          @import-done="onImportDone"
        />
      </template>
    </IndirectSurveyTemplatePanel>
  </QualityIngestPageShell>
</template>

<style scoped lang="scss">
.ie {
  &__signals {
    margin-bottom: 12px;
  }
}
</style>
