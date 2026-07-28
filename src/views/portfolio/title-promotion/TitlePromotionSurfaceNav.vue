<script setup lang="ts">
import type { TitlePromotionSurface } from '@/views/portfolio/title-promotion/title-promotion-surface'
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import UiSegmented from '@/components/ui-guide/ui/UiSegmented.vue'

const props = defineProps<{
  surface: TitlePromotionSurface
  /** 校级治理才展示任务与公示面 */
  showSchoolSurfaces?: boolean
}>()

const route = useRoute()
const router = useRouter()

const options = computed(() => {
  const items: Array<{ value: TitlePromotionSurface, label: string }> = []
  if (props.showSchoolSurfaces) {
    items.push({ value: 'task', label: '任务与政策' })
  }
  items.push({ value: 'application', label: '申请审核' })
  if (props.showSchoolSurfaces) {
    items.push({ value: 'publicity', label: '公示与归档' })
  }
  return items
})

function resolveRouteName(surface: TitlePromotionSurface): string {
  if (surface === 'task') {
    return 'PortfolioTitlePromotionTasks'
  }
  if (surface === 'publicity') {
    return 'PortfolioTitlePromotionPublicity'
  }
  if (route.name === 'PortfolioDepartmentTitlePromotionReview') {
    return 'PortfolioDepartmentTitlePromotionReview'
  }
  return 'PortfolioTitlePromotionApplications'
}

function onSurfaceChange(value: unknown) {
  const next = value as TitlePromotionSurface
  if (!next || next === props.surface) {
    return
  }
  void router.push({
    name: resolveRouteName(next),
    query: route.query,
  })
}
</script>

<template>
  <UiSegmented
    class="title-promo-surface-nav"
    size="sm"
    :model-value="surface"
    :options="options"
    @update:model-value="onSurfaceChange"
  />
</template>
