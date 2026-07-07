<script lang="ts" setup>
import { useRouter } from 'vue-router'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import WorkbenchSurfaceCard from '@/components/workbench/WorkbenchSurfaceCard.vue'

defineOptions({ name: 'ArchiveVolumeRelatedLinksCard' })

const router = useRouter()

function goExamList(): void {
  void router.push({ name: 'TeacherExamList' })
}

function goEvalCampaign(): void {
  void router.push({ name: 'TeacherArchiveVolumeEvalCampaign' })
}

function goAiAnalysis(): void {
  void router.push({ name: 'TeacherAiAnalysisCenter' })
}
</script>

<template>
  <WorkbenchSurfaceCard class="archive-volume-related-links">
    <template #head>相关能力</template>
    <dl class="archive-volume-related-links__list">
      <div class="archive-volume-related-links__item">
        <dt>考试列表</dt>
        <dd>查看关联考试的进行中状态与关考进度。</dd>
        <UiButton variant="outline" size="sm" @click="goExamList">
          打开考试列表
        </UiButton>
      </div>
      <div class="archive-volume-related-links__item">
        <dt>评估迎评</dt>
        <dd>迎评批次管理与卷就绪度核对。</dd>
        <UiButton variant="outline" size="sm" @click="goEvalCampaign">
          进入评估迎评
        </UiButton>
      </div>
      <div class="archive-volume-related-links__item">
        <dt>教学质量分析</dt>
        <dd>跨考试维度的教学改进与趋势洞察。</dd>
        <UiButton variant="ghost" size="sm" @click="goAiAnalysis">
          打开 AI 分析中心
        </UiButton>
      </div>
    </dl>
  </WorkbenchSurfaceCard>
</template>

<style scoped lang="scss">
.archive-volume-related-links {
  margin-top: var(--dp-space-4, 16px);

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
    border-bottom: 1px solid var(--dp-border-subtle, #e2e8f0);

    &:last-child {
      padding-bottom: 0;
      border-bottom: none;
    }

    dt {
      margin: 0;
      font-size: 13px;
      font-weight: 600;
      color: var(--dp-text-primary, #0f172a);
    }

    dd {
      margin: 0;
      font-size: 12px;
      line-height: 1.5;
      color: var(--dp-text-secondary, #64748b);
    }
  }
}
</style>
