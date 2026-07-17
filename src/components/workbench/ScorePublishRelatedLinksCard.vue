<script lang="ts" setup>
import type { ScorePublishRelatedVariant } from '@/utils/score-publish-related-links'
import { computed } from 'vue'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import WorkbenchSurfaceCard from '@/components/workbench/WorkbenchSurfaceCard.vue'
import { useScorePublishRelatedNavigation } from '@/composables/useScorePublishRelatedNavigation'
import { SCORE_PUBLISH_RELATED_LINKS } from '@/utils/score-publish-related-links'

defineOptions({ name: 'ScorePublishRelatedLinksCard' })

const props = defineProps<{
  variant: ScorePublishRelatedVariant
}>()

const { navigateToRoute } = useScorePublishRelatedNavigation()

const items = computed(() => SCORE_PUBLISH_RELATED_LINKS[props.variant])
</script>

<template>
  <WorkbenchSurfaceCard class="score-publish-related-links">
    <template #head>相关能力</template>
    <dl class="score-publish-related-links__list">
      <div v-for="item in items" :key="item.key" class="score-publish-related-links__item">
        <dt>{{ item.label }}</dt>
        <dd>{{ item.description }}</dd>
        <UiButton variant="outline" size="sm" @click="navigateToRoute(item.routeName)">
          前往
        </UiButton>
      </div>
    </dl>
  </WorkbenchSurfaceCard>
</template>

<style scoped lang="scss">
.score-publish-related-links {
  margin-top: var(--dp-space-4);

  &__list {
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: var(--dp-space-3, 12px);
  }

  &__item {
    display: flex;
    flex-direction: column;
    gap: var(--dp-space-1, 4px);
    padding-bottom: var(--dp-space-3, 12px);
    border-bottom: 1px solid var(--dp-border-subtle);

    &:last-child {
      padding-bottom: 0;
      border-bottom: none;
    }

    dt {
      margin: 0;
      font-size: 13px;
      font-weight: 600;
      color: var(--dp-text-primary);
    }

    dd {
      margin: 0;
      font-size: 12px;
      line-height: 1.5;
      color: var(--dp-text-secondary);
    }
  }
}
</style>
