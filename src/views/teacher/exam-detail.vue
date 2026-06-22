<template>
  <div class="exam-workspace-overview">
    <div class="exam-workspace-overview__toolbar">
      <div class="exam-workspace-overview__status">
        <UiTag v-if="detail?.status" :tone="examStatusTone(detail.status)" size="sm">
          {{ examStatusLabel(detail.status) }}
        </UiTag>
        <UiTag v-if="detail?.examNo" tone="gray" size="sm">编号 {{ detail.examNo }}</UiTag>
        <UiTag v-if="detail" tone="blue" size="sm">
          {{ detail.candidateCount }} 人 · {{ detail.questionCount }} 题
        </UiTag>
      </div>
      <div class="exam-workspace-overview__actions">
        <UiButton variant="outline" size="sm" :loading="loading" @click="loadDetail">
          <template #icon><ReloadOutlined /></template>
          刷新
        </UiButton>
        <UiButton size="sm" :disabled="!examId" @click="goPaperTemplate">
          <template #icon><FileOutlined /></template>
          试卷模板
        </UiButton>
        <UiButton size="sm" variant="outline" :disabled="!examId" @click="goAnswerSheetTemplate">
          答题卡
        </UiButton>
        <UiButton size="sm" variant="outline" :disabled="!examId" @click="goRoster">
          考生名册
        </UiButton>
      </div>
    </div>

    <a-spin :spinning="loading">
      <UiEmpty
        v-if="!loading && !detail"
        description="暂无数据"
        class="exam-workspace-overview__empty"
      />

      <a-row v-if="detail" :gutter="16">
        <a-col :xs="24" :lg="16">
          <UiCard class="info-card">
            <template #title>
              <ProfileOutlined />
              <span>基本信息</span>
            </template>
            <a-descriptions :column="{ xs: 1, sm: 2 }" :label-style="labelStyle">
              <a-descriptions-item label="考试名称">{{ detail.examName }}</a-descriptions-item>
              <a-descriptions-item label="考务编号">
                {{ detail.examNo }}
              </a-descriptions-item>
              <a-descriptions-item label="学年学期">
                {{ formatAcademicTerm(detail) || '未设置' }}
              </a-descriptions-item>
              <a-descriptions-item label="状态">
                <UiTag :tone="examStatusTone(detail.status)" size="sm">
                  {{ examStatusLabel(detail.status) }}
                </UiTag>
              </a-descriptions-item>
              <a-descriptions-item label="批改策略">
                {{ gradingStrategyLabel(detail.gradingStrategy) }}
              </a-descriptions-item>
              <a-descriptions-item label="成绩构成">
                {{ scoreCompositionLabel(detail) }}
              </a-descriptions-item>
              <a-descriptions-item label="开始时间">
                {{ formatDateTime(detail.examStartTime) }}
              </a-descriptions-item>
              <a-descriptions-item label="结束时间">
                {{ formatDateTime(detail.examEndTime) }}
              </a-descriptions-item>
              <a-descriptions-item label="创建时间">
                {{ formatDateTime(detail.createTime) }}
              </a-descriptions-item>
              <a-descriptions-item label="更新时间">
                {{ formatDateTime(detail.updateTime) }}
              </a-descriptions-item>
              <a-descriptions-item label="备注" :span="2">
                {{ detail.remark || '未填写考试备注' }}
              </a-descriptions-item>
            </a-descriptions>
          </UiCard>

          <UiCard class="info-card">
            <template #title>
              <FileOutlined />
              <span>试卷模板</span>
              <UiBadge :tone="detail.templateId ? 'green' : 'orange'">
                {{ detail.templateId ? '已配置' : '未配置' }}
              </UiBadge>
            </template>
            <UiEmpty
              v-if="!detail.templateId"
              description="暂无数据"
            >
              <UiButton size="sm" @click="goPaperTemplate">前往配置</UiButton>
            </UiEmpty>
            <a-descriptions v-else :column="{ xs: 1, sm: 2 }" :label-style="labelStyle">
              <a-descriptions-item label="模板名称">
                {{ detail.templateName }}
              </a-descriptions-item>
              <a-descriptions-item label="总页数">
                {{ detail.totalPages }}
              </a-descriptions-item>
              <a-descriptions-item label="题目数量">
                {{ detail.questionCount }}
              </a-descriptions-item>
              <a-descriptions-item label="答案数量">
                {{ detail.answerCount }}
              </a-descriptions-item>
            </a-descriptions>
          </UiCard>
        </a-col>

        <a-col :xs="24" :lg="8">
          <UiCard class="info-card">
            <template #title>
              <TeamOutlined />
              <span>班级范围</span>
            </template>
            <UiEmpty v-if="!detail.classRefs.length" description="尚未设置班级范围" />
            <div v-else class="class-list">
              <UiTag
                v-for="classRef in detail.classRefs"
                :key="classRef.classId"
                tone="blue"
                size="sm"
              >
                {{ classRef.className }}
              </UiTag>
            </div>
            <a-divider />
            <UiButton size="sm" variant="outline" block @click="goRoster"> 管理考生名册 </UiButton>
          </UiCard>

          <UiCard class="info-card">
            <template #title>
              <AppstoreOutlined />
              <span>常用入口</span>
            </template>
            <div class="shortcut-list">
              <button type="button" class="shortcut-btn" @click="goPaperTemplate">
                <FileOutlined />
                <span>试卷模板</span>
              </button>
              <button type="button" class="shortcut-btn" @click="goAnswerSheetTemplate">
                <FormOutlined />
                <span>答题卡模板</span>
              </button>
              <button type="button" class="shortcut-btn" @click="goRoster">
                <TeamOutlined />
                <span>考生名册</span>
              </button>
            </div>
          </UiCard>
        </a-col>
      </a-row>
    </a-spin>
  </div>
</template>

<script lang="ts" setup>
import type { CSSProperties } from 'vue'
import type { ExamDetailVO, ExamStatusCode, GradingStrategyCode } from '@/apis/mark/exam'
import type { BadgeTone } from '@/components/ui-guide/ui/types'
import AppstoreOutlined from '@ant-design/icons-vue/AppstoreOutlined'
import FileOutlined from '@ant-design/icons-vue/FileOutlined'
import FormOutlined from '@ant-design/icons-vue/FormOutlined'
import ProfileOutlined from '@ant-design/icons-vue/ProfileOutlined'
import ReloadOutlined from '@ant-design/icons-vue/ReloadOutlined'
import TeamOutlined from '@ant-design/icons-vue/TeamOutlined'
import { computed, onActivated, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import {
  EXAM_STATUS_LABEL,
  EXAM_STATUS_TONE,
  getExamDetail,
  GRADING_STRATEGY_LABEL,
} from '@/apis/mark/exam'
import UiBadge from '@/components/ui-guide/ui/Badge.vue'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiCard from '@/components/ui-guide/ui/Card.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import { useMarkExamContext } from '@/composables/useMarkExamContext'
import { useWorkspaceExamId } from '@/composables/useMarkWorkbenchContext'
import { formatSemester } from '@/types/enums/semester-enum'
import { showUserError } from '@/utils/error-handler'
import { formatDateTime } from '@/utils/format'
import { strictEnumLabel, strictEnumTone } from '@/utils/strict-enum'

defineOptions({ name: 'TeacherExamWorkspaceOverview' })

const router = useRouter()
const { selectedExamId: examIdRef } = useMarkExamContext()
const { refreshSnapshot } = useWorkspaceExamId()

const examId = computed<string>(() => examIdRef.value ?? '')
const detail = ref<ExamDetailVO | null>(null)
const loading = ref(false)
// 加载失败：toast 提示，主区保持空态/列表壳

const labelStyle: CSSProperties = { color: 'var(--ant-color-text-tertiary)', width: '88px' }

function examStatusTone(status: ExamStatusCode): BadgeTone {
  return strictEnumTone(EXAM_STATUS_TONE, status, '考试状态')
}

function examStatusLabel(status: ExamStatusCode): string {
  return strictEnumLabel(EXAM_STATUS_LABEL, status, '考试状态')
}

function gradingStrategyLabel(strategy?: GradingStrategyCode): string {
  return strategy ? strictEnumLabel(GRADING_STRATEGY_LABEL, strategy, '批改策略') : '租户默认'
}

function scoreCompositionLabel(exam: ExamDetailVO): string {
  if (exam.dailyScoreFull != null) {
    return `期末考试 + 平时成绩（平时满分 ${exam.dailyScoreFull} 分）`
  }
  return '仅计入考试成绩'
}

function formatAcademicTerm(exam: ExamDetailVO): string {
  return [exam.academicYear, formatSemester(exam.semester)].filter(Boolean).join(' · ')
}

async function loadDetail(): Promise<void> {
  if (!examId.value) {
    detail.value = null
    return
  }
  loading.value = true
  try {
    detail.value = await getExamDetail(examId.value)
  } catch (error) {
    detail.value = null
    showUserError(error, '考试详情加载失败')
  } finally {
    loading.value = false
  }
}

function goPaperTemplate(): void {
  void router.push({ name: 'TeacherExamWorkspacePaperTemplate', params: { examId: examId.value } })
}

function goAnswerSheetTemplate(): void {
  void router.push({ name: 'TeacherExamWorkspaceAnswerSheet', params: { examId: examId.value } })
}

function goRoster(): void {
  void router.push({ name: 'TeacherExamWorkspaceCandidateRoster', params: { examId: examId.value } })
}

watch(examId, () => {
  void loadDetail()
})

onMounted(() => {
  void loadDetail()
})

onActivated(() => {
  if (examId.value) {
    void loadDetail()
    void refreshSnapshot()
  }
})
</script>

<style lang="scss" scoped>
.exam-workspace-overview {
  &__toolbar {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 16px;
  }

  &__status,
  &__actions {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px;
  }

  &__empty {
    padding: 48px 0;
  }
}

.info-card {
  margin-bottom: 16px;

  &:last-child {
    margin-bottom: 0;
  }
}

.class-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.shortcut-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.shortcut-btn {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  background: var(--ant-color-fill-quaternary);
  border: 1px solid var(--ant-color-border-secondary);
  border-radius: var(--dp-radius-md, 6px);
  cursor: pointer;
  text-align: left;
  font-size: 14px;
  color: var(--ant-color-text);
  transition:
    border-color 0.2s ease,
    background 0.2s ease;

  &:hover {
    border-color: var(--ant-color-primary-border);
    background: var(--dp-blue-50);
  }
}
</style>
