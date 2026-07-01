<script lang="ts" setup>
/**
 * 质量评价域唯一 scope 选择器：按 scopeProfile 裁剪字段，写入 qualityStore。
 * 禁止 silent 自动选首项；仅恢复 persist 选择。
 */
import type { BadgeTone } from '@/components/ui-guide/ui/types'
import type { SemesterCode } from '@/types/enums/semester-enum'
import { computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { CONFIRMATION_STATUS_COLOR, CONFIRMATION_STATUS_LABEL } from '@/apis/quality/types'
import {
  CourseSelector,
  ProgramSelector,
  TrainingPlanSelector,
} from '@/components/quality/selectors'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import { useQualityScopeProfile } from '@/composables/useQualityScopeProfile'
import { SEMESTER_OPTIONS } from '@/constants/quality-scope-profile'
import { useQualityStore } from '@/stores/modules/quality'
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
    scopeProfile.value === 'plan' ||
    scopeProfile.value === 'plan-period' ||
    scopeProfile.value === 'plan-course' ||
    scopeProfile.value === 'accreditation',
)
const showPeriod = computed(
  () => scopeProfile.value === 'plan-period' || scopeProfile.value === 'plan-course',
)
const showCourse = computed(() => scopeProfile.value === 'plan-course')

const needsPlanSelection = computed(() => showPlan.value && !trainingPlanId.value)

const planConfirmationLabel = computed(() => {
  if (!qualityStore.currentPlan?.confirmationStatus) {
    return ''
  }
  return strictEnumLabel(
    CONFIRMATION_STATUS_LABEL,
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
  ) as BadgeTone
})

async function restorePersistedScope(): Promise<void> {
  try {
    if (!qualityStore.majorCategoryOptions.length) {
      await qualityStore.loadMajorCategoryOptions()
    }
    if (qualityStore.currentProgramId && qualityStore.currentTrainingPlanId) {
      await qualityStore.loadTrainingPlanOptions()
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

function handleTrainingPlanChange(value: string | null): void {
  qualityStore.setTrainingPlan(value || '')
  emit('change')
}

function handleSchoolYearChange(value: string): void {
  qualityStore.setSchoolPeriod(value, undefined)
  emit('change')
}

function handleSemesterChange(value: SemesterCode | undefined): void {
  qualityStore.setSchoolPeriod(undefined, value ?? null)
  emit('change')
}

function handleCourseChange(value: string | null): void {
  qualityStore.setQualityCourse(value || '')
  emit('change')
}

function goSelectPlan(): void {
  void router.push({ name: 'QualityTrainingPlanWorkbench' })
}

onMounted(() => {
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
      @update:value="handleTrainingPlanChange"
    />
    <template v-if="needsPlanSelection">
      <span class="quality-scope-chrome__hint">请选择培养方案</span>
      <UiButton variant="outline" size="sm" @click="goSelectPlan"> 去培养方案工作台 </UiButton>
    </template>
    <template v-else>
      <a-input
        v-if="showPeriod"
        :value="qualityStore.currentSchoolYear"
        placeholder="学年 如 2024-2025"
        class="quality-scope-chrome__input"
        allow-clear
        @update:value="handleSchoolYearChange"
      />
      <a-select
        v-if="showPeriod"
        :value="qualityStore.currentSemester || undefined"
        placeholder="学期"
        class="quality-scope-chrome__select quality-scope-chrome__select--semester"
        allow-clear
        :options="[...SEMESTER_OPTIONS]"
        @update:value="
          (v) => handleSemesterChange(typeof v === 'string' ? (v as SemesterCode) : undefined)
        "
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
    font-size: var(--dp-font-size-sm, 13px);
    color: var(--dp-text-secondary);
  }

  &__select {
    min-width: 0;

    &--semester {
      width: 120px;
    }
  }

  &__input {
    width: 140px;
  }
}
</style>
