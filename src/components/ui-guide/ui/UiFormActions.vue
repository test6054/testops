<template>
  <div class="ui-form-actions" :class="[`ui-form-actions--${props.align}`]">
    <slot />
  </div>
</template>

<script lang="ts" setup>
defineOptions({
  name: 'UiFormActions',
})

const props = withDefaults(defineProps<{
  align?: 'start' | 'center' | 'end' | 'between'
  sticky?: boolean
}>(), {
  align: 'end',
  sticky: false,
})
</script>

<style scoped>
.ui-form-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  padding-top: 4px;
}

.ui-form-actions--start {
  justify-content: flex-start;
}

.ui-form-actions--center {
  justify-content: center;
}

.ui-form-actions--end {
  justify-content: flex-end;
}

.ui-form-actions--between {
  justify-content: space-between;
}
</style>
