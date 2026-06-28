<template>
  <a-typography-paragraph
    :ellipsis="{
      rows: 1,
      tooltip: true,
    }"
    :copyable="{ text: content }"
  >
    {{ content }}
  </a-typography-paragraph>
</template>

<script lang="ts" setup>
defineOptions({name: 'CellCopy'})

withDefaults(defineProps<Props>(), {
  content: '',
})

interface Props {
  content?: string
}
</script>

<style lang="scss" scoped></style>
