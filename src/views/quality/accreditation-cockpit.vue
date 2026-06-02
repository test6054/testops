<script setup lang="ts">
import type { AccreditationCyclePhase } from '@/apis/quality'
import { computed, onMounted, ref } from 'vue'
import AccreditationAnnualPanel from '@/components/quality/accreditation/AccreditationAnnualPanel.vue'
import AccreditationCyclePanel from '@/components/quality/accreditation/AccreditationCyclePanel.vue'
import AccreditationEvidencePanel from '@/components/quality/accreditation/AccreditationEvidencePanel.vue'
import AccreditationOnsitePanel from '@/components/quality/accreditation/AccreditationOnsitePanel.vue'
import AccreditationSupportPanel from '@/components/quality/accreditation/AccreditationSupportPanel.vue'
import { ProgramSelector, TrainingPlanSelector } from '@/components/quality/selectors'
import { UiButton, UiEmpty } from '@/components/ui-guide/ui'
import { ContextBar, SignalBand, StageRail, StageWorkbenchShell } from '@/components/workbench'
import { useAccreditationWorkbench } from '@/composables/useAccreditationWorkbench'

const {
  qualityStore,
  cockpit,
  cockpitLoading,
  programId,
  trainingPlanId,
  activeCycle,
  activeCycleId,
  hasScope,
  phaseStages,
  metrics,
  reloadCockpit,
  handleProgramChange,
  handleTrainingPlanChange,
  tabForPhase,
  goAiProgramReport,
  goArchive,
  goCourseMatrix,
} = useAccreditationWorkbench()

const activeTab = ref('cycle')
const evidenceCount = ref(0)

const cyclePanelRef = ref<InstanceType<typeof AccreditationCyclePanel>>()
const annualPanelRef = ref<InstanceType<typeof AccreditationAnnualPanel>>()
const onsitePanelRef = ref<InstanceType<typeof AccreditationOnsitePanel>>()
const supportPanelRef = ref<InstanceType<typeof AccreditationSupportPanel>>()
const evidencePanelRef = ref<InstanceType<typeof AccreditationEvidencePanel>>()

const deadlineHints = computed(() => {
  const c = cockpit.value
  if (!c) return []
  const hints: string[] = []
  if (c.conditionalDueDaysRemaining != null) {
    hints.push(`有条件改进剩余 ${c.conditionalDueDaysRemaining} 天`)
  }
  if (c.onsiteReportDueDaysRemaining != null) {
    hints.push(`考查报告剩余 ${c.onsiteReportDueDaysRemaining} 天`)
  }
  return hints
})

const signalMetrics = computed(() => {
  const base = metrics.value
  if (!base.length) return base
  return [...base, { key: 'evidence', label: '专家材料证据', value: String(evidenceCount.value) }]
})

async function refreshAll() {
  await reloadCockpit()
  cyclePanelRef.value?.loadCycles()
  annualPanelRef.value?.loadPlans()
  onsitePanelRef.value?.loadPlans()
  supportPanelRef.value?.loadProfile()
  await evidencePanelRef.value?.loadEvidences()
}

function onPhaseSelect(stage: { key: string }) {
  activeTab.value = tabForPhase(stage.key as AccreditationCyclePhase)
}

function onCreateCycle() {
  activeTab.value = 'cycle'
  cyclePanelRef.value?.openCreate()
}

onMounted(refreshAll)
</script>

<template>
  <StageWorkbenchShell>
    <template #context>
      <ContextBar
        title="工程教育认证驾驶舱"
        subtitle="校内自评 → 审阅 → 现场考查 → 结论 → 保持改进（不含 eqem 对接）"
      >
        <template #status>
          <ProgramSelector
            :value="programId || null"
            class="acc-scope__select"
            @update:value="handleProgramChange"
          />
          <TrainingPlanSelector
            :value="trainingPlanId || null"
            :program-id="programId || null"
            class="acc-scope__select"
            @update:value="handleTrainingPlanChange"
          />
        </template>
        <template #actions>
          <UiButton
            variant="outline"
            size="sm"
            :disabled="!hasScope"
            :loading="cockpitLoading"
            @click="refreshAll"
          >
            刷新
          </UiButton>
          <UiButton variant="outline" size="sm" :disabled="!hasScope" @click="goCourseMatrix">
            课程矩阵
          </UiButton>
          <UiButton variant="primary" size="sm" :disabled="!hasScope" @click="onCreateCycle">
            新建认证周期
          </UiButton>
        </template>
      </ContextBar>
    </template>

    <template v-if="hasScope" #rail>
      <StageRail
        :stages="phaseStages"
        :active-key="activeCycle?.currentPhase"
        compact
        @select="onPhaseSelect"
      />
    </template>

    <template v-if="hasScope" #signal>
      <SignalBand :metrics="signalMetrics" compact />
    </template>

    <UiEmpty v-if="!hasScope" description="请先选择专业与培养方案" class="acc-empty" />

    <template v-else>
      <a-alert
        v-if="deadlineHints.length"
        type="warning"
        show-icon
        :message="deadlineHints.join(' · ')"
        class="acc-deadline"
      />

      <a-tabs v-model:active-key="activeTab" class="acc-tabs">
        <a-tab-pane key="cycle" tab="认证周期">
          <AccreditationCyclePanel
            ref="cyclePanelRef"
            :program-id="programId"
            :training-plan-id="trainingPlanId"
            :cockpit="cockpit"
            @refresh="refreshAll"
            @go-ai-report="goAiProgramReport"
          />
        </a-tab-pane>
        <a-tab-pane key="annual" tab="年度评价">
          <AccreditationAnnualPanel
            ref="annualPanelRef"
            :program-id="programId"
            :training-plan-id="trainingPlanId"
            :active-cycle-id="activeCycleId"
            @refresh="refreshAll"
          />
        </a-tab-pane>
        <a-tab-pane key="onsite" tab="现场考查">
          <AccreditationOnsitePanel
            ref="onsitePanelRef"
            :program-id="programId"
            :training-plan-id="trainingPlanId"
            :active-cycle-id="activeCycleId"
            @refresh="refreshAll"
          />
        </a-tab-pane>
        <a-tab-pane key="support" tab="师资与支持">
          <AccreditationSupportPanel
            ref="supportPanelRef"
            :program-id="programId"
            :training-plan-id="trainingPlanId"
            @refresh="refreshAll"
          />
        </a-tab-pane>
        <a-tab-pane key="evidence" tab="专家材料证据">
          <AccreditationEvidencePanel
            ref="evidencePanelRef"
            :program-id="programId"
            :training-plan-id="trainingPlanId"
            @count-change="evidenceCount = $event"
            @exported="goArchive"
          />
        </a-tab-pane>
      </a-tabs>
    </template>
  </StageWorkbenchShell>
</template>

<style scoped>
.acc-scope__select {
  width: 200px;
}
.acc-empty {
  margin: 48px 0;
}
.acc-guide {
  margin-bottom: 12px;
}
.acc-deadline {
  margin-bottom: 12px;
}
.acc-tabs :deep(.ant-tabs-nav) {
  margin-bottom: 12px;
}
</style>
