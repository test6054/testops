<template>
  <GiPageLayout>
    <div class="spot-check-page">
      <PageHeader title="抽检处理" />

      <UiCard class="info-card">
        <template #title>
          <span>处理抽检结论</span>
        </template>

        <a-alert
          type="info"
          show-icon
          message="抽检处理流程"
          description="组长在阅卷质量监控创建抽检任务后，本页用于对单条抽检记录处理结论。处理结论 PASSED 表示判分一致；ABNORMAL 表示判分异常，需填写组长建议分（可选）和处理说明。处理结果将进入 t_exam_reviewer_quality_metric 影响该教师的质量指标。"
          style="margin-bottom: 16px"
        />

        <a-form layout="vertical" style="max-width: 720px">
          <a-form-item label="抽检记录ID" required>
            <a-input
              v-model:value="form.spotCheckId"
              placeholder="输入抽检记录ID（从抽检通知 / 管理员看板获取）"
            />
          </a-form-item>

          <a-form-item label="处理结论" required>
            <a-radio-group v-model:value="form.conclusion">
              <a-radio-button value="PASSED">一致通过</a-radio-button>
              <a-radio-button value="ABNORMAL">判分异常</a-radio-button>
            </a-radio-group>
          </a-form-item>

          <a-form-item v-if="form.conclusion === 'ABNORMAL'" label="组长建议分（可选）">
            <a-input-number
              v-model:value="form.suggestedScore"
              :min="0"
              :max="100"
              :step="0.5"
              style="width: 100%"
              placeholder="如认为该题应给分，填入建议分"
            />
          </a-form-item>

          <a-form-item label="处理说明">
            <a-textarea
              v-model:value="form.handleNote"
              :rows="4"
              placeholder="说明本次抽检结论的依据（PASSED 可选；ABNORMAL 建议必填）"
            />
          </a-form-item>

          <a-form-item>
            <a-space>
              <UiButton
                :loading="submitting"
                :disabled="!valid"
                @click="handleSubmit"
              >
                <template #icon><CheckCircleOutlined /></template>
                提交处理
              </UiButton>
              <UiButton variant="outline" @click="resetForm">
                <template #icon><ReloadOutlined /></template>
                清空
              </UiButton>
            </a-space>
          </a-form-item>
        </a-form>
      </UiCard>
    </div>
  </GiPageLayout>
</template>

<script lang="ts" setup>
import type { SpotCheckConclusionCode } from '@/apis/mark/marking-quality'
import CheckCircleOutlined from '@ant-design/icons-vue/CheckCircleOutlined'
import ReloadOutlined from '@ant-design/icons-vue/ReloadOutlined'
import message from 'ant-design-vue/es/message'
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { handleSpotCheck } from '@/apis/mark/marking-quality'
import PageHeader from '@/components/common/PageHeader.vue'
import GiPageLayout from '@/components/GiPageLayout/index.vue'
import { UiButton, UiCard } from '@/components/ui-guide/ui'

defineOptions({ name: 'TeacherMarkingSpotCheck' })

const route = useRoute()
const router = useRouter()

const submitting = ref(false)

interface SpotCheckForm {
  spotCheckId: string
  conclusion: SpotCheckConclusionCode
  suggestedScore: number | null
  handleNote: string
}

const form = reactive<SpotCheckForm>({
  spotCheckId: '',
  conclusion: 'PASSED',
  suggestedScore: null,
  handleNote: '',
})

const valid = computed(() => Boolean(form.spotCheckId.trim() && form.conclusion))

async function handleSubmit(): Promise<void> {
  if (!valid.value) return
  submitting.value = true
  try {
    await handleSpotCheck({
      spotCheckId: form.spotCheckId.trim(),
      conclusion: form.conclusion,
      suggestedScore: form.suggestedScore ?? undefined,
      handleNote: form.handleNote.trim() || undefined,
    })
    message.success('已提交抽检处理结论')
    resetForm()
  } catch (error) {
    message.error(error instanceof Error ? error.message : '处理抽检结论失败')
  } finally {
    submitting.value = false
  }
}

function resetForm(): void {
  form.spotCheckId = ''
  form.conclusion = 'PASSED'
  form.suggestedScore = null
  form.handleNote = ''
  void router.replace({ query: {} })
}

onMounted(() => {
  if (route.query.spotCheckId) {
    form.spotCheckId = String(route.query.spotCheckId)
  }
})
</script>

<style lang="scss" scoped>
.spot-check-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.info-card {
  :deep(.ant-card-head-title) {
    display: flex;
    align-items: center;
    gap: 8px;
  }
}
</style>
