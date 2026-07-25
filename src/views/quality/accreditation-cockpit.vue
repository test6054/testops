<script setup lang="ts">
import type { AccreditationStandardClauseDiagnosisVO } from '@/apis/quality/accreditation'
import { SafetyCertificateOutlined } from '@ant-design/icons-vue'
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ALL_ACCREDITATION_CYCLE_PHASE_CODES } from '@/apis/quality/accreditation'
import { ConfirmationStatusCode } from '@/apis/quality/types'
import AccreditationAnnualPanel from '@/components/quality/accreditation/AccreditationAnnualPanel.vue'
import AccreditationAnnualReportMaterialPanel from '@/components/quality/accreditation/AccreditationAnnualReportMaterialPanel.vue'
import AccreditationCyclePanel from '@/components/quality/accreditation/AccreditationCyclePanel.vue'
import AccreditationEvidencePanel from '@/components/quality/accreditation/AccreditationEvidencePanel.vue'
import AccreditationOnsitePanel from '@/components/quality/accreditation/AccreditationOnsitePanel.vue'
import AccreditationSupportPanel from '@/components/quality/accreditation/AccreditationSupportPanel.vue'
import SelfAssessmentReportPanel from '@/components/quality/accreditation/SelfAssessmentReportPanel.vue'
import QualityPageContextBar from '@/components/quality/QualityPageContextBar.vue'
import QualityPlanGateStrip from '@/components/quality/QualityPlanGateStrip.vue'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiDrawer from '@/components/ui-guide/ui/UiDrawer.vue'
import UiDropdownAction from '@/components/ui-guide/ui/UiDropdownAction.vue'
import UiSectionTabs from '@/components/ui-guide/ui/UiSectionTabs.vue'
import SignalBand from '@/components/workbench/SignalBand.vue'
import StageRail from '@/components/workbench/StageRail.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import WorkbenchSurfaceCard from '@/components/workbench/WorkbenchSurfaceCard.vue'
import { useAccreditationWorkbench } from '@/composables/useAccreditationWorkbench'
import { useQualityScopedLoader } from '@/composables/useQualityPageScope'
import { useAuthStore } from '@/stores'
import { useQualityStore } from '@/stores/modules/quality'
import { AccreditationCockpitActionKeyCode, AccreditationCockpitActionKeyDescription } from '@/types/enums/accreditation-cockpit-action-key-enum'
import { AccreditationStandardClauseStatusCode } from '@/types/enums/accreditation-standard-clause-status-enum'
import type { SignalMetricIconTone } from '@/types/workbench'
import { isValidRole, RoleEnum } from '@/utils/permission'
import { strictEnumLabel } from '@/utils/strict-enum'

const {
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
  tabForPhase,
  goAiProgramReport,
  goArchive,
  goCourseMatrix,
  goImprovement,
} = useAccreditationWorkbench()

const qualityStore = useQualityStore()
const authStore = useAuthStore()
const router = useRouter()

/** 认证正式办理要求培养方案已确认；未确认仅钉条 */
const planGateMode = computed<'need-plan' | 'need-confirm' | null>(() => {
  if (!trainingPlanId.value) {
    return 'need-plan'
  }
  if (qualityStore.currentPlan?.confirmationStatus !== ConfirmationStatusCode.CONFIRMED) {
    return 'need-confirm'
  }
  return null
})

const workbenchReady = computed(() => !planGateMode.value && hasScope.value)

const professionDrawerOpen = ref(false)

const activeTab = ref('cycle')
const accTabItems = [
  { key: 'cycle', label: '认证周期' },
  { key: 'self-assessment', label: '自评报告' },
  { key: 'annual', label: '年度评价' },
  { key: 'annual-material', label: '年度报备材料' },
  { key: 'onsite', label: '现场考查' },
  { key: 'support', label: '师资与支持' },
  { key: 'evidence', label: '专家材料证据' },
]

const cyclePanelRef = ref<InstanceType<typeof AccreditationCyclePanel>>()
const annualPanelRef = ref<InstanceType<typeof AccreditationAnnualPanel>>()
const annualReportMaterialPanelRef
  = ref<InstanceType<typeof AccreditationAnnualReportMaterialPanel>>()
const onsitePanelRef = ref<InstanceType<typeof AccreditationOnsitePanel>>()
const supportPanelRef = ref<InstanceType<typeof AccreditationSupportPanel>>()
const evidencePanelRef = ref<InstanceType<typeof AccreditationEvidencePanel>>()

/** 标准条款诊断真源：后端 standardClauses，禁止本地用 conclusionReadiness 冒充 */
const standardClauses = computed(
  () => cockpit.value?.standardClauses ?? [],
)

const showAllStandardClauses = ref(false)

const blockedStandardClauses = computed(() =>
  standardClauses.value.filter(
    (item) => item.status === AccreditationStandardClauseStatusCode.BLOCKED,
  ),
)

const passedStandardClauseCount = computed(
  () => standardClauses.value.length - blockedStandardClauses.value.length,
)

const visibleStandardClauses = computed(() => {
  if (showAllStandardClauses.value || blockedStandardClauses.value.length === 0) {
    return standardClauses.value
  }
  return blockedStandardClauses.value
})

const standardCheckTitle = computed(() => {
  const code = cockpit.value?.standardCode
  const year = cockpit.value?.standardYear
  const name = cockpit.value?.standardName
  if (code && year) {
    return `${code} ${year}${name ? ` · ${name}` : ''}`
  }
  if (name) {
    return name
  }
  return '认证标准条款诊断'
})

const canCreateCycle = computed(
  () => workbenchReady.value && cockpit.value?.canCreateCycle === true,
)

const signalMetrics = computed(() => {
  const base = metrics.value
  if (!base.length) return base
  const evidenceCount = cockpit.value?.activeEvidenceCount
  return [
    ...base.map((item) => {
      const iconTone: SignalMetricIconTone
        = item.tone === 'green'
          ? 'green'
          : item.tone === 'blue'
            ? 'blue'
            : item.tone === 'purple'
              ? 'purple'
              : 'gray'
      return {
        ...item,
        iconTone,
        helper: item.helper ?? '认证驾驶舱',
      }
    }),
    {
      key: 'evidence',
      label: '专家材料证据',
      value: evidenceCount == null ? '—' : String(evidenceCount),
      iconTone: 'blue' as const,
      helper: '启用证据条目',
    },
  ]
})

const annualCourseCoverages = computed(() => cockpit.value?.annualCourseCoverages || [])

async function refreshAll() {
  await reloadCockpit(true)
  cyclePanelRef.value?.loadCycles()
  annualPanelRef.value?.loadPlans()
  annualReportMaterialPanelRef.value?.loadMaterials()
  onsitePanelRef.value?.loadPlans()
  supportPanelRef.value?.loadProfile()
  await evidencePanelRef.value?.loadEvidences()
}

function onPhaseSelect(stage: { key: string }) {
  const phase = ALL_ACCREDITATION_CYCLE_PHASE_CODES.find((code) => code === stage.key)
  if (phase) {
    activeTab.value = tabForPhase(phase)
  }
}

function onCreateCycle() {
  activeTab.value = 'cycle'
  cyclePanelRef.value?.openCreate()
}

/** 按后端 actionKey / routeName 跳转；已覆盖项也可进入查看 */
function goClauseAction(item: AccreditationStandardClauseDiagnosisVO): void {
  strictEnumLabel(AccreditationCockpitActionKeyDescription, item.actionKey, '认证条款整改动作')
  switch (item.actionKey) {
    case AccreditationCockpitActionKeyCode.OPEN_SUPPORT_TAB:
      activeTab.value = 'support'
      break
    case AccreditationCockpitActionKeyCode.OPEN_EVIDENCE_TAB:
      activeTab.value = 'evidence'
      break
    case AccreditationCockpitActionKeyCode.OPEN_COURSE_MATRIX:
      goCourseMatrix()
      break
    case AccreditationCockpitActionKeyCode.OPEN_IMPROVEMENT:
      goImprovement()
      break
    case AccreditationCockpitActionKeyCode.OPEN_TRAINING_PLAN_WORKBENCH:
      void router.push({ name: item.routeName || 'QualityTrainingPlanWorkbench' })
      break
    case AccreditationCockpitActionKeyCode.NONE:
      break
  }
}

function openProfessionConfig(name: string) {
  professionDrawerOpen.value = false
  void router.push({ name })
}

interface ProfessionConfigLink {
  name: string
  label: string
  roles?: readonly RoleEnum[]
}

const professionConfigLinks = computed((): ProfessionConfigLink[] => {
  const links: ProfessionConfigLink[] = [
    { name: 'QualityProgramEvaluationProfile', label: '专业评价口径' },
    { name: 'QualityProfessionAlgorithmProfile', label: '专业算法实例' },
    { name: 'QualityEvaluationWorkgroup', label: '评价工作组' },
    {
      name: 'QualityScaleConversionRule',
      label: '量表换算规则',
      roles: [RoleEnum.SUPER_ADMIN],
    },
  ]
  const role = authStore.userRole
  if (!isValidRole(role)) {
    return links.filter((link) => !link.roles)
  }
  return links.filter(
    (link) => !link.roles || link.roles.includes(role) || role === RoleEnum.SUPER_ADMIN,
  )
})

const accreditationMoreActionItems = computed(() => [
  { key: 'refresh', label: '刷新', disabled: !workbenchReady.value || cockpitLoading.value },
])

function onAccreditationMoreAction(key: string) {
  if (key === 'refresh') {
    void refreshAll()
  }
}

function onEvidenceCountChange(count: number): void {
  // 子 Tab 分页总数仅校验驾驶舱 activeEvidenceCount，不定义驾驶舱事实
  if (cockpit.value && cockpit.value.activeEvidenceCount !== count) {
    void reloadCockpit(true)
  }
}

useQualityScopedLoader(refreshAll, { watchScope: true, immediate: true, reloadOnActivated: true })
</script>

<template>
  <StageWorkbenchShell>
    <template #context>
      <QualityPageContextBar show-title title="工程教育认证驾驶舱">
        <template #actions>
          <UiButton variant="primary" size="sm" :disabled="!canCreateCycle" @click="onCreateCycle">
            新建认证周期
          </UiButton>
          <UiButton
            variant="outline"
            size="sm"
            :disabled="!workbenchReady"
            @click="professionDrawerOpen = true"
          >
            专业配置
          </UiButton>
          <UiButton variant="outline" size="sm" :disabled="!workbenchReady" @click="goCourseMatrix">
            课程矩阵
          </UiButton>
          <UiDropdownAction
            trigger-style="button"
            button-text="更多"
            :disabled="!workbenchReady"
            :items="accreditationMoreActionItems"
            @select="onAccreditationMoreAction"
          />
        </template>
      </QualityPageContextBar>
    </template>

    <template v-if="workbenchReady" #rail>
      <StageRail
        :stages="phaseStages"
        :active-key="activeCycle?.currentPhase"
        compact
        @select="onPhaseSelect"
      />
    </template>

    <template v-if="workbenchReady" #signal>
      <SignalBand :metrics="signalMetrics" variant="panel" compact />
    </template>

    <QualityPlanGateStrip v-if="planGateMode" :mode="planGateMode" class="acc-empty" />

    <template v-else-if="workbenchReady && !cockpit && !cockpitLoading">
      <UiEmpty
        size="sm"
        title="认证驾驶舱加载失败"
        description="切换培养方案或使用「刷新」后将再次拉取；失败态不展示空周期"
        class="acc-empty"
      />
    </template>

    <template v-else-if="workbenchReady && cockpit && !activeCycle">
      <UiEmpty
        size="sm"
        title="尚未创建认证周期"
        description="当前培养方案无进行中认证周期；创建后可开展自评、现场考查与结论登记"
        :action-label="canCreateCycle ? '新建认证周期' : undefined"
        class="acc-empty"
        @action="onCreateCycle"
      />
      <AccreditationCyclePanel
        ref="cyclePanelRef"
        :program-id="programId"
        :training-plan-id="trainingPlanId"
        :cockpit="cockpit"
        @refresh="refreshAll"
        @go-ai-report="goAiProgramReport"
      />
    </template>

    <template v-else-if="workbenchReady && activeCycle">
      <WorkbenchSurfaceCard v-if="standardClauses.length" class="acc-standard-check">
        <template #head>
          <div class="acc-standard-check__head">
            <div class="acc-standard-check__title">
              <SafetyCertificateOutlined />
              <span>{{ standardCheckTitle }}</span>
            </div>
            <div class="acc-standard-check__summary">
              <UiTag :tone="blockedStandardClauses.length ? 'orange' : 'green'" size="sm">
                已覆盖 {{ passedStandardClauseCount }}/{{ standardClauses.length }}
              </UiTag>
              <UiButton
                size="sm"
                v-if="blockedStandardClauses.length > 0"
                variant="ghost"
                @click="showAllStandardClauses = !showAllStandardClauses"
              >
                {{
                  showAllStandardClauses
                    ? '仅看待完善'
                    : `还有 ${blockedStandardClauses.length} 项待完善`
                }}
              </UiButton>
            </div>
          </div>
        </template>
        <p v-if="blockedStandardClauses.length === 0" class="acc-standard-check__ok">
          当前周期标准检查项均已覆盖；仍可点击条款查看依据。
        </p>
        <div class="acc-standard-check__grid">
          <button
            v-for="item in visibleStandardClauses"
            :key="item.clauseKey"
            type="button"
            class="acc-standard-check__item"
            :class="{
              'acc-standard-check__item--actionable':
                item.status === AccreditationStandardClauseStatusCode.BLOCKED
                || item.status === AccreditationStandardClauseStatusCode.PASSED,
            }"
            @click="goClauseAction(item)"
          >
            <UiTag
              :tone="
                item.status === AccreditationStandardClauseStatusCode.PASSED ? 'green' : 'orange'
              "
              size="sm"
            >
              {{
                item.status === AccreditationStandardClauseStatusCode.PASSED ? '已覆盖' : '待完善'
              }}
            </UiTag>
            <span class="acc-standard-check__label">{{ item.clauseTitle }}</span>
            <span class="acc-standard-check__desc">{{ item.clauseDescription }}</span>
            <span class="acc-standard-check__reason">{{ item.blockingReason }}</span>
            <span class="acc-standard-check__fix">
              {{
                item.status === AccreditationStandardClauseStatusCode.PASSED
                  ? '查看依据 →'
                  : '去完善 →'
              }}
            </span>
          </button>
        </div>
        <div v-if="annualCourseCoverages.length" class="acc-course-coverage">
          <span class="acc-course-coverage__title">已到期年度课程评价材料覆盖</span>
          <span
            v-for="coverage in annualCourseCoverages"
            :key="coverage.reportYear"
            class="acc-course-coverage__item"
          >
            {{ coverage.reportYear }} 年 {{ coverage.coveredCourseCount }}/{{
              coverage.requiredCourseCount
            }}
          </span>
        </div>
      </WorkbenchSurfaceCard>

      <UiSectionTabs
        v-model="activeTab"
        :items="accTabItems"
        compact
        divided
        class="acc-tabs"
      />
      <AccreditationCyclePanel
        v-if="activeTab === 'cycle'"
        ref="cyclePanelRef"
        :program-id="programId"
        :training-plan-id="trainingPlanId"
        :cockpit="cockpit"
        @refresh="refreshAll"
        @go-ai-report="goAiProgramReport"
      />
      <SelfAssessmentReportPanel
        v-else-if="activeTab === 'self-assessment'"
        :cockpit="cockpit"
        :active-cycle="activeCycle"
        :program-id="programId"
        :training-plan-id="trainingPlanId"
        @go-ai-report="goAiProgramReport"
        @saved="refreshAll"
      />
      <AccreditationAnnualPanel
        v-else-if="activeTab === 'annual'"
        ref="annualPanelRef"
        :program-id="programId"
        :training-plan-id="trainingPlanId"
        :active-cycle-id="activeCycleId"
        @refresh="refreshAll"
      />
      <AccreditationAnnualReportMaterialPanel
        v-else-if="activeTab === 'annual-material'"
        ref="annualReportMaterialPanelRef"
        :program-id="programId"
        :training-plan-id="trainingPlanId"
        :active-cycle="activeCycle"
        :active-cycle-id="activeCycleId"
        @refresh="refreshAll"
      />
      <AccreditationOnsitePanel
        v-else-if="activeTab === 'onsite'"
        ref="onsitePanelRef"
        :program-id="programId"
        :training-plan-id="trainingPlanId"
        :active-cycle="activeCycle"
        :active-cycle-id="activeCycleId"
        @refresh="refreshAll"
      />
      <AccreditationSupportPanel
        v-else-if="activeTab === 'support'"
        ref="supportPanelRef"
        :program-id="programId"
        :training-plan-id="trainingPlanId"
        @refresh="refreshAll"
      />
      <AccreditationEvidencePanel
        v-else
        ref="evidencePanelRef"
        :program-id="programId"
        :training-plan-id="trainingPlanId"
        :active-cycle="activeCycle"
        :cockpit="cockpit"
        @count-change="onEvidenceCountChange"
        @exported="goArchive"
      />
    </template>

    <UiDrawer v-model:open="professionDrawerOpen" title="专业配置" :width="420" :hide-footer="true">
      <div class="acc-profession-links">
        <UiButton
          v-for="link in professionConfigLinks"
          :key="link.name"
          variant="outline"
          size="sm"
          block
          @click="openProfessionConfig(link.name)"
        >
          {{ link.label }}
        </UiButton>
      </div>
    </UiDrawer>
  </StageWorkbenchShell>
</template>

<style scoped>
.acc-profession-links {
  display: grid;
  gap: var(--dp-space-component-tight);
}
.acc-scope__select {
  width: 200px;
}
.acc-empty {
  margin: var(--dp-space-block) 0;
}
.acc-standard-check {
  margin-bottom: var(--dp-space-component);
}
.acc-standard-check__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--dp-space-component);
  width: 100%;
  flex-wrap: wrap;
}
.acc-standard-check__title {
  display: flex;
  align-items: center;
  gap: var(--dp-space-component-tight);
  font-size: var(--dp-font-size-md);
  font-weight: 600;
}
.acc-standard-check__summary {
  display: flex;
  align-items: center;
  gap: var(--dp-space-component-tight);
}
.acc-standard-check__ok {
  margin: 0;
  font-size: var(--dp-font-size-sm);
  color: var(--dp-text-secondary);
}
.acc-standard-check__grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: var(--dp-space-component-tight);
}
.acc-standard-check__item {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: var(--dp-space-component-xs) var(--dp-space-component-tight);
  align-items: center;
  padding: var(--dp-space-component-tight);
  border: 1px solid var(--dp-border);
  border-radius: var(--dp-radius-control);
  background: var(--dp-surface);
  text-align: left;
  width: 100%;
  cursor: pointer;
  transition: border-color var(--dp-duration-normal) var(--dp-ease-default);
}
.acc-standard-check__item:hover,
.acc-standard-check__item--actionable:hover {
  border-color: var(--dp-color-primary-border);
}
.acc-standard-check__label {
  font-weight: 600;
}
.acc-standard-check__desc {
  grid-column: 1 / -1;
  font-size: var(--dp-font-size-xs);
  color: var(--dp-text-secondary);
}
.acc-standard-check__reason {
  grid-column: 1 / -1;
  font-size: var(--dp-font-size-xs);
  color: var(--dp-text-muted);
}
.acc-standard-check__fix {
  grid-column: 1 / -1;
  font-size: var(--dp-font-size-xs);
  font-weight: 600;
  color: var(--dp-color-primary);
}
.acc-course-coverage {
  display: flex;
  flex-wrap: wrap;
  gap: var(--dp-space-component-tight);
  align-items: center;
  margin-top: var(--dp-space-component);
  padding-top: var(--dp-space-component);
  border-top: 1px dashed var(--dp-border);
  font-size: var(--dp-font-size-xs);
}
.acc-course-coverage__title {
  font-weight: 600;
  color: var(--dp-text-secondary);
}
.acc-course-coverage__item {
  padding: 2px var(--dp-space-component-tight);
  border-radius: var(--dp-radius-full);
  background: color-mix(in srgb, var(--dp-success) 12%, transparent);
  color: var(--dp-success);
}
.acc-tabs :deep(.ant-tabs-nav) {
  margin-bottom: var(--dp-space-component);
}
</style>
