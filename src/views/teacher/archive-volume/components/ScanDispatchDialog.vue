<script setup lang="ts">
import type { ArchiveMaterialTypeCode } from '@/apis/mark/archive-volume'
import type { ScanDispatchTicketStatusCode } from '@/apis/mark/scanner-dispatch'
import message from 'ant-design-vue/es/message'
import { reactive, ref, watch } from 'vue'
import { buildScanDispatchKioskUrl, createScanDispatch } from '@/apis/mark/scanner-dispatch'
import UiCheckbox from '@/components/ui-guide/ui/UiCheckbox.vue'
import UiDrawer from '@/components/ui-guide/ui/UiDrawer.vue'
import UiForm from '@/components/ui-guide/ui/UiForm.vue'
import UiFormItem from '@/components/ui-guide/ui/UiFormItem.vue'
import { ScanTaskKindCode } from '@/types/enums/scan-task-kind-enum'
import { showFormValidationMessage, showUserError } from '@/utils/error-handler'
import ArchiveMaterialTagSelect from '@/views/teacher/archive-volume/components/ArchiveMaterialTagSelect.vue'

const props = defineProps<{
  open: boolean
  volumeId: string
  catalogCode?: string
  materialType?: ArchiveMaterialTypeCode
  archiveBatchMode?: string
  archiveTitle?: string
  physicalStorageLocation?: string
  initialMaterialTags?: string[]
  /** MVR-318：与父 canRegisterMaterial / BE requireCanScan 同源 */
  canRegisterMaterial?: boolean
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
      canCancelTicket?: boolean
    },
  ]
}>()

const submitting = ref(false)
interface ScanDispatchForm {
  generateTraceLabel: boolean
  materialTags: string[]
}

const form = reactive<ScanDispatchForm>({
  generateTraceLabel: true,
  materialTags: [],
})

watch(
  () => props.open,
  (open) => {
    if (open) {
      form.generateTraceLabel = true
      form.materialTags = [...(props.initialMaterialTags ?? [])]
    }
  },
)

async function handleSubmit() {
  // MVR-318：创建派单与 canRegisterMaterial / BE requireCanScan 二次拦截
  if (!props.canRegisterMaterial) {
    showFormValidationMessage('当前账号无扫描派单权限')
    return
  }
  if (submitting.value) return
  if (!props.physicalStorageLocation?.trim()) {
    showFormValidationMessage('请先登记归档卷柜位')
    return
  }
  if (!props.materialType) {
    showFormValidationMessage('请先在材料目录选择要扫描的材料项后再派单')
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
      generateTraceLabel: form.generateTraceLabel,
      materialTags: form.materialTags.length > 0 ? form.materialTags : undefined,
    })
    const ticket = response.ticket
    if (!ticket?.ticketId) {
      void message.error('派单创建失败')
      return
    }
    const kioskUrl = buildScanDispatchKioskUrl(ticket, props.returnTo)
    emit('created', {
      ticketId: ticket.ticketId,
      kioskUrl,
      traceLabelFileId: ticket.traceLabelFileId,
      traceLabelCode: ticket.traceLabelCode,
      status: ticket.status,
      canCancelTicket: ticket.canCancelTicket,
    })
    emit('update:open', false)
  } catch (error) {
    showUserError(error, '创建扫描派单失败')
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
    <UiForm layout="vertical">
      <UiFormItem label="当前柜位">
        {{ physicalStorageLocation || '尚未登记' }}
      </UiFormItem>
      <UiFormItem label="材料标签" tooltip="扫描 commit 登记时写入材料，便于后续检索">
        <ArchiveMaterialTagSelect v-model="form.materialTags" :volume-id="volumeId" />
      </UiFormItem>
      <UiFormItem>
        <UiCheckbox v-model="form.generateTraceLabel">生成追溯标签便携文档</UiCheckbox>
      </UiFormItem>
    </UiForm>
    <p class="scan-dispatch-dialog__note">工位通过分机链接或二维码进入，不使用同浏览器路由跳转。</p>
  </UiDrawer>
</template>

<style scoped>
.scan-dispatch-dialog__hint {
  margin: 0 0 12px;
  color: var(--dp-text-secondary);
}
.scan-dispatch-dialog__note {
  margin: 0;
  font-size: 12px;
  color: var(--dp-text-secondary);
}
</style>
