<template>
  <StageWorkbenchShell>
    <template #context>
      <ContextBar>
        <template #status>
          <a-select
            :value="selectedExamId"
            class="print-package-page__exam-select"
            placeholder="选择考试"
            :options="examOptions"
            :loading="examLoading"
            show-search
            option-filter-prop="label"
            allow-clear
            @change="handleExamChange"
          />
          <UiTag v-if="pagination.total > 0" tone="blue" size="sm">
            共 {{ pagination.total }} 个印刷包
          </UiTag>
        </template>
        <template #actions>
          <UiButton
            size="sm"
            :disabled="!selectedExamId"
            :loading="generating"
            @click="openGenerateModal"
          >
            <template #icon><ThunderboltOutlined /></template>
            一键生成印刷包
          </UiButton>
        </template>
      </ContextBar>
    </template>

    <UiEmpty
      v-if="!selectedExamId"
      description="请选择考试以查看印刷包"
      class="print-package-page__empty"
    />

    <!-- D-9 错误态：印刷包列表加载失败时提供重试 + 上报入口 -->
    <UiErrorRetryPanel
      v-else-if="packageListLoadError"
      :error="packageListLoadError"
      title="印刷包列表加载失败"
      :helper="selectedExamLabel ? `当前考试：${selectedExamLabel}` : undefined"
      @retry="loadPackageList"
    />

    <a-spin v-else :spinning="loading">
      <UiEmpty
        v-if="!loading && packageList.length === 0"
        description="该考试暂无印刷包，点击“一键生成”创建"
      />

      <div v-else class="package-list">
        <UiCard v-for="pkg in packageList" :key="pkg.printPackageId" class="package-card">
          <template #title>
            <ContainerOutlined />
            <span>{{ pkg.packageName }}</span>
          </template>
          <template #extra>
            <UiTag :tone="statusTone(pkg.status)" size="sm">
              {{ statusLabel(pkg.status) }}
            </UiTag>
          </template>

          <a-descriptions :column="3" size="small" bordered>
            <a-descriptions-item label="编号">{{ pkg.packageNo }}</a-descriptions-item>
            <a-descriptions-item label="生成人数">{{ pkg.itemCount }}</a-descriptions-item>
            <a-descriptions-item label="生成时间">
              {{ pkg.generatedTime }}
            </a-descriptions-item>
            <a-descriptions-item label="备注" :span="3">
              {{ pkg.sealRemark || '未填写封装备注' }}
            </a-descriptions-item>
          </a-descriptions>

          <div class="package-actions">
            <UiTextAction @click="viewDetail(pkg)">查看明细</UiTextAction>
            <UiTextAction
              v-if="pkg.packageFileId"
              tone="primary"
              @click="previewPackagePdf(pkg)"
            >
              预览
            </UiTextAction>
            <UiTextAction v-if="pkg.packageFileId" @click="downloadPackagePdf(pkg)">
              下载 PDF
            </UiTextAction>
          </div>
        </UiCard>

        <a-pagination
          v-if="pagination.total > pagination.pageSize"
          v-model:current="pagination.pageNum"
          v-model:page-size="pagination.pageSize"
          :total="pagination.total"
          show-size-changer
          :page-size-options="['10', '20', '50']"
          class="print-package-page__pagination"
          @change="loadPackageList"
        />
      </div>
    </a-spin>

    <!-- 一键生成印刷包弹窗 -->
    <a-modal
      v-model:open="generateModalVisible"
      title="一键生成印刷包"
      :width="560"
      :confirm-loading="generating"
      ok-text="开始生成"
      cancel-text="取消"
      @ok="handleGenerate"
    >
      <a-form layout="vertical" style="margin-top: 8px">
        <a-form-item label="印刷包编号" required>
          <a-input
            v-model:value="generateForm.packageNo"
            placeholder="例如：PKG-2026-001"
            :maxlength="50"
          />
        </a-form-item>
        <a-form-item label="印刷包名称" required>
          <a-input
            v-model:value="generateForm.packageName"
            placeholder="例如：期末A卷-第一批次"
            :maxlength="100"
          />
        </a-form-item>
        <a-form-item label="封装备注">
          <a-textarea
            v-model:value="generateForm.sealRemark"
            :rows="2"
            :maxlength="500"
            placeholder="可选"
          />
        </a-form-item>
      </a-form>
    </a-modal>

    <!-- 印刷包明细弹窗 -->
    <a-modal
      v-model:open="detailModalVisible"
      :title="`印刷包明细 - ${detailPackage?.packageName ?? ''}`"
      :width="960"
      :footer="null"
    >
      <a-spin :spinning="detailLoading">
        <UiDataTable
          class="student-detail-table__data-table"
          :columns="detailColumns"
          :data-source="detailItems"
          :show-pagination="false"
          flat
          :total="detailItems.length"
          row-key="printPackageItemId"
          size="small"
          bordered
          :scroll="{ y: 400 }"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'status'">
              <UiTag :tone="record.status === 'PRINTED' ? 'green' : 'gray'" size="sm">
                {{ record.status === 'PRINTED' ? '已印刷' : '待印刷' }}
              </UiTag>
            </template>
          </template>
        </UiDataTable>
      </a-spin>
    </a-modal>

    <!-- PDF 预览 Modal -->
    <a-modal
      v-model:open="previewModalOpen"
      title="印刷包 PDF 预览"
      width="900px"
      :footer="null"
      :destroy-on-close="true"
    >
      <a-spin :spinning="previewLoading">
        <iframe
          v-if="previewPdfUrl"
          :src="previewPdfUrl"
          style="width: 100%; height: 70vh; border: none"
        />
        <UiEmpty v-else-if="!previewLoading" description="无法加载 PDF 预览" />
      </a-spin>
    </a-modal>
  </StageWorkbenchShell>
</template>

<script lang="ts" setup>
import type { SelectValue } from 'ant-design-vue/es/select'
import type { ColumnType } from 'ant-design-vue/es/table'
import type { PrintPackageItemVO, PrintPackageVO } from '@/apis/mark/paper-master'
import type { BadgeTone } from '@/components/ui-guide/ui/types'
import ContainerOutlined from '@ant-design/icons-vue/ContainerOutlined'
import ThunderboltOutlined from '@ant-design/icons-vue/ThunderboltOutlined'
import message from 'ant-design-vue/es/message'
import { onMounted, reactive, ref, watch } from 'vue'
import { downloadFile } from '@/apis/edu/file-management'
import {
  generatePrintPackage,
  getPrintPackage,
  pagePrintPackages,
  PRINT_PACKAGE_STATUS_LABEL,
  PRINT_PACKAGE_STATUS_TONE,
} from '@/apis/mark/paper-master'
import {
  UiButton,
  UiCard,
  UiDataTable,
  UiEmpty,
  UiErrorRetryPanel,
  UiTag,
  UiTextAction,
} from '@/components/ui-guide/ui'
import { ContextBar, StageWorkbenchShell } from '@/components/workbench'
import { useMarkExamSelector } from '@/composables/useMarkExamSelector'
import { showUserError, toUserError } from '@/utils/error-handler'
import { readPageList, readPageTotal } from '@/utils/page-result'
import { strictEnumLabel, strictEnumTone } from '@/utils/strict-enum'

defineOptions({ name: 'TeacherPrintPackage' })

// ─── B-8 统一考试选择器 ──────────────────────────────────────────

const {
  examOptions,
  loading: examLoading,
  selectedExamId,
  selectedExamLabel,
  onExamChange,
  init: initExamSelector,
} = useMarkExamSelector()

// ─── 印刷包分页列表 ─────────────────────────────────────────────────

const loading = ref(false)
// D-9 错误态：印刷包列表加载失败时 UiErrorRetryPanel 重试 + 上报
const packageListLoadError = ref<Error | null>(null)
const packageList = ref<PrintPackageVO[]>([])
const pagination = reactive({ pageNum: 1, pageSize: 10, total: 0 })

async function loadPackageList() {
  if (!selectedExamId.value) return
  loading.value = true
  packageListLoadError.value = null
  try {
    const res = await pagePrintPackages({
      examId: selectedExamId.value,
      pageNum: pagination.pageNum,
      pageSize: pagination.pageSize,
    })
    packageList.value = readPageList(res, '印刷包列表加载失败，请稍后重试')
    pagination.total = readPageTotal(res, '印刷包列表加载失败，请稍后重试')
  } catch (e) {
    packageListLoadError.value = toUserError(e, '印刷包列表加载失败')
    packageList.value = []
    pagination.total = 0
  } finally {
    loading.value = false
  }
}

function handleExamChange(value: SelectValue): void {
  onExamChange(value)
  pagination.pageNum = 1
  if (selectedExamId.value) {
    loadPackageList()
  } else {
    packageList.value = []
    pagination.total = 0
  }
}

// ─── 状态展示 ───────────────────────────────────────────────────────

function statusTone(status: PrintPackageVO['status']): BadgeTone {
  return strictEnumTone(PRINT_PACKAGE_STATUS_TONE, status, '印刷包状态')
}

function statusLabel(status: PrintPackageVO['status']): string {
  return strictEnumLabel(PRINT_PACKAGE_STATUS_LABEL, status, '印刷包状态')
}

// ─── 一键生成印刷包 ──────────────────────────────────────────────────

const generateModalVisible = ref(false)
const generating = ref(false)

const generateForm = reactive({
  packageNo: '',
  packageName: '',
  sealRemark: '',
})

function openGenerateModal() {
  generateForm.packageNo = ''
  generateForm.packageName = ''
  generateForm.sealRemark = ''
  generateModalVisible.value = true
}

async function handleGenerate() {
  if (!selectedExamId.value) return
  if (!generateForm.packageNo.trim()) {
    message.warning('请填写印刷包编号')
    return
  }
  if (!generateForm.packageName.trim()) {
    message.warning('请填写印刷包名称')
    return
  }

  generating.value = true
  try {
    await generatePrintPackage({
      examId: selectedExamId.value,
      packageNo: generateForm.packageNo.trim(),
      packageName: generateForm.packageName.trim(),
      sealRemark: generateForm.sealRemark?.trim() || undefined,
    })
    message.success('印刷包生成成功')
    generateModalVisible.value = false
    pagination.pageNum = 1
    await loadPackageList()
  } catch (error) {
    showUserError(error, '印刷包生成失败，请确认已上传母版 PDF 且考生名册不为空')
  } finally {
    generating.value = false
  }
}

// ─── 下载印刷包 PDF ──────────────────────────────────────────────────

async function downloadPackagePdf(pkg: PrintPackageVO) {
  try {
    await downloadFile({ nodeId: pkg.packageFileId })
  } catch (error) {
    showUserError(error, '印刷包文件下载失败，请稍后重试')
  }
}

// ─── PDF 预览 ──────────────────────────────────────────────────────

const previewModalOpen = ref(false)
const previewLoading = ref(false)
const previewPdfUrl = ref('')

async function previewPackagePdf(pkg: PrintPackageVO) {
  previewModalOpen.value = true
  previewLoading.value = true
  previewPdfUrl.value = ''
  try {
    const token = localStorage.getItem('token')
    if (!token) {
      message.error('未登录或登录已过期')
      return
    }
    const requestUrl = new URL('/api/storage/filesystem/download', window.location.origin)
    requestUrl.searchParams.set('nodeId', pkg.packageFileId)
    const response = await fetch(requestUrl.toString(), {
      method: 'GET',
      credentials: 'include',
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!response.ok) {
      message.error('印刷包文件加载失败')
      return
    }
    const blob = await response.blob()
    previewPdfUrl.value = URL.createObjectURL(blob)
  } catch (error) {
    showUserError(error, '印刷包预览加载失败')
  } finally {
    previewLoading.value = false
  }
}

// ─── 印刷包明细 ──────────────────────────────────────────────────────

const detailModalVisible = ref(false)
const detailLoading = ref(false)
const detailPackage = ref<PrintPackageVO | null>(null)
const detailItems = ref<PrintPackageItemVO[]>([])

async function viewDetail(pkg: PrintPackageVO) {
  detailPackage.value = pkg
  detailItems.value = []
  detailModalVisible.value = true
  detailLoading.value = true
  try {
    const res = await getPrintPackage({
      examId: pkg.examId,
      printPackageId: pkg.printPackageId,
    })
    detailItems.value = res.items
  } catch (error) {
    showUserError(error, '印刷包明细加载失败，请稍后重试')
  } finally {
    detailLoading.value = false
  }
}

const detailColumns: ColumnType[] = [
  { title: '学号', dataIndex: 'studentNo', key: 'studentNo', width: 120 },
  { title: '姓名', dataIndex: 'studentName', key: 'studentName', width: 100 },
  { title: '考场', dataIndex: 'examRoom', key: 'examRoom', width: 120 },
  { title: '座位号', dataIndex: 'seatNo', key: 'seatNo', width: 80 },
  { title: '二维码', dataIndex: 'qrCode', key: 'qrCode', ellipsis: true },
  { title: '条形码', dataIndex: 'barCode', key: 'barCode', ellipsis: true },
  { title: '防伪码', dataIndex: 'securityCode', key: 'securityCode', width: 120 },
  { title: '状态', key: 'status', width: 90 },
]

// ─── 初始化 ──────────────────────────────────────────────────────────

onMounted(async () => {
  await initExamSelector()
})

watch(
  selectedExamId,
  (val) => {
    if (val) {
      loadPackageList()
    }
  },
  { immediate: false },
)
</script>

<style lang="scss" scoped>
.print-package-page {
  &__exam-select {
    width: 280px;
  }

  &__empty {
    margin-top: 80px;
  }

  &__pagination {
    margin-top: 16px;
    text-align: right;
  }

  .empty-block {
    margin-top: 80px;
  }

  .package-list {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .package-card {
    .package-actions {
      margin-top: 12px;
      text-align: right;
    }
  }
}
</style>
