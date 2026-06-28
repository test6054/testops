<template>
  <UiCard class="info-card">
    <template #title>
      <FileImageOutlined />
      <span>阅卷影像</span>
    </template>
    <UiEmpty v-if="showWholePaperPlaceholder" description="暂无数据" />
    <a-spin v-else :spinning="loading" tip="加载题目信息中...">
      <UiEmpty v-if="!loaded && !loading" description="题目信息尚未加载" />
      <div v-else-if="questionView" class="question-viewer">
        <div class="question-viewer__header">
          <UiTag tone="blue" size="sm">第 {{ questionView.questionNo }} 题</UiTag>
          <UiTag tone="gray" size="sm">{{ questionView.questionTypeMessage }}</UiTag>
          <UiTag tone="green" size="sm">满分 {{ questionView.fullScore }}</UiTag>
        </div>
        <a-typography-paragraph
          class="question-viewer__stem"
          :ellipsis="{ rows: 3, expandable: true, symbol: '展开' }"
        >
          {{ questionView.questionStem }}
        </a-typography-paragraph>
        <MarkingScanMaterialPanel
          :slice-file-id="questionView.sliceFileId"
          :source-scan-page="questionView.sourceScanPage"
          :master-paper-page="questionView.masterPaperPage"
          :confidential="confidential"
          :exam-label="examLabel"
          :watermark-lines="watermarkLines"
        />
        <template v-if="questionView.standardAnswer || questionView.aiScore != null">
          <a-divider />
          <UiAlertStrip
            v-if="questionView.standardAnswer"
            tone="info"
            title="标准答案"
            dense
            class="marking-question-view-card__standard-answer"
          >
            {{ questionView.standardAnswer }}
            <template v-if="questionView.comparePolicy" #footer>
              <UiTag tone="blue" size="sm">匹配策略：{{ questionView.comparePolicy }}</UiTag>
            </template>
          </UiAlertStrip>
          <UiAlertStrip
            v-if="questionView.evaluationCriteria"
            tone="info"
            title="评分细则"
            :description="questionView.evaluationCriteria"
            dense
          />
          <UiAlertStrip
            v-if="questionView.recognizedAnswer"
            tone="info"
            title="OCR识别"
            :description="questionView.recognizedAnswer"
            dense
          />
          <UiAlertStrip
            v-if="questionView.aiScore != null && questionView.aiDiagnostic"
            tone="info"
            title="AI 建议参考"
            dense
          >
            <template #default>
              AI 建议分：<strong>{{ questionView.aiScore }}</strong> / {{ questionView.fullScore }}
            </template>
            <template v-if="questionView.aiDiagnostic" #footer>
              {{ questionView.aiDiagnostic }}
            </template>
          </UiAlertStrip>
        </template>
      </div>
    </a-spin>
  </UiCard>
</template>

<script lang="ts" setup>
import type { MarkingQuestionViewVO } from '@/apis/mark/marking-organization'
import { FileImageOutlined } from '@ant-design/icons-vue'
import MarkingScanMaterialPanel from '@/components/mark/MarkingScanMaterialPanel.vue'
import UiCard from '@/components/ui-guide/ui/Card.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiAlertStrip from '@/components/ui-guide/ui/UiAlertStrip.vue'

defineOptions({ name: 'MarkingQuestionViewCard' })

defineProps<{
  showWholePaperPlaceholder: boolean
  loading: boolean
  loaded: boolean
  questionView: MarkingQuestionViewVO | null
  confidential?: boolean
  examLabel?: string
  watermarkLines?: string[]
}>()
</script>

<style lang="scss" scoped>
.question-viewer {
  &__header {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-bottom: 12px;
  }

  &__stem {
    margin-bottom: 12px;
  }
}
</style>
