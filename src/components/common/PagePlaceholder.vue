<template>
  <GiPageLayout>
    <template #header>
      <UiPageHeader
        :title="props.title"
        :subtitle="props.subtitle"
        divided
      >
        <template v-if="props.badgeLabel" #badges>
          <UiBadge :tone="props.badgeTone" variant="soft">
            {{ props.badgeLabel }}
          </UiBadge>
        </template>
      </UiPageHeader>
    </template>

    <UiStateBlock
      state="info"
      size="lg"
      :title="props.stateTitle"
      :description="props.stateDescription"
      :helper="props.helper"
      badge-label="开发中"
      badge-tone="blue"
    >
      <div v-if="props.milestones && props.milestones.length" class="page-placeholder__milestones">
        <p class="page-placeholder__milestones-title">后续交付节点</p>
        <ul class="page-placeholder__milestone-list">
          <li v-for="(item, idx) in props.milestones" :key="idx">
            <span class="page-placeholder__milestone-tag">{{ item.batch }}</span>
            <span class="page-placeholder__milestone-desc">{{ item.description }}</span>
          </li>
        </ul>
      </div>
    </UiStateBlock>
  </GiPageLayout>
</template>

<script lang="ts" setup>
import type { BadgeTone } from '@/components/ui-guide/ui/types'
import GiPageLayout from '@/components/GiPageLayout/index.vue'
import { UiBadge, UiPageHeader, UiStateBlock } from '@/components/ui-guide/ui'

defineOptions({ name: 'PagePlaceholder' })

const props = withDefaults(defineProps<{
  /** 页面大标题 */
  title: string
  /** 页面副标题 */
  subtitle?: string
  /** 顶部徽标文字 */
  badgeLabel?: string
  /** 顶部徽标色调 */
  badgeTone?: BadgeTone
  /** 中心状态区标题 */
  stateTitle?: string
  /** 中心状态区描述 */
  stateDescription?: string
  /** 中心状态区补充提示 */
  helper?: string
  /** 后续交付节点 */
  milestones?: MilestoneItem[]
}>(), {
  subtitle: '',
  badgeLabel: '',
  badgeTone: 'blue',
  stateTitle: '该模块正在开发中',
  stateDescription: '当前仅提供占位骨架，后续批次将补齐完整业务能力。',
  helper: '',
  milestones: () => [],
})

interface MilestoneItem {
  batch: string
  description: string
}
</script>

<style lang="scss" scoped>
.page-placeholder__milestones {
  margin-top: 20px;
  padding: 16px 20px;
  border: 1px dashed var(--ant-color-border);
  border-radius: var(--dp-radius-panel, 4px);
  background: var(--ant-color-fill-quaternary);
  text-align: left;
}

.page-placeholder__milestones-title {
  margin: 0 0 10px;
  font-size: 13px;
  font-weight: 600;
  color: var(--dp-text-secondary, #475569);
}

.page-placeholder__milestone-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.page-placeholder__milestone-list li {
  display: flex;
  gap: 10px;
  align-items: flex-start;
  font-size: 13px;
  color: var(--dp-text-secondary, #475569);
  line-height: 1.6;
}

.page-placeholder__milestone-tag {
  flex: 0 0 auto;
  padding: 2px 8px;
  border-radius: var(--dp-radius-pill, 999px);
  background: var(--ant-color-primary-bg);
  color: var(--ant-color-primary);
  font-size: 12px;
  font-weight: 600;
  line-height: 1.4;
}

.page-placeholder__milestone-desc {
  flex: 1;
}
</style>
