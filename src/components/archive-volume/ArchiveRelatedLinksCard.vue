<script lang="ts" setup>
import UiButton from '@/components/ui-guide/ui/Button.vue'
import WorkbenchSurfaceCard from '@/components/workbench/WorkbenchSurfaceCard.vue'

defineOptions({ name: 'ArchiveRelatedLinksCard' })

const emit = defineEmits<{
  exports: []
}>()
</script>

<template>
  <WorkbenchSurfaceCard class="archive-related-links">
    <template #head>相关归档能力</template>
    <p class="archive-related-links__lead">
      <strong>课程考核归档卷</strong
      >在本页跟踪建卷、材料入库与四性检测；异步导出记录可在导出任务中查看。
    </p>
    <dl class="archive-related-links__list">
      <div class="archive-related-links__item">
        <dt>导出任务</dt>
        <dd>成绩 Excel、分析报告、影像包等异步导出记录。</dd>
        <UiButton variant="ghost" size="sm" @click="emit('exports')"> 查看导出任务 </UiButton>
      </div>
    </dl>
  </WorkbenchSurfaceCard>
</template>

<style scoped lang="scss">
.archive-related-links {
  &__lead {
    margin: 0 0 12px;
    font-size: 13px;
    line-height: 1.5;
    color: var(--dp-text-secondary);
  }

  &__list {
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  &__item {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding-bottom: 16px;
    border-bottom: 1px solid var(--dp-border-subtle);

    &:last-child {
      padding-bottom: 0;
      border-bottom: none;
    }

    dt {
      margin: 0;
      font-size: 13px;
      font-weight: 600;
      color: var(--dp-text-primary);
    }

    dd {
      margin: 0;
      font-size: 12px;
      line-height: 1.5;
      color: var(--dp-text-secondary);
    }
  }
}
</style>
