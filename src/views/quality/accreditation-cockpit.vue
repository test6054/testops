<script setup lang="ts">
import { SafetyCertificateOutlined } from '@ant-design/icons-vue'
import { computed, onActivated, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  AccreditationCycleStatusCode,
  ALL_ACCREDITATION_CYCLE_PHASE_CODES,
} from '@/apis/quality/accreditation'
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
import { useQualityStore } from '@/stores/modules/quality'

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
const evidenceCount = ref(0)

const cyclePanelRef = ref<InstanceType<typeof AccreditationCyclePanel>>()
const annualPanelRef = ref<InstanceType<typeof AccreditationAnnualPanel>>()
const annualReportMaterialPanelRef
  = ref<InstanceType<typeof AccreditationAnnualReportMaterialPanel>>()
const onsitePanelRef = ref<InstanceType<typeof AccreditationOnsitePanel>>()
const supportPanelRef = ref<InstanceType<typeof AccreditationSupportPanel>>()
const evidencePanelRef = ref<InstanceType<typeof AccreditationEvidencePanel>>()

function readinessReady(itemKey: string): boolean {
  return (
    cockpit.value?.conclusionReadinessItems?.find((item) => item.itemKey === itemKey)?.ready
    === true
  )
}

/** CEEAA 2024 标准对齐检查：以驾驶舱 conclusionReadinessItems 为真源，禁止用 activeCycle 存在性误判通过 */
const ceeaa2024CheckItems = computed(() => {
  const c = cockpit.value
  return [
    {
      key: '4.1-student',
      label: '4.1 学生·思政引领',
      desc: '学生管理制度中应体现思政引领和品德培养措施',
      passed:
        readinessReady('SELF_ASSESSMENT_ACCEPTED') && readinessReady('SUPPORT_PROFILE_CONFIRMED'),
    },
    {
      key: '4.2-objective',
      label: '4.2 培养目标·为党育人',
      desc: '培养目标应符合"为党育人、为国育才"总要求',
      passed:
        readinessReady('GRADUATION_REQUIREMENT_READY')
        && readinessReady('PROGRAM_QUALITY_REPORT_READY'),
    },
    {
      key: '4.3-graduate',
      label: '4.3 毕业要求·工程报国',
      desc: '毕业要求应包含工程伦理和职业规范（含工程报国意识）',
      passed:
        readinessReady('GRADUATION_REQUIREMENT_READY')
        && readinessReady('ACHIEVEMENT_RESULT_READY'),
    },
    {
      key: '4.4-curriculum',
      label: '4.4 课程体系·价值导向',
      desc: '课程设置和教学实施应体现正确的价值导向',
      passed:
        readinessReady('ENABLED_QUALITY_COURSE_READY')
        && readinessReady('COURSE_GOAL_READY')
        && readinessReady('SUPPORT_MATRIX_READY'),
    },
    {
      key: '4.5-faculty',
      label: '4.5 师资队伍·师德师风',
      desc: '教师应具有良好的师德师风',
      passed: readinessReady('FACULTY_PROFILE_READY'),
    },
    {
      key: '4.6-support',
      label: '4.6 支持条件',
      desc: '教室/实验室/设备等支持条件',
      passed: c?.supportProfileConfirmed === true || readinessReady('SUPPORT_PROFILE_CONFIRMED'),
    },
    {
      key: '4.7-achievement',
      label: '4.7 持续改进·达成度闭环',
      desc: '"评价→分析→改进→再评价"闭环机制',
      passed:
        readinessReady('ACHIEVEMENT_RESULT_READY')
        && readinessReady('IMPROVEMENT_TASK_CLOSED')
        && c?.annualReportMaterialsReady === true,
    },
  ]
})

const canCreateCycle = computed(
  () => hasScope.value && activeCycle.value?.cycleStatus !== AccreditationCycleStatusCode.ACTIVE,
)

const signalMetrics = computed(() => {
  const base = metrics.value
  if (!base.length) return base
  return [
    ...base.map((item) => ({
      ...item,
      iconTone: item.tone === 'green'
        ? 'green' as const
        : item.tone === 'red'
          ? 'red' as const
          : item.tone === 'orange'
            ? 'orange' as const
            : item.tone === 'blue'
              ? 'blue' as const
              : 'gray' as const,
      helper: item.helper ?? '认证驾驶舱',
    })),
    {
      key: 'evidence',
      label: '专家材料证据',
      value: String(evidenceCount.value),
      iconTone: 'blue' as const,
      helper: '证据条目',
    },
  ]
})

const annualCourseCoverages = computed(() => cockpit.value?.annualCourseCoverages || [])

const showAllCeeaaChecks = ref(false)

const ceeaaPendingItems = computed(() => ceeaa2024CheckItems.value.filter((item) => !item.passed))

const ceeaaPassedCount = computed(
  () => ceeaa2024CheckItems.value.length - ceeaaPendingItems.value.length,
)

const visibleCeeaaCheckItems = computed(() => {
  if (showAllCeeaaChecks.value || ceeaaPendingItems.value.length === 0) {
    return ceeaa2024CheckItems.value
  }
  return ceeaaPendingItems.value
})

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

/** CEEAA 未通过项一键跳转至对应修复页面或驾驶舱 Tab */
function goFixCheckItem(key: string): void {
  switch (key) {
    case '4.1-student':
    case '4.2-objective':
    case '4.3-graduate':
      void router.push({ name: 'QualityTrainingPlanWorkbench' })
      return
    case '4.4-curriculum':
      goCourseMatrix()
      return
    case '4.5-faculty':
      void router.push({ name: 'QualityEvaluationWorkgroup' })
      return
    case '4.6-support':
      activeTab.value = 'support'
      return
    case '4.7-achievement':
      goImprovement()
  }
}

function openProfessionConfig(name: string) {
  professionDrawerOpen.value = false
  void router.push({ name })
}


const accreditationMoreActionItems = computed(() => [
  { key: 'refresh', label: '刷新', disabled: !workbenchReady.value || cockpitLoading.value },
])

function onAccreditationMoreAction(key: string) {
  if (key === 'refresh') {
    void refreshAll()
  }
}

onMounted(refreshAll)
useQualityScopedLoader(refreshAll, { watchScope: true, immediate: false, reloadOnActivated: false })

onActivated(() => {
  if (hasScope.value) {
    void refreshAll()
  }
})
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

    <template v-else-if="workbenchReady">
      <WorkbenchSurfaceCard v-if="activeCycle" class="acc-standard-check">
        <template #head>
          <div class="acc-standard-check__head">
            <div class="acc-standard-check__title">
              <SafetyCertificateOutlined />
              <span>CEEAA 2024 标准对齐</span>
            </div>
            <div class="acc-standard-check__summary">
              <UiTag :tone="ceeaaPendingItems.length ? 'orange' : 'green'" size="sm">
                已覆盖 {{ ceeaaPassedCount }}/{{ ceeaa2024CheckItems.length }}
              </UiTag>
              <UiButton
                size="sm"
                v-if="ceeaaPendingItems.length > 0"
                variant="ghost"
                @click="showAllCeeaaChecks = !showAllCeeaaChecks"
              >
                {{
                  showAllCeeaaChecks ? '仅看待完善' : `还有 ${ceeaaPendingItems.length} 项待完善`
                }}
              </UiButton>
            </div>
          </div>
        </template>
        <p v-if="ceeaaPendingItems.length === 0" class="acc-standard-check__ok">
          当前周期标准检查项均已覆盖，可继续下方认证工作。
        </p>
        <div v-else class="acc-standard-check__grid">
          <button
            v-for="item in visibleCeeaaCheckItems"
            :key="item.key"
            type="button"
            class="acc-standard-check__item"
            :class="{ 'acc-standard-check__item--actionable': !item.passed }"
            :disabled="item.passed"
            @click="goFixCheckItem(item.key)"
          >
            <UiTag :tone="item.passed ? 'green' : 'orange'" size="sm">
              {{ item.passed ? '已覆盖' : '待完善' }}
            </UiTag>
            <span class="acc-standard-check__label">{{ item.label }}</span>
            <span class="acc-standard-check__desc">{{ item.desc }}</span>
            <span v-if="!item.passed" class="acc-standard-check__fix">去完善 →</span>
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
        @count-change="evidenceCount = $event"
        @exported="goArchive"
      />
    </template>

    <UiDrawer v-model:open="professionDrawerOpen" title="专业配置" :width="420" :hide-footer="true">
      <div class="acc-profession-links">
        <UiButton
          variant="outline"
          size="sm"
          block
          @click="openProfessionConfig('QualityProgramEvaluationProfile')"
        >
          专业评价口径
        </UiButton>
        <UiButton
          variant="outline"
          size="sm"
          block
          @click="openProfessionConfig('QualityProfessionAlgorithmProfile')"
        >
          专业算法实例
        </UiButton>
        <UiButton
          variant="outline"
          size="sm"
          block
          @click="openProfessionConfig('QualityEvaluationWorkgroup')"
        >
          评价工作组
        </UiButton>
        <UiButton
          variant="outline"
          size="sm"
          block
          @click="openProfessionConfig('QualityScaleConversionRule')"
        >
          量表换算规则
        </UiButton>
      </div>
    </UiDrawer>
  </StageWorkbenchShell>
</template>

<style scoped>
.acc-profession-links {
  display: grid;
  gap: 8px;
}
.acc-scope__select {
  width: 200px;
}
.acc-empty {
  margin: var(--dp-space-4) 0;
}
.acc-standard-check {
  margin-bottom: 12px;
}
.acc-standard-check__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  width: 100%;
  flex-wrap: wrap;
}
.acc-standard-check__title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 600;
}
.acc-standard-check__summary {
  display: flex;
  align-items: center;
  gap: 8px;
}
.acc-standard-check__ok {
  margin: 0;
  font-size: 13px;
  color: var(--dp-text-secondary);
}
.acc-standard-check__grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 8px;
}
.acc-standard-check__item {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 4px 8px;
  align-items: center;
  padding: 8px;
  border: 1px solid var(--dp-border);
  border-radius: var(--dp-radius-control);
  background: var(--dp-surface);
  text-align: left;
  width: 100%;

  &:disabled {
    cursor: default;
  }
}
.acc-standard-check__item--actionable {
  cursor: pointer;
  transition: border-color 0.2s ease;
}
.acc-standard-check__item--actionable:hover {
  border-color: var(--dp-color-primary-border);
}
.acc-standard-check__label {
  font-weight: 600;
}
.acc-standard-check__desc {
  grid-column: 1 / -1;
  font-size: 12px;
  color: var(--dp-text-secondary);
}
.acc-standard-check__fix {
  grid-column: 1 / -1;
  font-size: 12px;
  font-weight: 600;
  color: var(--dp-color-primary);
}
.acc-course-coverage {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px dashed var(--dp-border);
  font-size: 12px;
}
.acc-course-coverage__title {
  font-weight: 600;
  color: var(--dp-text-secondary);
}
.acc-course-coverage__item {
  padding: 2px 8px;
  border-radius: var(--dp-radius-full);
  background: color-mix(in srgb, var(--dp-success) 12%, transparent);
  color: var(--dp-success);
}
.acc-tabs :deep(.ant-tabs-nav) {
  margin-bottom: 12px;
}
</style>
