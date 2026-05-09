<template>
  <span v-if="props.status === 1">
    <CheckCircleFilled class="success" />
    <span>启用</span>
  </span>
  <span v-if="props.status === 2">
    <MinusCircleFilled class="warning" />
    <span>禁用</span>
  </span>
</template>

<script lang="ts" setup>
import CheckCircleFilled from '@ant-design/icons-vue/CheckCircleFilled'

import MinusCircleFilled from '@ant-design/icons-vue/MinusCircleFilled'

defineOptions({ name: 'GiCellStatus' })

const props = withDefaults(defineProps<Props>(), {
  status: 1,
})

interface Props {
  status?: 1 | 2
}
</script>

<style lang="scss" scoped></style>
