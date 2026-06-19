<script lang="ts" setup>
/**
 * 质量评价域统一范围选择器：专业大类 + 培养方案，写入 qualityStore 全局上下文。
 */
import type { BadgeTone } from '@/components/ui-guide/ui/types'
import { computed, onMounted } from 'vue'
import { CONFIRMATION_STATUS_COLOR, CONFIRMATION_STATUS_LABEL } from '@/apis/quality'
import { ProgramSelector, TrainingPlanSelector } from '@/components/quality/selectors'
import { UiTag } from '@/components/ui-guide/ui'
import { useQualityStore } from '@/stores/modules/quality'
import { strictEnumLabel, strictEnumTone } from '@/utils/strict-enum'

defineOptions({ name: 'QualityScopeHeader' })

const props = withDefaults(
  defineProps<{
    /** 是否展示当前培养方案确认状态 */
    showPlanConfirmation?: boolean
    programWidth?: number | string
    planWidth?: number | string
  }>(),
  {
    showPlanConfirmation: false,
    programWidth: 220,
    planWidth: 260,
  },
)

const emit = defineEmits<{
  change: []
}>()

const qualityStore = useQualityStore()

const programId = computed(() => qualityStore.currentProgramId || null)
const trainingPlanId = computed(() => qualityStore.currentTrainingPlanId || null)

const planConfirmationLabel = computed(() => {
  if (!props.showPlanConfirmation || !qualityStore.currentPlan?.confirmationStatus) {
    return ''
  }
  return strictEnumLabel(
    CONFIRMATION_STATUS_LABEL,
    qualityStore.currentPlan.confirmationStatus,
    '培养方案确认状态',
  )
})

const planConfirmationTone = computed((): BadgeTone => {
  if (!props.showPlanConfirmation || !qualityStore.currentPlan?.confirmationStatus) {
    return 'gray'
  }
  return strictEnumTone(
    CONFIRMATION_STATUS_COLOR,
    qualityStore.currentPlan.confirmationStatus,
    '培养方案确认状态',
  ) as BadgeTone
})

async function ensureDefaultScope(): Promise<void> {
  if (!qualityStore.majorCategoryOptions.length) {
    await qualityStore.loadMajorCategoryOptions()
  }
  if (!qualityStore.currentProgramId && qualityStore.majorCategoryOptions.length > 0) {
    qualityStore.setProgram(qualityStore.majorCategoryOptions[0].id)
  }
  if (qualityStore.currentProgramId && !qualityStore.currentTrainingPlanId) {
    const plans = await qualityStore.loadTrainingPlanOptions()
    if (plans.length > 0) {
      qualityStore.setTrainingPlan(plans[0].id)
    }
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

onMounted(async () => {
  await ensureDefaultScope()
  emit('change')
})
</script>

<template>
  <div class="quality-scope-header">
    <ProgramSelector
      :value="programId"
      :width="programWidth"
      class="quality-scope-header__select"
      @update:value="handleProgramChange"
    />
    <TrainingPlanSelector
      :value="trainingPlanId"
      :program-id="programId"
      :width="planWidth"
      class="quality-scope-header__select"
      @update:value="handleTrainingPlanChange"
    />
    <UiTag v-if="qualityStore.currentPlan" tone="blue" size="sm">
      {{ qualityStore.currentPlan.planCode }} · {{ qualityStore.currentPlan.planName }}
    </UiTag>
    <UiTag
      v-if="showPlanConfirmation && planConfirmationLabel"
      :tone="planConfirmationTone"
      size="sm"
    >
      {{ planConfirmationLabel }}
    </UiTag>
  </div>
</template>

<style lang="scss" scoped>
.quality-scope-header {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;

  &__select {
    min-width: 0;
  }
}
</style>
