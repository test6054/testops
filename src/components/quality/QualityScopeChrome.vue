<script lang="ts" setup>
import type { TrainingPlanVO } from '@/apis/quality/training-plan'
/**
 * 质量评价域唯一 scope 选择器：按 scopeProfile 裁剪字段，写入 qualityStore。
 * 禁止 silent 自动选首项；仅恢复 persist 选择。
 */
import type { BadgeTone } from '@/components/ui-guide/ui/types'
import { computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { trainingPlanApi } from '@/apis/quality/training-plan'
import { CONFIRMATION_STATUS_COLOR, ConfirmationStatusCode, ConfirmationStatusDescription } from '@/apis/quality/types'
import {
  CourseSelector,
  ProgramSelector,
  TrainingPlanSelector,
} from '@/components/quality/selectors'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiSelect from '@/components/ui-guide/ui/UiSelect.vue'
import { useQualityScopeProfile } from '@/composables/useQualityScopeProfile'
import { useQualityStore } from '@/stores/modules/quality'
import { parseSemesterCode, SemesterOptions } from '@/types/enums/semester-enum'
import {
  generateAcademicYearOptions,
  getDefaultAcademicYearAndSemester,
} from '@/utils/academic-year'
import {
  buildQualityPlanWorkbenchLocation,
  QUALITY_PLAN_GATE_REASON_UNCONFIRMED,
} from '@/utils/quality-plan-guard'
import { strictEnumLabel, strictEnumTone } from '@/utils/strict-enum'

defineOptions({ name: 'QualityScopeChrome' })

const emit = defineEmits<{
  change: []
}>()

const router = useRouter()
const qualityStore = useQualityStore()
const { scopeProfile } = useQualityScopeProfile()

const programId = computed(() => qualityStore.currentProgramId || null)
const trainingPlanId = computed(() => qualityStore.currentTrainingPlanId || null)

const showProgram = computed(() => scopeProfile.value !== 'none')
const showPlan = computed(
  () =>
    scopeProfile.value === 'plan'
    || scopeProfile.value === 'plan-period'
    || scopeProfile.value === 'plan-course'
    || scopeProfile.value === 'accreditation',
)
const showPeriod = computed(
  () => scopeProfile.value === 'plan-period' || scopeProfile.value === 'plan-course',
)
const showCourse = computed(() => scopeProfile.value === 'plan-course')

const needsPlanSelection = computed(() => showPlan.value && !trainingPlanId.value)

const needsPlanConfirmation = computed(() => {
  if (!showPlan.value || !trainingPlanId.value) {
    return false
  }
  return qualityStore.currentPlan?.confirmationStatus !== ConfirmationStatusCode.CONFIRMED
})

const schoolYearOptions = computed(() => {
  const years = generateAcademicYearOptions()
  const current = qualityStore.currentSchoolYear.trim()
  const options = years.map((year) => ({ label: year, value: year }))
  if (current && !years.includes(current)) {
    return [{ label: current, value: current }, ...options]
  }
  return options
})

const planConfirmationLabel = computed(() => {
  if (!qualityStore.currentPlan?.confirmationStatus) {
    return ''
  }
  return strictEnumLabel(
    ConfirmationStatusDescription,
    qualityStore.currentPlan.confirmationStatus,
    '培养方案确认状态',
  )
})

const planConfirmationTone = computed((): BadgeTone => {
  if (!qualityStore.currentPlan?.confirmationStatus) {
    return 'gray'
  }
  return strictEnumTone(
    CONFIRMATION_STATUS_COLOR,
    qualityStore.currentPlan.confirmationStatus,
    '培养方案确认状态',
  )
})

async function resolvePlanForScope(): Promise<TrainingPlanVO | undefined> {
  if (!qualityStore.currentTrainingPlanId) {
    return undefined
  }
  if (qualityStore.currentPlan) {
    return qualityStore.currentPlan
  }
  return trainingPlanApi.detail(qualityStore.currentTrainingPlanId)
}

function applySchoolYearFromPlan(plan?: TrainingPlanVO | null): void {
  const schoolYear = plan?.schoolYear?.trim() || getDefaultAcademicYearAndSemester().academicYear
  if (!qualityStore.currentSchoolYear.trim()) {
    qualityStore.setSchoolPeriod(schoolYear, undefined)
  }
}

async function restorePersistedScope(): Promise<void> {
  try {
    if (!qualityStore.majorCategoryOptions.length) {
      await qualityStore.loadMajorCategoryOptions()
    }
    if (qualityStore.currentProgramId || qualityStore.currentTrainingPlanId) {
      await qualityStore.loadTrainingPlanOptions({
        programId: qualityStore.currentProgramId || undefined,
      })
    }
    if (qualityStore.currentTrainingPlanId) {
      const plan = await resolvePlanForScope()
      applySchoolYearFromPlan(plan)
    }
  } catch {
    // 由业务页展示空态 / 错误
  }
}

function handleProgramChange(value: string | null): void {
  if (value) {
    qualityStore.setProgram(value)
  } else {
    qualityStore.reset()
  }
  emit('change')
}

function handleTrainingPlanValueSync(value: string | null): void {
  const normalized = value?.trim() || ''
  if (normalized !== qualityStore.currentTrainingPlanId) {
    qualityStore.setTrainingPlan(normalized)
  }
}

function handleTrainingPlanChange(value: string | null, option?: TrainingPlanVO): void {
  qualityStore.setTrainingPlan(value || '')
  applySchoolYearFromPlan(option)
  emit('change')
}

function handleSchoolYearChange(raw: unknown): void {
  const value = typeof raw === 'string' ? raw.trim() : ''
  qualityStore.setSchoolPeriod(value, value ? undefined : null)
  emit('change')
}

function handleSemesterChange(raw: unknown): void {
  if (raw === undefined || raw === null || raw === '') {
    qualityStore.setSchoolPeriod(undefined, null)
    emit('change')
    return
  }
  if (typeof raw !== 'string') {
    return
  }
  const semester = parseSemesterCode(raw)
  if (!semester) {
    return
  }
  if (!qualityStore.currentSchoolYear.trim()) {
    return
  }
  qualityStore.setSchoolPeriod(undefined, semester)
  emit('change')
}

function handleCourseChange(value: string | null): void {
  qualityStore.setQualityCourse(value || '')
  emit('change')
}

function goSelectPlan(): void {
  void router.push({ name: 'QualityTrainingPlanWorkbench' })
}

function goConfirmPlan(): void {
  void router.push(buildQualityPlanWorkbenchLocation(QUALITY_PLAN_GATE_REASON_UNCONFIRMED))
}

onMounted(() => {
  qualityStore.sanitizePersistedScope()
  void restorePersistedScope()
})
</script>

<template>
  <div class="quality-scope-chrome">
    <ProgramSelector
      v-if="showProgram"
      :value="programId"
      :width="220"
      class="quality-scope-chrome__select"
      @update:value="handleProgramChange"
    />
    <TrainingPlanSelector
      v-if="showPlan"
      :value="trainingPlanId"
      :program-id="programId"
      :width="260"
      class="quality-scope-chrome__select"
      @update:value="handleTrainingPlanValueSync"
      @change="handleTrainingPlanChange"
    />
    <template v-if="needsPlanSelection">
      <span class="quality-scope-chrome__hint">请选择培养方案</span>
      <UiButton variant="outline" size="sm" @click="goSelectPlan"> 去培养方案工作台 </UiButton>
    </template>
    <template v-else>
      <UiSelect
        v-if="showPeriod"
        :model-value="qualityStore.currentSchoolYear || undefined"
        placeholder="学年"
        class="quality-scope-chrome__select quality-scope-chrome__select--year"
        size="sm"
        allow-clear
        allow-search
        option-filter-prop="label"
        :options="schoolYearOptions"
        @update:model-value="handleSchoolYearChange"
      />
      <UiSelect
        v-if="showPeriod"
        :model-value="qualityStore.currentSemester || undefined"
        placeholder="学期"
        class="quality-scope-chrome__select quality-scope-chrome__select--semester"
        size="sm"
        allow-clear
        :disabled="!qualityStore.currentSchoolYear.trim()"
        :options="[...SemesterOptions]"
        @update:model-value="handleSemesterChange"
      />
      <CourseSelector
        v-if="showCourse"
        :value="qualityStore.currentQualityCourseId || null"
        :training-plan-id="trainingPlanId"
        :program-id="programId"
        :school-year="qualityStore.currentSchoolYear || null"
        :semester="qualityStore.currentSemester || null"
        :width="240"
        class="quality-scope-chrome__select"
        @update:value="handleCourseChange"
      />
      <UiTag v-if="qualityStore.currentPlan" tone="blue" size="sm">
        {{ qualityStore.currentPlan.planCode }} · {{ qualityStore.currentPlan.planName }}
      </UiTag>
      <UiTag v-if="showPlan && planConfirmationLabel" :tone="planConfirmationTone" size="sm">
        {{ planConfirmationLabel }}
      </UiTag>
      <UiButton
        v-if="needsPlanConfirmation"
        size="sm"
        @click="goConfirmPlan"
      >
        去确认方案
      </UiButton>
    </template>
  </div>
</template>

<style lang="scss" scoped>
.quality-scope-chrome {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  min-height: 40px;

  &__hint {
    font-size: var(--dp-font-size-sm);
    color: var(--dp-text-secondary);
  }

  &__select {
    min-width: 0;

    &--year {
      width: 140px;
    }

    &--semester {
      width: 120px;
    }
  }
}
</style>
