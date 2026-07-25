<script lang="ts" setup>
import LockOutlined from '@ant-design/icons-vue/LockOutlined'

defineOptions({ name: 'ConfidentialStatusBar' })

withDefaults(
  defineProps<{
    /** 密级状态主文案 */
    title?: string
    /** 保密纪律说明 */
    description?: string
  }>(),
  {
    title: '涉密考试环境',
    description: '请勿截屏、复制或外传',
  },
)
</script>

<template>
  <div class="confidential-status-bar" role="status" :aria-label="title">
    <LockOutlined class="confidential-status-bar__icon" aria-hidden="true" />
    <p class="confidential-status-bar__text">
      <span class="confidential-status-bar__title">{{ title }}</span>
      <span v-if="description" class="confidential-status-bar__sep" aria-hidden="true">·</span>
      <span v-if="description" class="confidential-status-bar__description">{{ description }}</span>
    </p>
  </div>
</template>

<style scoped>
.confidential-status-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 32px;
  padding: 6px 12px;
  border: 1px solid var(--dp-purple-200);
  border-radius: var(--dp-radius-panel);
  background: var(--dp-purple-50);
}

.confidential-status-bar__icon {
  flex-shrink: 0;
  font-size: var(--dp-font-size-md);
  color: var(--dp-purple-700);
}

.confidential-status-bar__text {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
  margin: 0;
  min-width: 0;
  font-size: var(--dp-font-size-sm);
  line-height: 1.5;
}

.confidential-status-bar__title {
  font-weight: 600;
  color: var(--dp-purple-700);
}

.confidential-status-bar__sep {
  color: var(--dp-purple-500);
}

.confidential-status-bar__description {
  color: var(--dp-text-secondary);
}
</style>
