<template>
  <div class="page-header">
    <div class="page-header__left">
      <button v-if="backRoute" type="button" class="page-header__back" @click="handleBack">
        <LeftOutlined />
      </button>
      <h1 class="page-header__title">{{ title }}</h1>
      <slot name="tags" />
    </div>
    <div v-if="$slots.actions" class="page-header__actions">
      <slot name="actions" />
    </div>
  </div>
</template>

<script lang="ts" setup>
import LeftOutlined from '@ant-design/icons-vue/LeftOutlined'
import { useRouter } from 'vue-router'

defineOptions({ name: 'PageHeader' })

const props = defineProps<{
  title: string
  backRoute?: string
}>()

const router = useRouter()

function handleBack() {
  if (props.backRoute) {
    router.push(props.backRoute)
  } else {
    router.back()
  }
}
</script>

<style lang="scss" scoped>
.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 16px 0;
  min-height: 48px;
}

.page-header__left {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
  flex-wrap: wrap;
}

.page-header__back {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: 1px solid var(--ant-color-border);
  border-radius: 6px;
  background: transparent;
  color: var(--ant-color-text-secondary);
  cursor: pointer;
  flex-shrink: 0;
  transition: all 0.15s;

  &:hover {
    color: var(--ant-color-text);
    border-color: var(--ant-color-text-secondary);
  }
}

.page-header__title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--ant-color-text);
  line-height: 1.4;
  white-space: nowrap;
}

.page-header__actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
  flex-wrap: wrap;
}
</style>
