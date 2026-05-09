<template>
  <a-tag v-if="props.gender === 1" class="gi_round" color="blue">
    <template #icon>
      <ManOutlined />
    </template>
    男
  </a-tag>
  <a-tag v-else-if="props.gender === 2" class="gi_round" color="magenta">
    <template #icon>
      <WomanOutlined />
    </template>
    女
  </a-tag>
  <a-tag v-else class="gi_round"> 未知 </a-tag>
</template>

<script lang="ts" setup>
import ManOutlined from '@ant-design/icons-vue/ManOutlined'

import WomanOutlined from '@ant-design/icons-vue/WomanOutlined'

defineOptions({ name: 'GiCellGender' })

const props = withDefaults(defineProps<Props>(), {
  gender: 1,
})

interface Props {
  gender?: 1 | 2 | 0
}
</script>

<style lang="scss" scoped></style>
