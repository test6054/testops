import message from 'ant-design-vue/es/message'
import notification from 'ant-design-vue/es/notification'

/** 全局反馈锚点：右上角，与 main.ts message/notification.config 一致 */
const FEEDBACK_TOP = 72
const FEEDBACK_MAX_MESSAGE = 3
const FEEDBACK_MESSAGE_DURATION = 4
const FEEDBACK_NOTIFICATION_DURATION = 5

let feedbackConfigured = false

/** 应用启动时调用一次，统一 message / notification 全局行为 */
export function configureAppFeedback(): void {
  if (feedbackConfigured) return
  feedbackConfigured = true
  message.config({
    top: `${FEEDBACK_TOP}px`,
    maxCount: FEEDBACK_MAX_MESSAGE,
    duration: FEEDBACK_MESSAGE_DURATION,
  })
  notification.config({
    placement: 'topRight',
    top: FEEDBACK_TOP,
    duration: FEEDBACK_NOTIFICATION_DURATION,
  })
}

export { message, notification }
