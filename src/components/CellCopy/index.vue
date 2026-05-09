<template>
  <a-space :size="2">
    <a-typography-paragraph
      :ellipsis="{
        rows: 1,
        tooltip: true,
      }"
    >
      {{ content }}
    </a-typography-paragraph>
    <a-typography-paragraph :copy-text="content" copyable />
  </a-space>
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
