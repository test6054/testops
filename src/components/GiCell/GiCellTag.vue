<template>
  <span v-if="!dictItem"></span>
  <span v-else-if="!dictItem.extra">{{ dictItem.label }}</span>
  <a-tag v-else-if="dictItem.extra === 'primary'" color="blue">{{ dictItem.label }}</a-tag>
  <a-tag v-else-if="dictItem.extra === 'success'" color="green">{{ dictItem.label }}</a-tag>
  <a-tag v-else-if="dictItem.extra === 'warning'" color="volcano">{{ dictItem.label }}</a-tag>
  <a-tag v-else-if="dictItem.extra === 'error'" color="red">{{ dictItem.label }}</a-tag>
  <a-tag v-else-if="dictItem.extra === 'default'">{{ dictItem.label }}</a-tag>
</template>

<script lang="ts" setup>
import type { LabelValueState } from '@/types/api-types.d'

defineOptions({ name: 'GiCellTag' })

const props = withDefaults(defineProps<{
  dict?: LabelValueState[]
  value?: number | string
}>(), {
  dict: () => [],
  value: '',
})

const dictItem = computed((): LabelValueState | undefined => {
  return props.dict.find(
    (d) => d.value === String(props.value) || d.value === Number(props.value),
  )
})
</script>
