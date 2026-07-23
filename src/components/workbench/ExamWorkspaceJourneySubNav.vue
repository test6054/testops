<template>
  <nav v-if="visible" class="exam-journey-sub-nav" aria-label="旅程子页面">
    <UiButton
      v-for="item in items"
      :key="item.key"
      size="sm"
      :variant="item.key === activeMenuKey ? 'primary' : 'ghost'"
      class="exam-journey-sub-nav__item"
      @click="navigate(item)"
    >
      <span class="exam-journey-sub-nav__label">{{ item.label }}</span>
      <span
        v-if="item.key === EXPERIENCE_ASSIST_MENU_KEY && experienceAssistPendingCount > 0"
        class="exam-journey-sub-nav__badge"
      >
        {{ experienceAssistPendingCount }}
      </span>
    </UiButton>
  </nav>
</template>

<script lang="ts" setup>
import type { ExamWorkspaceJourneyKey } from '@/constants/exam-journey'
import type { ExamWorkspaceMenuItem } from '@/constants/exam-workspace-menu'
import { computed, inject } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import { useExperienceAssistTrialPendingCount } from '@/composables/useExperienceAssistTrialPendingCount'
import {
  MARK_WORKBENCH_CONTEXT_KEY,
  useWorkspaceExamId,
} from '@/composables/useMarkWorkbenchContext'
import {
  getMenuGroupsForJourney,
  resolveExamWorkspaceMenuGroupKey,
  resolveExamWorkspaceMenuKey,
} from '@/constants/exam-workspace-menu'

defineOptions({ name: 'ExamWorkspaceJourneySubNav' })

const props = defineProps<{
  /** 对应 exam-workspace-menu 中 ExamWorkspaceMenuGroup.key；省略时按当前路由自动解析 */
  groupKey?: string
}>()

const EXPERIENCE_ASSIST_MENU_KEY = 'marking-experience-assist'

const router = useRouter()
const route = useRoute()
const { examId } = useWorkspaceExamId()
const workbenchContext = inject(MARK_WORKBENCH_CONTEXT_KEY, null)
const { pendingCount: experienceAssistPendingCount } = useExperienceAssistTrialPendingCount()

const resolvedGroupKey = computed(
  () => props.groupKey ?? resolveExamWorkspaceMenuGroupKey(String(route.name ?? '')) ?? '',
)

const items = computed((): ExamWorkspaceMenuItem[] => {
  if (!resolvedGroupKey.value) {
    return []
  }
  const groups = getMenuGroupsForJourney(resolvedGroupKey.value as ExamWorkspaceJourneyKey, {
    experienceAssistPendingCount: experienceAssistPendingCount.value,
    tenantExperienceAssistEnabled: workbenchContext?.snapshot.value?.tenantExperienceAssistEnabled,
    materialLayoutMode: workbenchContext?.examDetail?.value?.materialLayoutMode,
    printSourceMode: workbenchContext?.examDetail?.value?.printSourceMode,
  })
  return (
    groups.find((entry) => entry.key === resolvedGroupKey.value)?.items ?? groups[0]?.items ?? []
  )
})

const visible = computed(() => Boolean(examId.value) && items.value.length > 1 && !workbenchContext)

const activeMenuKey = computed(() => resolveExamWorkspaceMenuKey(String(route.name ?? '')))

function navigate(item: ExamWorkspaceMenuItem): void {
  if (!examId.value || item.key === activeMenuKey.value) {
    return
  }
  void router.push({
    name: item.routeName,
    params: { examId: examId.value },
  })
}
</script>

<style lang="scss" scoped>
.exam-journey-sub-nav {
  display: flex;
  flex-wrap: wrap;
  gap: var(--dp-space-2);
  padding: var(--dp-space-2) var(--dp-space-3);
  margin-bottom: var(--dp-space-3);
  border: 1px solid var(--dp-border);
  border-radius: var(--dp-radius-panel);
  background: var(--dp-surface-subtle);

  &__item {
    flex-shrink: 0;
    display: inline-flex;
    align-items: center;
    gap: var(--dp-space-1);
  }

  &__label {
    line-height: 1.4;
  }

  &__badge {
    min-width: 18px;
    padding: 0 6px;
    border-radius: 9px;
    background: var(--dp-warning-bg);
    color: var(--dp-warning);
    font-size: var(--dp-font-size-xxs);
    font-weight: 600;
    line-height: 18px;
    text-align: center;
  }
}
</style>
