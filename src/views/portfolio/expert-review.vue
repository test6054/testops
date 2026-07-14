<script setup lang="ts">
import type { ColumnsType } from 'ant-design-vue/es/table'
import type { PortfolioExpertAssignmentReviewBundleVO } from '@/apis/portfolio/expert-assignment'
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { portfolioExpertAssignmentApi } from '@/apis/portfolio/expert-assignment'
import UiCard from '@/components/ui-guide/ui/Card.vue'
import UiButton from '@/components/ui-guide/ui/UiButton.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiEmpty from '@/components/ui-guide/ui/UiEmpty.vue'
import UiTag from '@/components/ui-guide/ui/UiTag.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import { useUiTableLoadError } from '@/composables/useUiTableLoadError'
import { showUserError } from '@/utils/error-handler'

const route = useRoute()
const router = useRouter()
const loading = ref(false)
const { loadError, beginLoad, failLoad, okLoad } = useUiTableLoadError()
const bundle = ref<PortfolioExpertAssignmentReviewBundleVO | null>(null)

const accessToken = computed(() => {
  const token = route.query.accessToken
  return typeof token === 'string' ? token : undefined
})

const assignmentId = computed(() => {
  const id = route.query.assignmentId
  return typeof id === 'string' ? id : undefined
})

const subjectTeacherColumns: ColumnsType = [
  { title: '被评教师', dataIndex: 'maskedDisplayName', key: 'maskedDisplayName' },
  { title: '教师 ID', dataIndex: 'teacherUserId', key: 'teacherUserId', width: 160 },
]

const materialColumns: ColumnsType = [
  { title: '教师', dataIndex: 'maskedTeacherLabel', key: 'maskedTeacherLabel', width: 140 },
  { title: '分类', dataIndex: 'categoryName', key: 'categoryName', width: 160 },
  { title: '分类编码', dataIndex: 'categoryCode', key: 'categoryCode', width: 140 },
  { title: '学年', dataIndex: 'academicYear', key: 'academicYear', width: 100 },
  { title: '版本', dataIndex: 'documentVersionNo', key: 'documentVersionNo', width: 80 },
  { title: '来源', dataIndex: 'sourceType', key: 'sourceType', width: 100 },
  { title: '主附件', key: 'hasPrimaryFile', width: 90 },
  { title: '支撑材料', dataIndex: 'supportMaterialCount', key: 'supportMaterialCount', width: 100 },
]

async function loadBundle() {
  if (!accessToken.value && !assignmentId.value) {
    bundle.value = null
    return
  }
  beginLoad()
  loading.value = true
  try {
    bundle.value = await portfolioExpertAssignmentApi.reviewBundle({
      accessToken: accessToken.value,
      assignmentId: assignmentId.value,
    })
  
    okLoad()
  } catch (error) {
    failLoad()
    bundle.value = null
    showUserError(error, '加载失败')
  } finally {
    loading.value = false
  }
}

function goEvaluationFill() {
  if (!bundle.value?.evaluationTaskId) {
    return
  }
  void router.push({
    path: '/portfolio/expert/evaluation-fill',
    query: { evaluationTaskId: bundle.value.evaluationTaskId },
  })
}

onMounted(() => {
  void loadBundle()
})
</script>

<template>
  <StageWorkbenchShell>
    <ContextBar
      title="外部专家脱敏审阅"
      subtitle="只读审阅正式档案材料；填分请进入评价填报"
    >
      <template #extra>
        <UiButton
          v-if="bundle"
          variant="primary"
          @click="goEvaluationFill"
        >
          去评价填报
        </UiButton>
      </template>
    </ContextBar>
    <UiCard :loading="loading">
      <template v-if="bundle">
        <div class="expert-review__meta">
          <span>任务：{{ bundle.evaluationTaskName }}</span>
          <UiTag :tone="bundle.readOnly ? 'blue' : 'gray'">
            {{ bundle.readOnly ? '只读' : '—' }}
          </UiTag>
          <UiTag :tone="bundle.maskRequired ? 'green' : 'gray'">
            {{ bundle.maskRequired ? '已脱敏' : '未脱敏' }}
          </UiTag>
          <span>过期：{{ bundle.expireTime }}</span>
        </div>
        <UiDataTable
          pagination-mode="none"
          class="expert-review__teachers"
          :columns="subjectTeacherColumns"
          :data-source="bundle.subjectTeachers"
          :show-pagination="false"
          :total="bundle.subjectTeachers.length"
          row-key="teacherUserId"
          size="small"
          flat
          empty-kind="first-run"
          empty-description="当前审阅包无被评教师，请核对指派或令牌。"
        />
        <h4 class="expert-review__section-title">授权材料清单</h4>
        <UiDataTable
          :load-error="loadError"
          row-key="archiveRecordId"
          :columns="materialColumns"
          :data-source="bundle.materials"
          :pagination="false"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'hasPrimaryFile'">
              {{ record.hasPrimaryFile ? '有' : '无' }}
            </template>
          </template>
          <template #emptyText>
            <UiEmpty title="暂无内容" />
          </template>
        </UiDataTable>
      </template>
      <UiEmpty v-else title="暂无内容" />
    </UiCard>
  </StageWorkbenchShell>
</template>

<style scoped>
.expert-review__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
  margin-bottom: 16px;
  font-size: 14px;
}
.expert-review__teachers {
  margin-bottom: 16px;
}
.expert-review__section-title {
  margin: 0 0 8px;
  font-size: 14px;
  font-weight: 600;
}
</style>
