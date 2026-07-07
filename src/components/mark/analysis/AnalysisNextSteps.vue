<script setup lang="ts">
import { useRouter } from 'vue-router'

defineOptions({ name: 'AnalysisNextSteps' })

const router = useRouter()

const steps = [
  {
    key: 'exam-list',
    label: '考试列表',
    desc: '切换考试或进入考试工作台继续处理',
    route: { name: 'TeacherExamList' },
  },
  {
    key: 'audit',
    label: '批改审计',
    desc: '追溯 AI 发现问题的操作日志与事件',
    route: { name: 'AdminAuditTrail' },
  },
  {
    key: 'overview',
    label: '阅卷总览',
    desc: '查看租户阅卷进度与已发布学情摘要',
    route: { name: 'TeacherMarkingOverview' },
  },
]

function navigate(step: (typeof steps)[number]): void {
  void router.push(step.route)
}
</script>

<template>
  <section class="ai-analysis-next-steps">
    <h4 class="ai-analysis-next-steps__title">下一步行动</h4>
    <div class="ai-analysis-next-steps__grid">
      <button
        v-for="step in steps"
        :key="step.key"
        type="button"
        class="ai-analysis-next-steps__item"
        @click="navigate(step)"
      >
        <span class="ai-analysis-next-steps__item-label">{{ step.label }}</span>
        <span class="ai-analysis-next-steps__item-desc">{{ step.desc }}</span>
      </button>
    </div>
  </section>
</template>
