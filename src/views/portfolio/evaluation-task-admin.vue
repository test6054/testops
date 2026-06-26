<script setup lang="ts">
import { message } from 'ant-design-vue'
import { onMounted, reactive, ref } from 'vue'
import type { PortfolioEvaluationTaskVO } from '@/apis/portfolio/teacher-platform'
import { portfolioEvaluationTaskApi } from '@/apis/portfolio/teacher-platform'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiCard from '@/components/ui-guide/ui/Card.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import { showUserError } from '@/utils/error-handler'

const form = reactive({
  taskName: '',
  evaluationMode: 'BY_PERSON' as 'BY_PERSON' | 'BY_INDICATOR',
})
const lastTask = ref<PortfolioEvaluationTaskVO | null>(null)

async function createTask() {
  if (!form.taskName.trim()) {
    message.warning('请填写任务名称')
    return
  }
  try {
    const id = await portfolioEvaluationTaskApi.create({
      taskName: form.taskName.trim(),
      evaluationMode: form.evaluationMode,
    })
    lastTask.value = await portfolioEvaluationTaskApi.get({ id })
    message.success('评价任务已创建')
    form.taskName = ''
  }
  catch (error) {
    showUserError(error)
  }
}

async function publishTask() {
  if (!lastTask.value) {
    return
  }
  try {
    await portfolioEvaluationTaskApi.publish({ id: lastTask.value.id })
    lastTask.value = await portfolioEvaluationTaskApi.get({ id: lastTask.value.id })
    message.success('任务已发布')
  }
  catch (error) {
    showUserError(error)
  }
}

onMounted(() => {})
</script>

<template>
  <StageWorkbenchShell>
    <ContextBar title="多元评价任务" subtitle="以人为主 / 以指标为主双模式" />
    <UiCard>
      <div class="form-row">
        <input v-model="form.taskName" class="input input--wide" placeholder="任务名称">
        <select v-model="form.evaluationMode" class="input">
          <option value="BY_PERSON">
            以人为主
          </option>
          <option value="BY_INDICATOR">
            以指标为主
          </option>
        </select>
        <UiButton variant="primary" @click="createTask">
          创建任务
        </UiButton>
      </div>
      <div v-if="lastTask" class="task-detail">
        <p>最近任务：{{ lastTask.taskName }}</p>
        <p>模式 {{ lastTask.evaluationMode }} · 状态 {{ lastTask.taskStatus }}</p>
        <UiButton v-if="lastTask.taskStatus !== 'PUBLISHED'" @click="publishTask">
          发布
        </UiButton>
      </div>
    </UiCard>
  </StageWorkbenchShell>
</template>

<style scoped>
.form-row {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
}
.input {
  padding: 6px 8px;
  border: 1px solid var(--ant-color-border, #d9d9d9);
  border-radius: 4px;
}
.input--wide {
  flex: 1;
  min-width: 200px;
}
.task-detail {
  margin-top: 16px;
  font-size: 13px;
  color: var(--dp-text-secondary, #64748b);
}
.task-detail p {
  margin: 0 0 8px;
}
</style>
