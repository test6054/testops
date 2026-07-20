<script setup lang="ts">
import type { ColumnsType } from 'ant-design-vue/es/table'
import type { PortfolioPublicExpertReviewBundleVO } from '@/apis/portfolio/public-expert'
import { computed, onMounted, ref } from 'vue'
import { portfolioPublicExpertApi } from '@/apis/portfolio/public-expert'
import UiCard from '@/components/ui-guide/ui/Card.vue'
import UiButton from '@/components/ui-guide/ui/UiButton.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiEmpty from '@/components/ui-guide/ui/UiEmpty.vue'
import UiTag from '@/components/ui-guide/ui/UiTag.vue'
import { useUiTableLoadError } from '@/composables/useUiTableLoadError'
import { showUserError } from '@/utils/error-handler'

const loading = ref(false)
const { loadError, beginLoad, failLoad, okLoad } = useUiTableLoadError()
const bundle = ref<PortfolioPublicExpertReviewBundleVO | null>(null)
const errorMessage = ref('')
const requestToken = ref(0)

/** 被评教师中处于评价参评 hold 的人数。 */
const heldSubjectCount = computed(() =>
  (bundle.value?.subjectTeachers ?? []).filter((item) => Boolean(item.evaluationHeld)).length,
)

const publicLinkParams = new URLSearchParams(window.location.hash.replace(/^#/, ''))
const tenantId = publicLinkParams.get('tenantId') || undefined
const accessToken = publicLinkParams.get('accessToken') || undefined

const subjectTeacherColumns: ColumnsType = [
  { title: '被评教师', dataIndex: 'maskedDisplayName', key: 'maskedDisplayName' },
  { title: '生命周期', key: 'lifecycleStatus', width: 160 },
]

const materialColumns: ColumnsType = [
  { title: '教师', dataIndex: 'maskedTeacherLabel', key: 'maskedTeacherLabel', width: 140 },
  { title: '分类', dataIndex: 'categoryName', key: 'categoryName', width: 160 },
  { title: '分类编码', dataIndex: 'categoryCode', key: 'categoryCode', width: 140 },
  { title: '学年', dataIndex: 'academicYear', key: 'academicYear', width: 100 },
  { title: '版本', dataIndex: 'documentVersionNo', key: 'documentVersionNo', width: 80 },
  { title: '来源', dataIndex: 'sourceType', key: 'sourceType', width: 100 },
  { title: '主附件', key: 'hasPrimaryFile', width: 90 },
  { title: '身份切片', key: 'identityScope', width: 100 },
  { title: '校内硬性', key: 'usableForCampusHardCriteria', width: 110 },
  { title: '支撑材料', dataIndex: 'supportMaterialCount', key: 'supportMaterialCount', width: 100 },
  { title: '生命周期', key: 'lifecycleStatus', width: 160 },
]

async function loadBundle() {
  if (!tenantId || !accessToken) {
    bundle.value = null
    errorMessage.value = '审阅链接缺少租户或访问令牌，请联系授权管理员重新获取。'
    return
  }
  const currentToken = requestToken.value + 1
  requestToken.value = currentToken
  beginLoad()
  loading.value = true
  errorMessage.value = ''
  try {
    const result = await portfolioPublicExpertApi.reviewBundle({
      tenantId,
      accessToken,
    })
    if (requestToken.value !== currentToken) return
    bundle.value = result
    okLoad()
  } catch (error) {
    if (requestToken.value !== currentToken) return
    failLoad()
    bundle.value = null
    errorMessage.value = '授权无效、已过期或已被吊销，请联系授权管理员。'
    showUserError(error, '加载外部专家授权失败')
  } finally {
    if (requestToken.value === currentToken) loading.value = false
  }
}

onMounted(() => {
  void loadBundle()
})
</script>

<template>
  <div class="public-expert-review">
    <header class="public-expert-review__header">
      <h1>外部专家脱敏审阅</h1>
      <p>免登录只读审阅；填分请使用系统账号登录后进入评价填报</p>
    </header>
    <UiCard :loading="loading">
      <template v-if="bundle">
        <div class="public-expert-review__meta">
          <span>任务：{{ bundle.evaluationTaskName }}</span>
          <UiTag :tone="bundle.readOnly ? 'blue' : 'gray'">
            {{ bundle.readOnly ? '只读' : '—' }}
          </UiTag>
          <UiTag :tone="bundle.maskRequired ? 'green' : 'gray'">
            {{ bundle.maskRequired ? '已脱敏' : '未脱敏' }}
          </UiTag>
          <span>过期：{{ bundle.expireTime }}</span>
          <UiTag v-if="heldSubjectCount > 0" tone="orange">
            参评 hold {{ heldSubjectCount }}/{{ bundle.subjectTeachers.length }}
          </UiTag>
        </div>
        <p v-if="heldSubjectCount > 0" class="public-expert-review__hold-hint">
          封存 / 暂挂 / 迁出链路教师处于评价参评 hold：材料只读可查，禁止对其填报；后端会硬拦。
        </p>
        <UiDataTable
          pagination-mode="none"
          class="public-expert-review__teachers"
          :columns="subjectTeacherColumns"
          :data-source="bundle.subjectTeachers"
          :show-pagination="false"
          :total="bundle.subjectTeachers.length"
          row-key="subjectRef"
          size="small"
          flat
          empty-kind="first-run"
          empty-description="当前审阅包无被评教师，请核对租户与访问令牌。"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'lifecycleStatus'">
              <UiTag v-if="record.lifecycleStatus" :tone="record.lifecycleStatus === 'ACTIVE' ? 'green' : 'orange'">
                {{ record.lifecycleStatusLabel || record.lifecycleStatus }}
              </UiTag>
              <UiTag v-if="record.evaluationHeld" tone="orange" class="ml-1">参评 hold</UiTag>
              <span v-else-if="!record.lifecycleStatus">—</span>
            </template>
          </template>
        </UiDataTable>
        <h4 class="public-expert-review__section-title">授权材料清单</h4>
        <UiDataTable
          :load-error="loadError"
          row-key="materialRef"
          :columns="materialColumns"
          :data-source="bundle.materials"
          :pagination="false"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'lifecycleStatus'">
              <UiTag v-if="record.lifecycleStatus" :tone="record.lifecycleStatus === 'ACTIVE' ? 'green' : 'orange'">
                {{ record.lifecycleStatusLabel || record.lifecycleStatus }}
              </UiTag>
              <UiTag v-if="record.evaluationHeld" tone="orange" class="ml-1">参评 hold</UiTag>
              <span v-else-if="!record.lifecycleStatus">—</span>
            </template>
            <template v-else-if="column.key === 'hasPrimaryFile'">
              {{ record.hasPrimaryFile ? '有' : '无' }}
            </template>
            <template v-else-if="column.key === 'identityScope'">
              <UiTag :tone="record.identityScope === 'EXTERNAL' ? 'orange' : record.identityScope === 'SHARED' ? 'green' : 'blue'">
                {{
                  record.identityScope === 'CAMPUS'
                    ? '校内'
                    : record.identityScope === 'EXTERNAL'
                      ? '仅外部'
                      : record.identityScope === 'SHARED'
                        ? '共享'
                        : (record.identityScope || '—')
                }}
              </UiTag>
            </template>
            <template v-else-if="column.key === 'usableForCampusHardCriteria'">
              <UiTag :tone="record.usableForCampusHardCriteria ? 'green' : 'orange'">
                {{ record.usableForCampusHardCriteria ? '可用' : '不可用' }}
              </UiTag>
            </template>
          </template>
          <template #emptyText>
            <UiEmpty size="sm" title="暂无内容" />
          </template>
        </UiDataTable>
      </template>
      <UiEmpty
        size="sm"
        v-else
        :title="errorMessage ? '无法打开审阅包' : '暂无内容'"
        :description="errorMessage || '当前授权没有可审阅材料。'"
      >
        <template v-if="tenantId && accessToken" #action>
          <UiButton size="sm" variant="primary" :loading="loading" @click="loadBundle">重试</UiButton>
        </template>
      </UiEmpty>
    </UiCard>
  </div>
</template>

<style scoped>
.public-expert-review {
  max-width: 1100px;
  margin: 0 auto;
  padding: var(--dp-space-4, 16px) var(--dp-space-3, 12px) var(--dp-space-8, 32px);
}
.public-expert-review__header {
  margin-bottom: var(--dp-space-3, 12px);
}
.public-expert-review__header h1 {
  margin: 0 0 8px;
  font-size: 22px;
  font-weight: 600;
}
.public-expert-review__header p {
  margin: 0;
  color: var(--dp-text-secondary);
  font-size: 14px;
}
.public-expert-review__meta {
  display: flex;
  flex-wrap: wrap;
  gap: var(--dp-space-2, 8px);
  align-items: center;
  margin-bottom: var(--dp-space-3, 12px);
  font-size: 14px;
}
.public-expert-review__teachers {
  margin-bottom: 16px;
}
.public-expert-review__section-title {
  margin: 0 0 8px;
  font-size: 14px;
  font-weight: 600;
}
</style>
