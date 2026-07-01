<script setup lang="ts">
/**
 * KioskNoticeBand - 全局通知宿主
 *
 * 将 workflow.errorMessage / successMessage 映射为右上角单条 notification；
 * 错误优先于成功，同一时刻只展示一条。
 */
import { Button, notification } from 'ant-design-vue'
import { computed, h, onBeforeUnmount, watch } from 'vue'
import {
  KIOSK_BROWSER_PUSH_TOKEN_REJECTED_MESSAGE,
  KIOSK_BROWSER_SESSION_SYNC_FAILED_MESSAGE,
} from '@/utils/kiosk-auth'
import { useKioskCtx } from '../composables/kioskInjection'
import { KIOSK_NOTICE_KEY } from '../constants/kioskNotice'

const { workflow } = useKioskCtx()

notification.config({
  placement: 'topRight',
  top: '72px',
  maxCount: 1,
})

const showKioskReactivationAction = computed(() => {
  const err = workflow.errorMessage.value.trim()
  if (!err) return false
  if (workflow.needsActivationGate.value) return true
  return (
    err === KIOSK_BROWSER_SESSION_SYNC_FAILED_MESSAGE ||
    err === KIOSK_BROWSER_PUSH_TOKEN_REJECTED_MESSAGE
  )
})

function closeNotice() {
  notification.close(KIOSK_NOTICE_KEY)
}

function openReactivationModal() {
  closeNotice()
  workflow.errorMessage.value = ''
  workflow.openActivationModal()
}

function syncNotice() {
  const err = workflow.errorMessage.value.trim()
  const ok = workflow.successMessage.value.trim()

  closeNotice()

  if (err) {
    if (ok) {
      workflow.successMessage.value = ''
    }
    notification.error({
      key: KIOSK_NOTICE_KEY,
      message: err,
      duration: showKioskReactivationAction.value ? 0 : 4.5,
      onClose: () => {
        workflow.errorMessage.value = ''
      },
      ...(showKioskReactivationAction.value
        ? {
            btn: () =>
              h(
                Button,
                {
                  type: 'primary',
                  size: 'small',
                  onClick: openReactivationModal,
                },
                () => '打开激活窗口',
              ),
          }
        : {}),
    })
    return
  }

  if (ok) {
    notification.success({
      key: KIOSK_NOTICE_KEY,
      message: ok,
      duration: 3,
      onClose: () => {
        workflow.successMessage.value = ''
      },
    })
  }
}

watch(
  [
    () => workflow.errorMessage.value,
    () => workflow.successMessage.value,
    () => workflow.needsActivationGate.value,
  ],
  syncNotice,
)

onBeforeUnmount(closeNotice)
</script>
