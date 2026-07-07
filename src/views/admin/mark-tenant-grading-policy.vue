<template>
  <StageWorkbenchShell>
    <template #context>
      <ContextBar
        layout="workbench"
        show-title
        title="租户阅卷策略"
        subtitle="经验辅助评阅开关、定标阈值与成绩确认工作台策略"
      />
    </template>

    <UiEmpty v-if="!canManage" description="仅超级管理员或租户管理员可维护租户阅卷策略" />
    <template v-else>
      <UiSkeletonState v-if="loading" variant="card" :card-count="2" compact />
      <template v-else>
        <WorkbenchSurfaceCard class="tenant-policy__card">
          <template #head>
            <h3 class="tenant-policy__title">成绩确认工作台</h3>
          </template>

          <p class="tenant-policy__hint">
            「撤回窗口」始终按下方分钟数生效。关闭「须人工确认最终成绩」后，全部题目教师确认完成还将按同一分钟数延迟自动汇总确认。
          </p>

          <form class="tenant-policy__form" @submit.prevent="handleSave">
            <label class="tenant-policy__field tenant-policy__field--switch">
              <span>须人工确认最终成绩</span>
              <a-switch v-model:checked="form.manualFinalScoreConfirmRequired" />
            </label>

            <label class="tenant-policy__field">
              <span>撤回窗口 / 延迟自动确认（分钟）</span>
              <a-input-number
                v-model:value="form.delayedFinalScoreConfirmMinutes"
                :min="1"
                :max="120"
              />
            </label>
          </form>
        </WorkbenchSurfaceCard>

        <WorkbenchSurfaceCard class="tenant-policy__card">
          <template #head>
            <h3 class="tenant-policy__title">经验辅助评阅</h3>
          </template>

          <p class="tenant-policy__hint">
            首次进入将自动写入租户默认策略行（经验辅助默认开启）；关闭后各场考试不再展示经验辅助配置；正考同课相似题可自动匹配，补考等非正考须逐题绑定定标经验。
          </p>

          <form class="tenant-policy__form" @submit.prevent="handleSave">
            <label class="tenant-policy__field tenant-policy__field--switch">
              <span>启用经验辅助评阅</span>
              <a-switch v-model:checked="form.experienceAssistEnabled" />
            </label>

            <label class="tenant-policy__field">
              <span>最低一致率</span>
              <a-input-number
                v-model:value="consistencyPercent"
                :min="50"
                :max="100"
                :step="1"
                :precision="1"
                addon-after="%"
              />
            </label>

            <label class="tenant-policy__field">
              <span>签名汉明距离上限</span>
              <a-input-number v-model:value="form.maxHammingDistance" :min="1" :max="16" />
            </label>

            <label class="tenant-policy__field">
              <span>Prompt 经验条目上限</span>
              <a-input-number v-model:value="form.maxExperienceItems" :min="1" :max="10" />
            </label>

            <label class="tenant-policy__field tenant-policy__field--switch">
              <span>须同课程来源</span>
              <a-switch v-model:checked="form.requireSameCourse" />
            </label>

            <label class="tenant-policy__field tenant-policy__field--switch">
              <span>须有效性评估</span>
              <a-switch v-model:checked="form.requireEffectivenessEval" />
            </label>

            <div class="tenant-policy__actions">
              <UiButton size="sm" :loading="saving" @click="handleSave">保存策略</UiButton>
            </div>
          </form>
        </WorkbenchSurfaceCard>

        <WorkbenchSurfaceCard class="tenant-policy__card">
          <template #head>
            <div class="tenant-policy__ops-head">
              <h3 class="tenant-policy__title">试评定标运维看板</h3>
              <UiButton size="sm" variant="outline" :loading="opsLoading" @click="loadOpsOverview">
                刷新
              </UiButton>
            </div>
          </template>

          <div v-if="opsOverview" class="tenant-policy__ops-summary">
            <span>试评考试 {{ opsOverview.trialMarkingExamCount }} 场</span>
            <span>待办考试 {{ opsOverview.pendingExamCount }} 场</span>
            <span>待办项 {{ opsOverview.totalPendingItemCount }} 项</span>
          </div>

          <a-table
            v-if="opsOverview && opsOverview.exams.length > 0"
            size="small"
            row-key="examId"
            :pagination="false"
            :columns="opsColumns"
            :data-source="opsOverview.exams"
            class="tenant-policy__ops-table"
          />
          <UiEmpty
            v-else-if="opsOverview && !opsLoading"
            description="当前无试评阶段考试"
            compact
          />
        </WorkbenchSurfaceCard>
      </template>
    </template>
  </StageWorkbenchShell>
</template>

<script lang="ts" setup>
import type {
  MarkTenantGradingOpsOverviewResponse,
  MarkTenantGradingPolicyResponse,
  MarkTenantGradingPolicySaveRequest,
} from '@/apis/mark/grading-experience-assist'
import { message } from 'ant-design-vue'
import { computed, onMounted, reactive, ref } from 'vue'
import {
  getTenantGradingOpsOverview,
  getTenantGradingPolicy,
  saveTenantGradingPolicy,
} from '@/apis/mark/grading-experience-assist'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiSkeletonState from '@/components/ui-guide/ui/UiSkeletonState.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import WorkbenchSurfaceCard from '@/components/workbench/WorkbenchSurfaceCard.vue'
import { useAuthStore } from '@/stores/modules/auth'
import { useUserStore } from '@/stores/modules/user'
import { RoleEnum } from '@/types/enums'
import { showUserError } from '@/utils/error-handler'

defineOptions({ name: 'AdminMarkTenantGradingPolicy' })

const authStore = useAuthStore()
const userStore = useUserStore()
const canManage = computed(
  () => authStore.userRole === RoleEnum.SUPER_ADMIN || userStore.isTenantAdmin === true,
)

const loading = ref(false)
const saving = ref(false)
const opsLoading = ref(false)
const opsOverview = ref<MarkTenantGradingOpsOverviewResponse | null>(null)

const form = reactive<MarkTenantGradingPolicySaveRequest>({
  experienceAssistEnabled: true,
  minConsistencyRate: 0.75,
  maxHammingDistance: 16,
  maxExperienceItems: 5,
  sourceExamKinds: 'REGULAR',
  requireSameCourse: true,
  requireEffectivenessEval: true,
  manualFinalScoreConfirmRequired: true,
  delayedFinalScoreConfirmMinutes: 10,
})

const opsColumns = [
  { title: '考试', dataIndex: 'examName', key: 'examName' },
  { title: '考务编号', dataIndex: 'examNo', key: 'examNo' },
  { title: '待办项', dataIndex: 'pendingItemCount', key: 'pendingItemCount', width: 80 },
  { title: '基线缺失', dataIndex: 'baselineMissingCount', key: 'baselineMissingCount', width: 88 },
  {
    title: '定标未就绪',
    dataIndex: 'assistUnresolvedCount',
    key: 'assistUnresolvedCount',
    width: 96,
  },
  {
    title: '正评就绪',
    dataIndex: 'readyForFormalMarking',
    key: 'readyForFormalMarking',
    width: 88,
    customRender: ({ text }: { text: boolean }) => (text ? '是' : '否'),
  },
]

const consistencyPercent = computed({
  get: () => Math.round(form.minConsistencyRate * 1000) / 10,
  set: (value: number | null) => {
    if (value == null) return
    form.minConsistencyRate = Math.round(value * 10) / 1000
  },
})

function applyPolicy(policy: MarkTenantGradingPolicyResponse): void {
  form.experienceAssistEnabled = policy.experienceAssistEnabled
  form.minConsistencyRate = policy.minConsistencyRate
  form.maxHammingDistance = policy.maxHammingDistance
  form.maxExperienceItems = policy.maxExperienceItems
  form.sourceExamKinds = policy.sourceExamKinds ?? 'REGULAR'
  form.requireSameCourse = policy.requireSameCourse ?? true
  form.requireEffectivenessEval = policy.requireEffectivenessEval ?? true
  form.manualFinalScoreConfirmRequired = policy.manualFinalScoreConfirmRequired ?? true
  form.delayedFinalScoreConfirmMinutes = policy.delayedFinalScoreConfirmMinutes ?? 10
}

async function loadPolicy(): Promise<void> {
  if (!canManage.value) return
  loading.value = true
  try {
    applyPolicy(await getTenantGradingPolicy())
  } catch (error) {
    showUserError(error, '加载租户策略失败')
  } finally {
    loading.value = false
  }
}

async function loadOpsOverview(): Promise<void> {
  if (!canManage.value) return
  opsLoading.value = true
  try {
    opsOverview.value = await getTenantGradingOpsOverview()
  } catch (error) {
    showUserError(error, '加载运维看板失败')
  } finally {
    opsLoading.value = false
  }
}

async function handleSave(): Promise<void> {
  if (!canManage.value) return
  saving.value = true
  try {
    applyPolicy(await saveTenantGradingPolicy({ ...form }))
    message.success('租户策略已保存')
    await loadOpsOverview()
  } catch (error) {
    showUserError(error, '保存失败')
  } finally {
    saving.value = false
  }
}

onMounted(() => {
  void loadPolicy()
  void loadOpsOverview()
})
</script>

<style lang="scss" scoped>
.tenant-policy__card + .tenant-policy__card {
  margin-top: var(--dp-space-4);
}

.tenant-policy__title {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
}

.tenant-policy__ops-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--dp-space-3);
}

.tenant-policy__hint {
  margin: 0 0 var(--dp-space-4);
  color: var(--dp-gray-600);
  font-size: 13px;
}

.tenant-policy__ops-summary {
  display: flex;
  flex-wrap: wrap;
  gap: var(--dp-space-4);
  margin-bottom: var(--dp-space-3);
  font-size: 13px;
  color: var(--dp-gray-700);
}

.tenant-policy__form {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--dp-space-4);
  max-width: 720px;
}

.tenant-policy__field {
  display: flex;
  flex-direction: column;
  gap: var(--dp-space-2);
  font-size: 13px;
  color: var(--dp-gray-700);

  &--switch {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
  }
}

.tenant-policy__actions {
  grid-column: 1 / -1;
}
</style>
