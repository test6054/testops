<template>
  <StageWorkbenchShell>
    <template #context>
      <div class="print-package-page__context">
        <div class="print-package-page__context-left">
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
        </div>
        <div class="print-package-page__context-right">
          <UiButton
            size="sm"
            :disabled="!selectedExamId"
            :loading="generating"
            @click="openGenerateModal"
          >
            <template #icon><ThunderboltOutlined /></template>
            一键生成印刷包
          </UiButton>
        </div>
      </div>
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
      :helper="`考试 ID：${selectedExamId}`"
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
            <a-descriptions-item label="生成时间">{{
              pkg.generatedTime ?? '-'
            }}</a-descriptions-item>
            <a-descriptions-item label="备注" :span="3">{{
              pkg.sealRemark || '-'
            }}</a-descriptions-item>
          </a-descriptions>

          <div class="package-actions">
            <a-button type="link" size="small" @click="viewDetail(pkg)"> 查看明细 </a-button>
            <a-button
              v-if="pkg.packageFileId"
              type="link"
              size="small"
              @click="downloadPackagePdf(pkg)"
            >
              下载 PDF
            </a-button>
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
      <a-alert
        type="info"
        show-icon
        style="margin-bottom: 16px"
        message="系统将基于当前试卷母版和考生名册，为每位考生自动合成含二维码、条形码和防伪码的专属印刷文件，并合并为一个印刷包 PDF。"
      />
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
  </StageWorkbenchShell>
</template>

<script lang="ts" setup>
import type { ColumnType } from 'ant-design-vue/es/table'
import type { PrintPackageItemVO, PrintPackageVO } from '@/apis/mark/paper-master'
import { generatePrintPackage, getPrintPackage, pagePrintPackages } from '@/apis/mark/paper-master'
import ContainerOutlined from '@ant-design/icons-vue/ContainerOutlined'
import ThunderboltOutlined from '@ant-design/icons-vue/ThunderboltOutlined'
import message from 'ant-design-vue/es/message'
import { onMounted, reactive, ref, watch } from 'vue'
import { downloadFile } from '@/apis/edu/file-management'
import {
  UiButton,
  UiCard,
  UiDataTable,
  UiEmpty,
  UiErrorRetryPanel,
  UiTag,
} from '@/components/ui-guide/ui'
import { StageWorkbenchShell } from '@/components/workbench'
import { useMarkExamSelector } from '@/composables/useMarkExamSelector'

defineOptions({ name: 'TeacherPrintPackage' })

// ─── B-8 统一考试选择器 ──────────────────────────────────────────

const {
  examOptions,
  loading: examLoading,
  selectedExamId,
  onExamChange,
  init: initExamSelector,
} = useMarkExamSelector()

// ─── 印刷包分页列表 ─────────────────────────────────────────────────

const loading = ref(false)
// D-9 错误态：印刷包列表加载失败时 UiErrorRetryPanel 重试 + 上报
const packageListLoadError = ref<unknown>(null)
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
    packageList.value = res.list ?? []
    pagination.total = res.total ?? 0
  } catch (e) {
    packageListLoadError.value = e
    packageList.value = []
    pagination.total = 0
  } finally {
    loading.value = false
  }
}

function handleExamChange(value: unknown): void {
  onExamChange(value as string | number | undefined)
  pagination.pageNum = 1
  if (selectedExamId.value) {
    loadPackageList()
  } else {
    packageList.value = []
    pagination.total = 0
  }
}

// ─── 状态展示 ───────────────────────────────────────────────────────

function statusTone(status: string): 'green' | 'blue' | 'orange' | 'gray' {
  if (status === 'GENERATED' || status === 'READY') return 'green'
  if (status === 'SEALED') return 'blue'
  return 'orange'
}

function statusLabel(status: string): string {
  if (status === 'GENERATED') return '已生成'
  if (status === 'READY') return '已就绪'
  if (status === 'SEALED') return '已封装'
  return '待处理'
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
  } catch {
    message.error('生成失败，请确认已上传母版 PDF 且考生名册不为空')
  } finally {
    generating.value = false
  }
}

// ─── 下载印刷包 PDF ──────────────────────────────────────────────────

async function downloadPackagePdf(pkg: PrintPackageVO) {
  try {
    await downloadFile({ nodeId: pkg.packageFileId })
  } catch {
    message.error('下载失败')
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
    detailItems.value = res?.items ?? []
  } catch {
    message.error('加载明细失败')
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
  &__context {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }

  &__context-left {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  &__context-right {
    flex-shrink: 0;
  }

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
