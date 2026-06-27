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

const signals = computed<SignalMetric[]>(() => {
  const forms = surveyPanelRef.value?.forms ?? []
  const items = surveyPanelRef.value?.items ?? []
  const validCountMap = surveyPanelRef.value?.validCountMap ?? new Map<string, number>()
  const responses = responsePanelRef.value?.responses ?? []

  const enabledForms = forms.filter((f) => f.enabled).length
  const totalItems = items.length
  const totalValid = Array.from(validCountMap.values()).reduce((sum, n) => sum + n, 0)
  const expectedSampleSum = forms.reduce((sum, f) => sum + (f.expectedSample ?? 0), 0)
  const validResponses = responses.filter((r) => r.validFlag).length
  const invalidResponses = responses.filter((r) => !r.validFlag).length
  const sampleRatio
    = expectedSampleSum > 0 ? Number((totalValid / expectedSampleSum).toFixed(2)) : 0

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
      key: 'valid-total',
      label: '有效样本',
      value: totalValid,
      tone: totalValid > 0 ? 'green' : 'gray',
    },
    {
      key: 'sample-ratio',
      label: '样本达成率',
      value: sampleRatio,
      tone: sampleRatio >= 1 ? 'green' : sampleRatio > 0 ? 'orange' : 'gray',
    },
    {
      key: 'responses-valid',
      label: '当前题项有效',
      value: validResponses,
      tone: validResponses > 0 ? 'green' : 'gray',
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
  if (selectedForm.value) {
    await surveyPanelRef.value?.loadItems()
    await surveyPanelRef.value?.refreshValidCounts()
    if (selectedItem.value) {
      await responsePanelRef.value?.loadResponses()
    }
  }
}

useQualityScopedLoader(handleScopeChange, { watchScope: true, immediate: false, reloadOnActivated: false })

async function onFormsReloaded(formId?: string) {
  await surveyPanelRef.value?.reloadFormsAndSync(formId)
}

async function onImportDone() {
  await surveyPanelRef.value?.refreshValidCounts()
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
  <QualityIngestPageShell>
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
    margin-bottom: 16px;
    padding: 16px 20px;
    background: var(--dp-surface-elevated);
    border: 1px solid var(--dp-border);
    border-radius: var(--dp-radius-panel);
  }
}
</style>
