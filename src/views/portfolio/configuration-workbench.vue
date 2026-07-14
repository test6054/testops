<script setup lang="ts">
import { useRouter } from 'vue-router'
import UiButton from '@/components/ui-guide/ui/UiButton.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'

const router = useRouter()

const configurationSections = [
  {
    title: '组织与数据接入',
    actions: [
      { label: '组织与名册', routeName: 'PortfolioOrgAdmin' },
      { label: '数据集成中心', routeName: 'PortfolioIntegrationDashboard' },
      { label: '专业群档案袋', routeName: 'PortfolioMajorGroupPortfolio' },
    ],
  },
  {
    title: '档案与评价规则',
    actions: [
      { label: '档案模板', routeName: 'PortfolioTemplateAdmin' },
      { label: '档案评分规则', routeName: 'PortfolioArchiveScoreRuleAdmin' },
      { label: '评价工作组', routeName: 'PortfolioEvaluationWorkgroupNav' },
      { label: '政策文件库', routeName: 'PortfolioPolicyLibraryAdmin' },
    ],
  },
  {
    title: '指标与发布',
    actions: [
      { label: '租户指标配置', routeName: 'PortfolioIndicatorTenant' },
      { label: '资格规则', routeName: 'PortfolioIndicatorEligibility' },
      { label: '发布向导', routeName: 'PortfolioIndicatorPublishWizard' },
      { label: '指标运行审计', routeName: 'PortfolioIndicatorOps' },
    ],
  },
  {
    title: '集成数据台账',
    actions: [
      { label: '教师工资', routeName: 'PortfolioTeacherSalaryAdmin' },
      { label: '图书借阅', routeName: 'PortfolioTeacherLibraryAdmin' },
    ],
  },
  {
    title: '权限与审计',
    actions: [
      { label: '导出审批', routeName: 'PortfolioExportApprovalAdmin' },
      { label: '脱敏规则', routeName: 'PortfolioMaskRuleAdmin' },
      { label: '审计日志', routeName: 'PortfolioAuditLogAdmin' },
    ],
  },
]

/** 配置壳只通过已注册且服务端已门禁的路由进入具体配置页面。 */
function openConfiguration(routeName: string) {
  void router.push({ name: routeName })
}
</script>

<template>
  <StageWorkbenchShell>
    <template #context>
      <ContextBar show-title layout="workbench" title="档案袋配置中心" />
    </template>
    <section class="configuration-workbench">
      <section v-for="section in configurationSections" :key="section.title" class="configuration-workbench__section">
        <h2>{{ section.title }}</h2>
        <div class="configuration-workbench__actions">
          <UiButton
            v-for="action in section.actions"
            :key="action.routeName"
            variant="outline"
            @click="openConfiguration(action.routeName)"
          >
            {{ action.label }}
          </UiButton>
        </div>
      </section>
    </section>
  </StageWorkbenchShell>
</template>

<style scoped>
.configuration-workbench {
  padding: var(--dp-space-4);
}

.configuration-workbench__section + .configuration-workbench__section {
  margin-top: var(--dp-space-6);
  padding-top: var(--dp-space-5);
  border-top: 1px solid var(--ant-color-border-secondary);
}

.configuration-workbench__section h2 {
  margin: 0 0 var(--dp-space-3);
  font-size: var(--dp-font-size-lg);
  font-weight: 600;
}

.configuration-workbench__actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--dp-space-3);
}
</style>
