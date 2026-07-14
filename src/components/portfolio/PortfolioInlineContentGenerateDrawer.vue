<script setup lang="ts">
/**
 * 就地智能内容生成 / 优化：提交对应 AI 任务，轮询后向父组件回填草稿正文。
 * 不直接写正式档案；由教师确认后再填入当前表单。
 */
import { message } from 'ant-design-vue'
import { computed, ref, watch } from 'vue'
import { portfolioAiJobApi } from '@/apis/portfolio/ai-job'
import { PortfolioMaterialTypeCode } from '@/apis/portfolio/enums'
import UiButton from '@/components/ui-guide/ui/UiButton.vue'
import UiDrawer from '@/components/ui-guide/ui/UiDrawer.vue'
import UiEmpty from '@/components/ui-guide/ui/UiEmpty.vue'
import { AiTaskStatusCode } from '@/types/enums/ai-task-status-enum'
import { PortfolioAiTaskTypeCode } from '@/types/enums/portfolio-ai-task-type-enum'
import { showUserError } from '@/utils/error-handler'

const props = withDefaults(
  defineProps<{
    open: boolean
    teacherId?: string
    mode?: 'generate' | 'optimize'
    generateScene?: 'LESSON_PLAN_FRAME' | 'COURSE_DESCRIPTION' | 'REFLECTION_PROMPT'
    generateBrief?: string
    sourceText?: string
    title?: string
  }>(),
  {
    mode: 'generate',
  },
)

const emit = defineEmits<{
  'update:open': [boolean]
  "apply": [text: string]
}>()

const loading = ref(false)
const draftMarkdown = ref('')
const pollToken = ref(0)

const isOptimize = computed(() => props.mode === 'optimize')
const drawerTitle = computed(() =>
  props.title || (isOptimize.value ? '智能内容优化' : '智能内容生成'),
)

function sleep(ms: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, ms)
  })
}

function close() {
  emit('update:open', false)
}

async function submitTask() {
  if (!props.teacherId) {
    message.warning('请先确定教师范围')
    return
  }
  if (isOptimize.value && !props.sourceText?.trim()) {
    message.warning('请先填写待优化正文')
    return
  }
  if (!isOptimize.value && !props.generateScene) {
    message.warning('缺少生成场景')
    return
  }
  loading.value = true
  const token = ++pollToken.value
  draftMarkdown.value = ''
  try {
    const submitResult = await portfolioAiJobApi.submit(
      isOptimize.value
        ? {
            taskType: PortfolioAiTaskTypeCode.PORTFOLIO_CONTENT_OPTIMIZE,
            teacherId: props.teacherId,
            materialType: PortfolioMaterialTypeCode.DOCUMENT,
            context: {
              sourceText: props.sourceText?.trim(),
            },
          }
        : {
            taskType: PortfolioAiTaskTypeCode.PORTFOLIO_CONTENT_GENERATE,
            teacherId: props.teacherId,
            materialType: PortfolioMaterialTypeCode.DOCUMENT,
            context: {
              generateScene: props.generateScene,
              generateBrief: props.generateBrief?.trim() || undefined,
              sourceText: props.sourceText?.trim() || undefined,
            },
          },
    )
    for (let attempt = 0; attempt < 60; attempt++) {
      if (pollToken.value !== token) {
        return
      }
      const task = await portfolioAiJobApi.get(submitResult.taskId)
      if (pollToken.value !== token) {
        return
      }
      if (task.status === AiTaskStatusCode.SUCCEEDED) {
        const detail = await portfolioAiJobApi.getAnalysisByTask(submitResult.taskId)
        if (pollToken.value !== token) {
          return
        }
        draftMarkdown.value = detail.draftMarkdown?.trim() || ''
        if (!draftMarkdown.value) {
          message.warning('任务完成但草稿为空')
        } else {
          message.success(isOptimize.value ? '优化稿已生成，确认后可填入表单' : '内容已生成，确认后可填入表单')
        }
        return
      }
      if (task.status === AiTaskStatusCode.FAILED || task.status === AiTaskStatusCode.CANCELLED) {
        showUserError(null, 'AI 任务失败，请稍后重试')
        return
      }
      await sleep(2000)
    }
    showUserError(null, 'AI 任务超时')
  } catch (error) {
    if (pollToken.value === token) {
      showUserError(error, isOptimize.value ? '智能内容优化失败' : '智能内容生成失败')
    }
  } finally {
    if (pollToken.value === token) {
      loading.value = false
    }
  }
}

function applyDraft() {
  if (!draftMarkdown.value.trim()) {
    message.warning('暂无可填入内容')
    return
  }
  emit('apply', draftMarkdown.value)
  close()
}

watch(
  () => props.open,
  (open) => {
    if (!open) {
      pollToken.value += 1
      loading.value = false
      return
    }
    draftMarkdown.value = ''
  },
)
</script>

<template>
  <UiDrawer
    :open="open"
    :title="drawerTitle"
    :width="560"
    :hide-footer="true"
    closable
    @update:open="emit('update:open', $event)"
  >
    <div class="inline-generate">
      <p class="inline-generate__hint">
        {{
          isOptimize
            ? '基于当前正文生成优化建议稿，确认后再填入，不会直接写入正式档案。'
            : '生成草稿后由你确认再填入，不会直接写入正式档案。'
        }}
      </p>
      <UiButton tone="primary" :loading="loading" :disabled="!teacherId" @click="submitTask">
        {{ isOptimize ? '开始优化' : '开始生成' }}
      </UiButton>
      <div v-if="draftMarkdown" class="inline-generate__draft">
        <pre>{{ draftMarkdown }}</pre>
        <UiButton @click="applyDraft">填入表单</UiButton>
      </div>
      <UiEmpty v-else-if="!loading" description="结果将展示在此处" />
    </div>
  </UiDrawer>
</template>

<style scoped lang="scss">
.inline-generate {
  display: flex;
  flex-direction: column;
  gap: var(--dp-space-3);
}
.inline-generate__hint {
  margin: 0;
  color: var(--dp-text-secondary);
  font-size: 13px;
  line-height: 1.5;
}
.inline-generate__draft pre {
  margin: 0 0 var(--dp-space-2);
  padding: var(--dp-space-3);
  max-height: 420px;
  overflow: auto;
  white-space: pre-wrap;
  font-size: 13px;
  line-height: 1.5;
  background: var(--dp-bg-muted);
  border-radius: 4px;
}
</style>
