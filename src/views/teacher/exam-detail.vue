<template>
  <StageWorkbenchShell>
    <template #context>
      <div class="exam-detail-page__context">
        <div class="exam-detail-page__context-left">
          <UiTag v-if="detail?.status" :tone="EXAM_STATUS_TONE[detail.status]" size="sm">
            {{ detail.statusMessage || EXAM_STATUS_LABEL[detail.status] }}
          </UiTag>
          <UiTag v-if="detail?.examNo" tone="gray" size="sm">编号 {{ detail.examNo }}</UiTag>
          <UiTag v-if="detail" tone="blue" size="sm">
            {{ detail.candidateCount }} 人 · {{ detail.questionCount }} 题
          </UiTag>
        </div>
        <div class="exam-detail-page__context-right">
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
    </template>

    <a-spin :spinning="loading">
      <!-- D-9 错误态：考试详情加载失败时提供重试 + 上报入口 -->
      <UiErrorRetryPanel
        v-if="detailLoadError"
        :error="detailLoadError"
        title="考试详情加载失败"
        :helper="`考试 ID：${examId}`"
        @retry="loadDetail"
      />
      <UiEmpty
        v-else-if="!loading && !detail"
        description="未查询到考试数据"
        class="exam-detail-page__empty"
      />

      <a-row v-if="detail" :gutter="16">
        <!-- 基本信息 -->
        <a-col :xs="24" :lg="16">
          <UiCard class="info-card">
            <template #title>
              <ProfileOutlined />
              <span>基本信息</span>
            </template>
            <a-descriptions :column="{ xs: 1, sm: 2 }" :label-style="labelStyle">
              <a-descriptions-item label="考试名称">{{ detail.examName }}</a-descriptions-item>
              <a-descriptions-item label="考试编号">
                {{ detail.examNo || '-' }}
              </a-descriptions-item>
              <a-descriptions-item label="状态">
                <UiTag :tone="EXAM_STATUS_TONE[detail.status]" size="sm">
                  {{ detail.statusMessage || EXAM_STATUS_LABEL[detail.status] }}
                </UiTag>
              </a-descriptions-item>
              <a-descriptions-item label="批改策略">
                {{ detail.gradingStrategy || '默认' }}
              </a-descriptions-item>
              <a-descriptions-item label="开始时间">
                {{ formatTime(detail.examStartTime) }}
              </a-descriptions-item>
              <a-descriptions-item label="结束时间">
                {{ formatTime(detail.examEndTime) }}
              </a-descriptions-item>
              <a-descriptions-item label="创建时间">
                {{ formatTime(detail.createTime) }}
              </a-descriptions-item>
              <a-descriptions-item label="更新时间">
                {{ formatTime(detail.updateTime) }}
              </a-descriptions-item>
              <a-descriptions-item label="备注" :span="2">
                {{ detail.remark || '-' }}
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
              description="尚未配置试卷模板，请先在「试卷模板」页面录入题目和页面配置。"
            >
              <UiButton size="sm" @click="goPaperTemplate">前往配置</UiButton>
            </UiEmpty>
            <a-descriptions v-else :column="{ xs: 1, sm: 2 }" :label-style="labelStyle">
              <a-descriptions-item label="模板ID">{{ detail.templateId }}</a-descriptions-item>
              <a-descriptions-item label="模板名称">
                {{ detail.templateName || '-' }}
              </a-descriptions-item>
              <a-descriptions-item label="总页数">
                {{ detail.totalPages ?? '-' }}
              </a-descriptions-item>
            </a-descriptions>
          </UiCard>
        </a-col>

        <!-- 班级范围 + 快捷入口 -->
        <a-col :xs="24" :lg="8">
          <UiCard class="info-card">
            <template #title>
              <TeamOutlined />
              <span>班级范围</span>
              <UiBadge tone="blue">{{ detail.classIds.length }}</UiBadge>
            </template>
            <UiEmpty v-if="!detail.classIds.length" description="尚未设置班级范围" />
            <div v-else class="class-list">
              <UiTag v-for="classId in detail.classIds" :key="classId" tone="blue" size="sm">
                班级 #{{ classId }}
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
  </StageWorkbenchShell>
</template>

<script lang="ts" setup>
import type { CSSProperties } from 'vue'
import type { ExamDetailVO } from '@/apis/mark/exam'
import AppstoreOutlined from '@ant-design/icons-vue/AppstoreOutlined'
import FileOutlined from '@ant-design/icons-vue/FileOutlined'
import FormOutlined from '@ant-design/icons-vue/FormOutlined'
import ProfileOutlined from '@ant-design/icons-vue/ProfileOutlined'
import ReloadOutlined from '@ant-design/icons-vue/ReloadOutlined'
import TeamOutlined from '@ant-design/icons-vue/TeamOutlined'
import message from 'ant-design-vue/es/message'
import dayjs from 'dayjs'
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { EXAM_STATUS_LABEL, EXAM_STATUS_TONE, getExamDetail } from '@/apis/mark/exam'
import {
  UiBadge,
  UiButton,
  UiCard,
  UiEmpty,
  UiErrorRetryPanel,
  UiTag,
} from '@/components/ui-guide/ui'
import { StageWorkbenchShell } from '@/components/workbench'

defineOptions({ name: 'TeacherExamDetail' })

const route = useRoute()
const router = useRouter()

const examId = computed<string>(() => String(route.params.examId ?? ''))
const detail = ref<ExamDetailVO | null>(null)
const loading = ref(false)
// D-9 错误态：考试详情加载失败时 UiErrorRetryPanel 重试 + 上报
const detailLoadError = ref<unknown>(null)

const labelStyle: CSSProperties = { color: 'var(--ant-color-text-tertiary)', width: '88px' }

function formatTime(value?: string): string {
  if (!value) return '-'
  return dayjs(value).format('YYYY-MM-DD HH:mm')
}

async function loadDetail(): Promise<void> {
  if (!examId.value) {
    detail.value = null
    return
  }
  loading.value = true
  detailLoadError.value = null
  try {
    detail.value = await getExamDetail(examId.value)
  } catch (error) {
    detail.value = null
    detailLoadError.value = error
    const errMsg = error instanceof Error ? error.message : '加载考试详情失败'
    message.error(errMsg)
  } finally {
    loading.value = false
  }
}

function goBack(): void {
  void router.push({ name: 'TeacherExamList' })
}

function goPaperTemplate(): void {
  void router.push({ name: 'TeacherPaperTemplate', query: { examId: examId.value } })
}

function goAnswerSheetTemplate(): void {
  void router.push({ name: 'TeacherAnswerSheetTemplate', query: { examId: examId.value } })
}

function goRoster(): void {
  void router.push({ name: 'TeacherCandidateRoster', query: { examId: examId.value } })
}

watch(examId, () => {
  void loadDetail()
})

onMounted(() => {
  void loadDetail()
})
</script>

<style lang="scss" scoped>
.exam-detail-page {
  &__context {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    flex-wrap: wrap;
  }

  &__context-left {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }

  &__context-right {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;
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
    border-color: rgba(22, 119, 255, 0.3);
    background: linear-gradient(135deg, rgba(22, 119, 255, 0.05) 0%, rgba(22, 119, 255, 0.02) 100%);
  }
}

.empty-block {
  padding: 48px 0;
}
</style>
