<script lang="ts" setup>
/**
 * 管理员未选教师时的 B 钉条门禁：禁大 Empty 英雄区，唯一 CTA 去名册。
 */
import { useRouter } from 'vue-router'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiAlertStrip from '@/components/ui-guide/ui/UiAlertStrip.vue'

defineOptions({ name: 'PortfolioTeacherPickGate' })

withDefaults(
  defineProps<{
    /** 是否展示（通常 canPickTeachers && !targetTeacherId） */
    show?: boolean
  }>(),
  { show: true },
)

const router = useRouter()

function goDirectory() {
  void router.push({ path: '/portfolio/teachers' })
}
</script>

<template>
  <UiAlertStrip
    v-if="show"
    tone="warning"
    size="sm"
    dense
    inline
    :show-icon="false"
    title=""
    class="portfolio-teacher-pick-gate"
  >
    <template #default>
      <span class="portfolio-teacher-pick-gate__row">
        <UiTag tone="orange" size="sm">未选择</UiTag>
        <span class="portfolio-teacher-pick-gate__text">
          请从教师名册进入某位老师的工作台后再办理
        </span>
      </span>
    </template>
    <template #actions>
      <UiButton size="sm" variant="primary" @click="goDirectory">
        打开教师名册
      </UiButton>
    </template>
  </UiAlertStrip>
</template>

<style scoped lang="scss">
.portfolio-teacher-pick-gate {
  margin-bottom: var(--dp-space-component-tight); max-height: 48px;
  max-width: 100%;
}

.portfolio-teacher-pick-gate__row {
  display: inline-flex;
  align-items: center;
  gap: var(--dp-space-component-tight);
  min-width: 0;
}

.portfolio-teacher-pick-gate__text {
  font-size: var(--dp-font-size-sm);
  color: var(--dp-text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
