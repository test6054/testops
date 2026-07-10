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
import type { IndirectEvaluationItemVO } from '@/apis/quality/indirect-item'
import type { IndirectEvaluationWorkbenchSignalSummaryVO } from '@/apis/quality/workbench'
import { workbenchApi } from '@/apis/quality/workbench'
import type { SignalMetric } from '@/types/workbench'
import { computed, nextTick, onActivated, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import QualityIngestPageShell from '@/components/quality/QualityIngestPageShell.vue'
import QualityPageContextBar from '@/components/quality/QualityPageContextBar.vue'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import SignalBand from '@/components/workbench/SignalBand.vue'
import { useQualityScopedLoader } from '@/composables/useQualityPageScope'
import { useQualityStore } from '@/stores/modules/quality'
import { showUserError } from '@/utils/error-handler'
import IndirectResponseReviewPanel from './components/indirect-evaluation/IndirectResponseReviewPanel.vue'
import IndirectSurveyTemplatePanel from './components/indirect-evaluation/IndirectSurveyTemplatePanel.vue'
import IndirectTaskDispatchPanel from './components/indirect-evaluation/IndirectTaskDispatchPanel.vue'

const qualityStore = useQualityStore()
const route = useRoute()
const router = useRouter()

const selectedForm = ref<IndirectEvaluationFormVO | null>(null)
const selectedItem = ref<IndirectEvaluationItemVO | null>(null)

const surveyPanelRef = ref<InstanceType<typeof IndirectSurveyTemplatePanel>>()
const taskPanelRef = ref<InstanceType<typeof IndirectTaskDispatchPanel>>()
const responsePanelRef = ref<InstanceType<typeof IndirectResponseReviewPanel>>()

const formsLoading = computed(() => surveyPanelRef.value?.formsLoading ?? false)

const signalSummary = ref<IndirectEvaluationWorkbenchSignalSummaryVO | null>(null)

async function loadSignalSummary(): Promise<void> {
  try {
    signalSummary.value = await workbenchApi.indirectEvaluationSignalSummary({
      programId: qualityStore.currentProgramId || undefined,
      trainingPlanId: qualityStore.currentTrainingPlanId || undefined,
      itemId: selectedItem.value?.id,
    })
  } catch (error) {
    signalSummary.value = null
    showUserError(error, '间接评价指标加载失败')
  }
}

const signals = computed<SignalMetric[]>(() => {
  const summary = signalSummary.value
  if (!summary) {
    return []
  }
  const completionRate =
    summary.completionRate ??
    (summary.expectedSample > 0
      ? Number((summary.submissionCount / summary.expectedSample).toFixed(2))
      : 0)
  const collectionRate =
    summary.collectionRate ??
    (summary.expectedResponseCount > 0
      ? Number((summary.receivedResponseCount / summary.expectedResponseCount).toFixed(2))
      : 0)
  const completionRatePct = Math.round(completionRate * 100)
  const collectionRatePct = Math.round(collectionRate * 100)
  const formEnabledCount = summary.formEnabledCount ?? 0
  const receivedResponseCount = summary.receivedResponseCount ?? 0
  const pendingConversionCount = summary.pendingConversionCount ?? 0
  const responseValidCount = summary.responseValidCount ?? 0
  const responsePendingCount = summary.responsePendingCount ?? 0
  const responseInvalidCount = summary.responseInvalidCount ?? 0
  const itemPendingConversionCount = summary.itemPendingConversionCount ?? 0
  const itemConvertedCount = summary.itemConvertedCount ?? 0
  const itemNoSubstantiveCount = summary.itemNoSubstantiveCount ?? 0
  const itemScoped = Boolean(selectedItem.value?.id)

  const metrics: SignalMetric[] = [
    { key: 'forms-total', label: '问卷总数', value: summary.formTotal ?? 0, tone: 'blue' },
    {
      key: 'forms-enabled',
      label: '启用问卷',
      value: formEnabledCount,
      tone: formEnabledCount > 0 ? 'green' : 'gray',
    },
    { key: 'items-total', label: '题项总数', value: summary.itemTotal ?? 0, tone: 'blue' },
    {
      key: 'received-total',
      label: '有效回收答卷',
      value: receivedResponseCount,
      tone: receivedResponseCount > 0 ? 'green' : 'gray',
    },
    {
      key: 'completion-rate',
      label: '填答完成率',
      value: completionRatePct,
      unit: '%',
      tone: completionRate >= 1 ? 'green' : completionRate > 0 ? 'orange' : 'gray',
    },
    {
      key: 'collection-rate',
      label: '样本回收率',
      value: collectionRatePct,
      unit: '%',
      tone: collectionRate >= 1 ? 'green' : collectionRate > 0 ? 'orange' : 'gray',
    },
  ]

  if (itemScoped) {
    metrics.push(
      {
        key: 'responses-pending',
        label: '当前题项待确认',
        value: responsePendingCount,
        tone: responsePendingCount > 0 ? 'orange' : 'gray',
        clickable: responsePendingCount > 0,
      },
      {
        key: 'item-pending-conversion',
        label: '当前题项待换算',
        value: itemPendingConversionCount,
        tone: itemPendingConversionCount > 0 ? 'orange' : 'gray',
        clickable: itemPendingConversionCount > 0,
      },
      {
        key: 'item-converted',
        label: '当前题项已换算',
        value: itemConvertedCount,
        tone: itemConvertedCount > 0 ? 'green' : 'gray',
      },
      {
        key: 'responses-valid',
        label: '当前题项有效',
        value: responseValidCount,
        tone: responseValidCount > 0 ? 'green' : 'gray',
      },
      {
        key: 'item-no-substantive',
        label: '当前题项无实质',
        value: itemNoSubstantiveCount,
        tone: itemNoSubstantiveCount > 0 ? 'orange' : 'gray',
      },
      {
        key: 'responses-invalid',
        label: '当前题项无效',
        value: responseInvalidCount,
        tone: responseInvalidCount > 0 ? 'red' : 'gray',
      },
    )
  } else {
    metrics.push({
      key: 'pending-conversion',
      label: '待换算答卷',
      value: pendingConversionCount,
      tone: pendingConversionCount > 0 ? 'orange' : 'gray',
    })
  }

  return metrics
})

async function handleScopeChange(): Promise<void> {
  await reloadIndirectWorkbench()
}

/** 培养方案作用域变更后按序刷新问卷、题项与答卷 */
async function reloadIndirectWorkbench(): Promise<void> {
  await surveyPanelRef.value?.loadForms()
  await loadSignalSummary()
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
  await loadSignalSummary()
}

async function onImportDone() {
  await surveyPanelRef.value?.refreshValidCounts()
  await loadSignalSummary()
}

watch(selectedForm, async () => {
  selectedItem.value = null
  responsePanelRef.value?.clearResponses()
  await surveyPanelRef.value?.loadItems()
  await surveyPanelRef.value?.refreshValidCounts()
  await loadSignalSummary()
})

watch(selectedItem, () => {
  void responsePanelRef.value?.loadResponses()
  void loadSignalSummary()
})

function handleSignalMetricClick(key: string): void {
  if (!selectedItem.value) {
    return
  }
  if (key === 'responses-pending') {
    responsePanelRef.value?.focusPendingConfirmTab()
    return
  }
  if (key === 'item-pending-conversion') {
    responsePanelRef.value?.focusPendingConversionTab()
  }
}

/** 帮助页返回时按 query 选中问卷并重新打开统计抽屉 */
async function tryOpenStatisticsFromQuery(): Promise<void> {
  const formId = typeof route.query.formId === 'string' ? route.query.formId.trim() : ''
  if (!formId || route.query.openStatistics !== '1') {
    return
  }
  await surveyPanelRef.value?.loadForms()
  const form = surveyPanelRef.value?.forms.find((item) => item.id === formId)
  if (!form) {
    return
  }
  selectedForm.value = form
  await nextTick()
  taskPanelRef.value?.openStatisticsDrawer(form)
  const nextQuery = { ...route.query }
  delete nextQuery.formId
  delete nextQuery.openStatistics
  void router.replace({ name: 'QualityIngestIndirectEvaluation', query: nextQuery })
}

onMounted(async () => {
  await surveyPanelRef.value?.loadScaleRules()
  await reloadIndirectWorkbench()
  await tryOpenStatisticsFromQuery()
})

onActivated(async () => {
  await surveyPanelRef.value?.loadScaleRules()
  await reloadIndirectWorkbench()
  await tryOpenStatisticsFromQuery()
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

    <SignalBand
      :metrics="signals"
      compact
      class="ie__signals"
      @metric-click="handleSignalMetricClick"
    />

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
