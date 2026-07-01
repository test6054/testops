<template>
  <UiEntityCard
    class="ui-template-card"
    :title="props.title"
    :description="props.description"
    :clickable="props.clickable"
    tone="blue"
    @click="emit('click')"
  >
    <template #badge>
      <UiTag v-if="props.scopeLabel" :tone="props.scopeTone" variant="outline">
        {{ props.scopeLabel }}
      </UiTag>
    </template>

    <template v-if="$slots.actions" #actions>
      <slot name="actions" />
    </template>

    <template #meta>
      <div class="ui-template-card__meta-grid">
        <div class="ui-template-card__meta-item">
          <span class="ui-template-card__meta-label">专业</span>
          <span class="ui-template-card__meta-value">{{ props.majorName || '-' }}</span>
        </div>
        <div class="ui-template-card__meta-item">
          <span class="ui-template-card__meta-label">课程</span>
          <span class="ui-template-card__meta-value">{{ props.courseName || '-' }}</span>
        </div>
      </div>
    </template>

    <div class="ui-template-card__stage-list">
      <div
        v-for="(stage, index) in props.stages"
        :key="stage.key || `${stage.name}-${index}`"
        class="ui-template-card__stage-item"
      >
        <span class="ui-template-card__stage-name">{{ stage.name }}</span>
        <span class="ui-template-card__stage-duration">
          {{ stage.durationText || resolveDuration(stage.durationDays) }}
        </span>
      </div>

      <div v-if="!props.stages.length" class="ui-template-card__stage-empty">暂无阶段配置</div>
    </div>

    <template #footer>
      <div class="ui-template-card__footer">
        <span class="ui-template-card__footer-text">{{ props.creator || '未记录创建人' }}</span>
        <span class="ui-template-card__footer-text">{{ props.updateTime || '--' }}</span>
      </div>
    </template>
  </UiEntityCard>
</template>

<script lang="ts" setup>
import type { BadgeTone } from './types'
import UiTag from './Tag.vue'
import UiEntityCard from './UiEntityCard.vue'

defineOptions({ name: 'UiTemplateCard' })

const props = withDefaults(
  defineProps<{
    title: string
    description?: string
    scopeLabel?: string
    scopeTone?: BadgeTone
    majorName?: string
    courseName?: string
    stages?: TemplateStageItem[]
    creator?: string
    updateTime?: string
    clickable?: boolean
  }>(),
  {
    description: '',
    scopeLabel: '',
    scopeTone: 'gray',
    majorName: '',
    courseName: '',
    stages: () => [],
    creator: '',
    updateTime: '',
    clickable: true,
  },
)

const emit = defineEmits<{
  (e: 'click'): void
}>()

interface TemplateStageItem {
  key?: string | number
  name: string
  durationDays?: number
  durationText?: string
}

const resolveDuration = (durationDays?: number) => {
  if (!durationDays) return '未设置时长'
  return `${durationDays} 天`
}
</script>

<style scoped>
.ui-template-card__meta-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px 16px;
}

.ui-template-card__meta-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.ui-template-card__meta-label,
.ui-template-card__footer-text {
  font-size: 12px;
  color: var(--dp-text-muted, #6b7280);
}

.ui-template-card__meta-value {
  font-size: 13px;
  font-weight: 600;
  color: var(--dp-text-primary, #0f172a);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.ui-template-card__stage-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.ui-template-card__stage-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 12px;
  background: var(--dp-gray-50, #f8fafc);
  border-radius: 10px;
}

.ui-template-card__stage-name {
  min-width: 0;
  flex: 1;
  font-size: 13px;
  font-weight: 600;
  color: var(--dp-text-primary, #0f172a);
}

.ui-template-card__stage-duration,
.ui-template-card__stage-empty {
  flex-shrink: 0;
  font-size: 12px;
  color: var(--dp-text-secondary, #475569);
}

.ui-template-card__stage-empty {
  padding: 14px 12px;
  border: 1px dashed var(--dp-border, #e5e7eb);
  border-radius: 10px;
  text-align: center;
}

.ui-template-card__footer {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
</style>
