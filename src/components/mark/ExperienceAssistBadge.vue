<template>
  <UiTag
    v-if="visible"
    tone="purple"
    size="sm"
    class="experience-assist-badge"
    :class="{ 'experience-assist-badge--clickable': clickable }"
    :title="clickable ? '查看 AI 历史并定位本次定标引用' : undefined"
    @click="handleClick"
  >
    参考定标经验<template v-if="displaySourceExamName"> · {{ displaySourceExamName }}</template
    ><template v-if="consistencyLabel"> · 一致率 {{ consistencyLabel }}</template>
  </UiTag>
</template>

<script lang="ts" setup>
import { computed } from 'vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'

defineOptions({ name: 'ExperienceAssistBadge' })

const props = defineProps<{
  applied?: boolean
  sourceExamName?: string
  consistencyRate?: number
  clickable?: boolean
}>()

const emit = defineEmits<{
  (e: 'open-ai-history'): void
}>()

const visible = computed(() => Boolean(props.applied))

const displaySourceExamName = computed(
  () => props.sourceExamName?.trim() || (props.applied ? '来源考试待补录' : ''),
)

const consistencyLabel = computed(() => {
  if (props.consistencyRate == null) return ''
  return `${Math.round(props.consistencyRate * 1000) / 10}%`
})

function handleClick(): void {
  if (!props.clickable) return
  emit('open-ai-history')
}
</script>

<style lang="scss" scoped>
.experience-assist-badge--clickable {
  cursor: pointer;
}
</style>
