<script setup lang="ts">
/**
 * 达成度结果与审核
 *
 * 功能：
 * - 顶栏：触发 7 类计算（课程目标 / 观测点 / 毕业要求 / 培养目标 / 专业汇总 / 课程思政 / 复杂工程）
 * - 主列表：按 目标类型 / 审核状态 / 达成结论 筛选
 * - 行内操作：提交 / 通过 / 驳回 / 归档 / 详情跳转
 */
import type {
  AchievementAuditStatus,
  AchievementResultQueryPayload,
  AchievementResultVO,
  AchievementStatus,
  AchievementTargetType,
} from '@/apis/quality'
import {
  ACHIEVEMENT_AUDIT_STATUS_COLOR,
  ACHIEVEMENT_AUDIT_STATUS_LABEL,
  ACHIEVEMENT_STATUS_COLOR,
  ACHIEVEMENT_STATUS_LABEL,
  ACHIEVEMENT_TARGET_TYPE_LABEL,
  achievementApi,
} from '@/apis/quality'
import { message } from 'ant-design-vue'
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useQualityStore } from '@/stores/modules/quality'
import { promptModal } from './_helpers'

const router = useRouter()
const qualityStore = useQualityStore()

const list = ref<AchievementResultVO[]>([])
const total = ref(0)
const loading = ref(false)
const triggerLoading = ref<string>('')

const query = reactive<AchievementResultQueryPayload>({
  pageNum: 1,
  pageSize: 10,
  trainingPlanId: qualityStore.currentTrainingPlanId,
  targetType: undefined,
  auditStatus: undefined,
  achievementStatus: undefined,
  qualityCourseId: '',
  classId: '',
  schoolYear: '',
  semester: '',
})

const triggerForm = reactive({
  trainingPlanId: qualityStore.currentTrainingPlanId,
  qualityCourseId: '',
  schoolYear: qualityStore.currentSchoolYear || '',
  semester: qualityStore.currentSemester || '',
  programId: qualityStore.currentProgramId,
})

const targetTypeOptions = Object.entries(ACHIEVEMENT_TARGET_TYPE_LABEL).map(([value, label]) => ({
  value,
  label,
}))
const auditStatusOptions = Object.entries(ACHIEVEMENT_AUDIT_STATUS_LABEL).map(([value, label]) => ({
  value,
  label,
}))
const achievementStatusOptions = Object.entries(ACHIEVEMENT_STATUS_LABEL).map(([value, label]) => ({
  value,
  label,
}))

const trainingPlanRequired = computed(() => !qualityStore.currentTrainingPlanId)
const programRequired = computed(
  () => !qualityStore.currentProgramId && !triggerForm.programId.trim(),
)

async function loadList() {
  if (!qualityStore.currentTrainingPlanId) return
  loading.value = true
  try {
    const page = await achievementApi.page({
      ...query,
      trainingPlanId: qualityStore.currentTrainingPlanId,
      qualityCourseId: query.qualityCourseId || undefined,
      classId: query.classId || undefined,
      schoolYear: query.schoolYear || undefined,
      semester: query.semester || undefined,
      targetType: query.targetType || undefined,
      auditStatus: query.auditStatus || undefined,
      achievementStatus: query.achievementStatus || undefined,
    })
    list.value = page.list
    total.value = page.total
  } finally {
    loading.value = false
  }
}

function handlePageChange(page: number, pageSize: number) {
  query.pageNum = page
  query.pageSize = pageSize
  loadList()
}

function resetQuery() {
  query.pageNum = 1
  query.targetType = undefined
  query.auditStatus = undefined
  query.achievementStatus = undefined
  query.qualityCourseId = ''
  query.classId = ''
  query.schoolYear = ''
  query.semester = ''
  loadList()
}

/**
 * 6 类确定性计算入口。后端实际端点：
 *  - compute-course-goal              需要 qualityCourseId + courseGoalId
 *  - compute-requirement              毕业要求 / 观测点合并，需 trainingPlanId
 *  - compute-program                  专业汇总
 *  - compute-training-objective       培养目标
 *  - compute-civic-goal-aggregate     课程思政独立汇总
 *  - compute-complex-engineering-aggregate  复杂工程问题专项
 */
const triggerButtons: Array<{ key: string; label: string; handler: () => Promise<unknown> }> = [
  {
    key: 'COURSE_GOAL',
    label: '课程目标',
    handler: () => {
      if (!triggerForm.qualityCourseId?.trim()) {
        message.warning(
          '课程目标计算必须填写 qualityCourseId 与 courseGoalId（在备注栏临时输入：格式 courseGoalId=...）',
        )
        return Promise.reject(new Error('missing courseGoalId'))
      }
      // eslint-disable-next-line no-alert
      const courseGoalId =
        (typeof window !== 'undefined'
          ? window.prompt('请输入 courseGoalId（课程目标 ID）')
          : '') || ''
      if (!courseGoalId.trim()) return Promise.reject(new Error('cancelled'))
      return achievementApi.computeCourseGoal({
        qualityCourseId: triggerForm.qualityCourseId!,
        courseGoalId: courseGoalId.trim(),
        schoolYear: triggerForm.schoolYear,
        semester: triggerForm.semester,
      })
    },
  },
  {
    key: 'REQUIREMENT',
    label: '毕业要求 / 观测点',
    handler: () =>
      achievementApi.computeRequirement({
        programId: triggerForm.programId || qualityStore.currentProgramId,
        trainingPlanId: qualityStore.currentTrainingPlanId,
        schoolYear: triggerForm.schoolYear,
        semester: triggerForm.semester,
      }),
  },
  {
    key: 'TRAINING_OBJECTIVE',
    label: '培养目标',
    handler: () => {
      // eslint-disable-next-line no-alert
      const trainingObjectiveId =
        (typeof window !== 'undefined'
          ? window.prompt('请输入 trainingObjectiveId（培养目标 ID）')
          : '') || ''
      if (!trainingObjectiveId.trim()) return Promise.reject(new Error('cancelled'))
      return achievementApi.computeTrainingObjective({
        programId: triggerForm.programId || qualityStore.currentProgramId,
        trainingPlanId: qualityStore.currentTrainingPlanId,
        trainingObjectiveId: trainingObjectiveId.trim(),
        schoolYear: triggerForm.schoolYear,
        semester: triggerForm.semester,
      })
    },
  },
  {
    key: 'PROGRAM',
    label: '专业汇总',
    handler: () =>
      achievementApi.computeProgram({
        trainingPlanId: qualityStore.currentTrainingPlanId,
        programId: triggerForm.programId || qualityStore.currentProgramId,
        schoolYear: triggerForm.schoolYear,
        semester: triggerForm.semester,
      }),
  },
  {
    key: 'CIVIC_GOAL_AGGREGATE',
    label: '课程思政',
    handler: () =>
      achievementApi.computeCivicGoalAggregate({
        programId: triggerForm.programId || qualityStore.currentProgramId,
        trainingPlanId: qualityStore.currentTrainingPlanId,
        schoolYear: triggerForm.schoolYear,
        semester: triggerForm.semester,
      }),
  },
  {
    key: 'COMPLEX_ENGINEERING',
    label: '复杂工程',
    handler: () =>
      achievementApi.computeComplexEngineeringAggregate({
        programId: triggerForm.programId || qualityStore.currentProgramId,
        trainingPlanId: qualityStore.currentTrainingPlanId,
        schoolYear: triggerForm.schoolYear,
        semester: triggerForm.semester,
      }),
  },
]

async function handleTrigger(key: string, handler: () => Promise<unknown>) {
  if (!qualityStore.currentTrainingPlanId) {
    message.warning('请先在顶部选择培养方案')
    return
  }
  if (programRequired.value) {
    message.warning('请先在顶部选择专业或填写专业 ID')
    return
  }
  triggerLoading.value = key
  try {
    const result = await handler()
    const count = Array.isArray(result)
      ? result.length
      : result && typeof result === 'object' && 'achievementResultId' in result
        ? 1
        : 0
    message.success(count > 0 ? `计算完成，生成 / 更新 ${count} 条结果` : '计算完成')
    await loadList()
  } catch (err) {
    // 计算被用户取消（如未填 courseGoalId）静默忽略
    if (
      err instanceof Error &&
      (err.message === 'cancelled' || err.message === 'missing courseGoalId')
    )
      return
    throw err
  } finally {
    triggerLoading.value = ''
  }
}

const auditTransitMap: Record<AchievementAuditStatus, AchievementAuditStatus[]> = {
  DRAFT: ['SUBMITTED'],
  CALCULATED: ['SUBMITTED'],
  SUBMITTED: ['CONFIRMED', 'RETURNED'],
  CONFIRMED: ['ARCHIVED'],
  RETURNED: ['SUBMITTED'],
  ARCHIVED: [],
}

function nextStatuses(current: AchievementAuditStatus) {
  return auditTransitMap[current] || []
}

function statusLabel(status: AchievementAuditStatus) {
  return ACHIEVEMENT_AUDIT_STATUS_LABEL[status]
}

async function handleTransit(record: AchievementResultVO, to: AchievementAuditStatus) {
  const remark = await promptModal({
    title: `${statusLabel(record.auditStatus)} → ${statusLabel(to)}`,
    placeholder: '审核备注（驳回时必填）',
    required: to === 'RETURNED',
    okType: to === 'RETURNED' ? 'danger' : 'primary',
    emptyErrorMessage: '驳回必须填写审核备注',
  })
  if (to === 'RETURNED' && !remark) return
  await achievementApi.updateAuditStatus({
    id: record.id,
    auditStatus: to,
    auditRemark: remark || undefined,
  })
  message.success('流转成功')
  await loadList()
}

function formatValue(value?: number) {
  return value == null ? '-' : value.toFixed(3)
}

function goDetail(record: AchievementResultVO) {
  router.push({
    name: 'QualityAchievementDetail',
    params: { resultId: record.id },
  })
}

watch(
  () => qualityStore.currentTrainingPlanId,
  (value) => {
    triggerForm.trainingPlanId = value
    query.trainingPlanId = value
    triggerForm.programId = qualityStore.currentProgramId
    loadList()
  },
)

onMounted(async () => {
  if (!qualityStore.currentTrainingPlanId) {
    await qualityStore.loadTrainingPlanOptions()
    if (qualityStore.trainingPlanOptions.length) {
      qualityStore.setCurrent({ trainingPlanId: qualityStore.trainingPlanOptions[0].id })
    }
  }
  triggerForm.trainingPlanId = qualityStore.currentTrainingPlanId
  triggerForm.programId = qualityStore.currentProgramId
  query.trainingPlanId = qualityStore.currentTrainingPlanId
  await loadList()
})
</script>

<template>
  <div class="achievement-page">
    <a-alert
      v-if="trainingPlanRequired"
      type="warning"
      show-icon
      message="尚未选择培养方案，请前往工作台首页选择后再回来"
      style="margin-bottom: 12px"
    />

    <a-card title="触发达成度计算" :bordered="false" class="trigger-card">
      <a-form layout="inline" :model="triggerForm">
        <a-form-item label="课程">
          <a-input
            v-model:value="triggerForm.qualityCourseId"
            placeholder="quality_course_id（可选）"
            style="width: 200px"
          />
        </a-form-item>
        <a-form-item label="专业">
          <a-input
            v-model:value="triggerForm.programId"
            placeholder="program_id（可选）"
            style="width: 140px"
          />
        </a-form-item>
        <a-form-item label="学年">
          <a-input
            v-model:value="triggerForm.schoolYear"
            placeholder="例：2024-2025"
            style="width: 140px"
          />
        </a-form-item>
        <a-form-item label="学期">
          <a-select
            v-model:value="triggerForm.semester"
            placeholder="学期"
            style="width: 100px"
            allow-clear
          >
            <a-select-option value="1"> 1 </a-select-option>
            <a-select-option value="2"> 2 </a-select-option>
          </a-select>
        </a-form-item>
      </a-form>
      <a-divider style="margin: 12px 0" />
      <a-space wrap>
        <a-button
          v-for="btn in triggerButtons"
          :key="btn.key"
          :loading="triggerLoading === btn.key"
          :disabled="trainingPlanRequired"
          type="primary"
          ghost
          @click="handleTrigger(btn.key, btn.handler)"
        >
          {{ btn.label }}
        </a-button>
      </a-space>
    </a-card>

    <a-card title="达成度结果" :bordered="false" class="list-card">
      <template #extra>
        <a-space>
          <a-select
            v-model:value="query.targetType"
            placeholder="目标类型"
            style="width: 160px"
            allow-clear
            :options="targetTypeOptions"
          />
          <a-select
            v-model:value="query.auditStatus"
            placeholder="审核状态"
            style="width: 140px"
            allow-clear
            :options="auditStatusOptions"
          />
          <a-select
            v-model:value="query.achievementStatus"
            placeholder="达成结论"
            style="width: 140px"
            allow-clear
            :options="achievementStatusOptions"
          />
          <a-input
            v-model:value="query.qualityCourseId"
            placeholder="课程 ID"
            style="width: 120px"
          />
          <a-input v-model:value="query.classId" placeholder="班级 ID" style="width: 120px" />
          <a-input v-model:value="query.schoolYear" placeholder="学年" style="width: 110px" />
          <a-input v-model:value="query.semester" placeholder="学期" style="width: 70px" />
          <a-button type="primary" @click="loadList"> 查询 </a-button>
          <a-button @click="resetQuery"> 重置 </a-button>
        </a-space>
      </template>

      <a-table
        :data-source="list"
        :loading="loading"
        row-key="id"
        size="middle"
        :pagination="{
          current: query.pageNum,
          pageSize: query.pageSize,
          total,
          showSizeChanger: true,
          showTotal: (n: number) => `共 ${n} 条`,
          onChange: handlePageChange,
        }"
      >
        <a-table-column title="ID" data-index="id" width="100" />
        <a-table-column title="目标类型" data-index="targetType" width="140">
          <template #default="{ text }">
            {{ ACHIEVEMENT_TARGET_TYPE_LABEL[text as AchievementTargetType] || text }}
          </template>
        </a-table-column>
        <a-table-column title="目标 ID" data-index="targetId" width="120">
          <template #default="{ text }">{{ text || '-' }}</template>
        </a-table-column>
        <a-table-column title="课程 ID" data-index="qualityCourseId" width="120">
          <template #default="{ text }">{{ text || '-' }}</template>
        </a-table-column>
        <a-table-column title="班级 ID" data-index="classId" width="120">
          <template #default="{ text }">{{ text || '-' }}</template>
        </a-table-column>
        <a-table-column title="学年 / 学期" width="120">
          <template #default="{ record }">
            {{ record.schoolYear || '-' }} / {{ record.semester || '-' }}
          </template>
        </a-table-column>
        <a-table-column title="达成值 / 阈值" width="140">
          <template #default="{ record }">
            <span
              :style="{
                color:
                  record.thresholdValue != null &&
                  record.finalValue != null &&
                  Number(record.finalValue) < Number(record.thresholdValue)
                    ? '#ff4d4f'
                    : '#52c41a',
              }"
              >{{ formatValue(record.finalValue) }}</span
            >
            <span style="color: #999"> / {{ formatValue(record.thresholdValue) }}</span>
          </template>
        </a-table-column>
        <a-table-column title="样本（有效 / 总量）" width="110">
          <template #default="{ record }">
            {{ record.sampleValid ?? '-' }} / {{ record.sampleTotal ?? '-' }}
          </template>
        </a-table-column>
        <a-table-column title="达成结论" data-index="achievementStatus" width="120">
          <template #default="{ text }">
            <a-tag v-if="text" :color="ACHIEVEMENT_STATUS_COLOR[text as AchievementStatus]">
              {{ ACHIEVEMENT_STATUS_LABEL[text as AchievementStatus] }}
            </a-tag>
            <span v-else>-</span>
          </template>
        </a-table-column>
        <a-table-column title="审核" data-index="auditStatus" width="110">
          <template #default="{ text }">
            <a-tag :color="ACHIEVEMENT_AUDIT_STATUS_COLOR[text as AchievementAuditStatus]">
              {{ ACHIEVEMENT_AUDIT_STATUS_LABEL[text as AchievementAuditStatus] }}
            </a-tag>
          </template>
        </a-table-column>
        <a-table-column title="操作" width="260" fixed="right">
          <template #default="{ record }">
            <a-space wrap>
              <a-button type="link" size="small" @click="goDetail(record)"> 详情 </a-button>
              <a-button
                v-for="to in nextStatuses(record.auditStatus)"
                :key="to"
                type="link"
                size="small"
                :danger="to === 'RETURNED'"
                @click="handleTransit(record, to)"
              >
                → {{ statusLabel(to) }}
              </a-button>
            </a-space>
          </template>
        </a-table-column>
      </a-table>
    </a-card>
  </div>
</template>

<style scoped lang="scss">
.achievement-page {
  padding: 16px;

  .trigger-card,
  .list-card {
    margin-bottom: 16px;
  }
}
</style>
