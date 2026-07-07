<script setup lang="ts">
import type { ArchiveMaterialTypeCode } from '@/apis/mark/archive-volume'
import type { ScanDispatchTicketStatusCode } from '@/apis/mark/scanner-dispatch'
import { message } from 'ant-design-vue'
import { reactive, ref, watch } from 'vue'
import { buildScanDispatchKioskUrl, createScanDispatch } from '@/apis/mark/scanner-dispatch'
import { ScanTaskKindCode } from '@/apis/mark/scanner-work-order'
import UiDrawer from '@/components/ui-guide/ui/UiDrawer.vue'
import { showUserError } from '@/utils/error-handler'
import ArchiveMaterialTagSelect from '@/views/teacher/archive-volume/components/ArchiveMaterialTagSelect.vue'

const props = defineProps<{
  open: boolean
  volumeId: string
  catalogCode?: string
  materialType?: ArchiveMaterialTypeCode
  archiveBatchMode?: string
  archiveTitle?: string
  initialMaterialTags?: string[]
  /** PC 详情页回跳路径，写入 Kiosk 派单 URL 供 commit 后返回 */
  returnTo?: string
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  "created": [
    payload: {
      ticketId: string
      kioskUrl: string
      traceLabelFileId?: string
      traceLabelCode?: string
      status?: ScanDispatchTicketStatusCode
    },
  ]
}>()

const submitting = ref(false)
interface ScanDispatchForm {
  physicalStorageLocation: string
  physicalLocationNote: string
  generateTraceLabel: boolean
  materialTags: string[]
}

const form = reactive<ScanDispatchForm>({
  physicalStorageLocation: '',
  physicalLocationNote: '',
  generateTraceLabel: true,
  materialTags: [],
})

watch(
  () => props.open,
  (open) => {
    if (open) {
      form.physicalStorageLocation = ''
      form.physicalLocationNote = ''
      form.generateTraceLabel = true
      form.materialTags = [...(props.initialMaterialTags ?? [])]
    }
  },
)

async function handleSubmit() {
  if (!form.physicalStorageLocation.trim()) {
    message.warning('请填写档案柜位')
    return
  }
  if (!props.materialType) {
    message.warning('请先在材料目录选择要扫描的材料项后再派单')
    return
  }
  submitting.value = true
  try {
    const response = await createScanDispatch({
      taskKind: ScanTaskKindCode.EXAM_ARCHIVE,
      volumeId: props.volumeId,
      catalogCode: props.catalogCode,
      materialType: props.materialType,
      archiveBatchMode: props.archiveBatchMode,
      physicalStorageLocation: form.physicalStorageLocation.trim(),
      physicalLocationNote: form.physicalLocationNote.trim() || undefined,
      generateTraceLabel: form.generateTraceLabel,
      materialTags: form.materialTags.length > 0 ? form.materialTags : undefined,
    })
    const ticket = response.ticket
    if (!ticket?.ticketId) {
      message.error('派单创建失败')
      return
    }
    const kioskUrl = buildScanDispatchKioskUrl(ticket, props.returnTo)
    emit('created', {
      ticketId: ticket.ticketId,
      kioskUrl,
      traceLabelFileId: ticket.traceLabelFileId,
      traceLabelCode: ticket.traceLabelCode,
      status: ticket.status,
    })
    emit('update:open', false)
  } catch (error) {
    showUserError(error)
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <UiDrawer
    :open="open"
    title="创建扫描派单"
    :width="560"
    :confirm-loading="submitting"
    ok-text="派单"
    :hide-footer="false"
    @update:open="emit('update:open', $event)"
    @close="emit('update:open', false)"
    @confirm="handleSubmit"
  >
    <p v-if="archiveTitle" class="scan-dispatch-dialog__hint">卷：{{ archiveTitle }}</p>
    <a-form layout="vertical">
      <a-form-item label="档案柜位" required>
        <a-input v-model:value="form.physicalStorageLocation" placeholder="例如 A区-03柜-2层" />
      </a-form-item>
      <a-form-item label="柜位说明">
        <a-input v-model:value="form.physicalLocationNote" placeholder="可选补充说明" />
      </a-form-item>
      <a-form-item label="材料标签" extra="扫描 commit 登记时写入材料，便于后续检索">
        <ArchiveMaterialTagSelect v-model="form.materialTags" />
      </a-form-item>
      <a-form-item>
        <a-checkbox v-model:checked="form.generateTraceLabel">生成追溯标签 PDF</a-checkbox>
      </a-form-item>
    </a-form>
    <p class="scan-dispatch-dialog__note">
      工位通过分机 URL / QR 进入，不使用同浏览器 router.push。
    </p>
  </UiDrawer>
</template>

<style scoped>
.scan-dispatch-dialog__hint {
  margin: 0 0 12px;
  color: var(--nybc-text-secondary, #595959);
}
.scan-dispatch-dialog__note {
  margin: 0;
  font-size: 12px;
  color: var(--nybc-text-secondary, #8c8c8c);
}
</style>
