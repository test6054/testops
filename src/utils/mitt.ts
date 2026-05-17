import mitt from 'mitt'


/** 用户基础信息（简化版，仅用于事件） */
interface UserInfo {
  id: string
  username: string
  realName: string
  roleKey: string
  roleName: string
  tenantId: string
}

/** 任务基础信息（简化版，仅用于事件） */
interface TaskInfo {
  id: string
  title: string
  status: string
}

/** 任务状态类型 */
type TaskStatus = 'not_started' | 'in_progress' | 'submitted' | 'graded' | 'overdue' | 'completed'

/** 消息信息（简化版，仅用于事件） */
interface MessageInfo {
  id: string
  type: string
  title: string
  content: string
  status: string
}

/** 系统事件类型定义 */
export interface SystemEvents {
  // 应用级事件
  'app:language-change': { language: string }

  // 用户相关事件
  'user:login': { userId: string, userInfo: UserInfo }
  'user:logout': void
  'user:profile-update': { userInfo: UserInfo }

  // 认证相关事件
  // 触发时机：access token 通过 refresh token 自动续期成功，新 token 已写入 store/localStorage。
  // 用途：长连接订阅方（如 SSE 看板）监听后主动断开旧连接、用新 token 重新订阅，避免在 token 过期-续期间隔出现 401。
  'auth:token-refreshed': { tokenExpiresAt?: number }

  // 任务相关事件
  'task:created': { taskId: string, taskInfo: TaskInfo }
  'task:updated': { taskId: string, status: TaskStatus }
  'task:deleted': { taskId: string }
  'task:submitted': { taskId: string, submissionId: string }

  // 评分相关事件
  'grade:updated': { submissionId: string, grade: number }
  'grade:completed': { taskId: string, studentId: string }

  // 文件相关事件
  'file:uploaded': { fileId: string, fileName: string, taskId?: string }
  'file:deleted': { fileId: string }
  'file:download': { fileId: string, fileName: string }

  // 消息相关事件
  'message:received': { messageId: string, messageInfo: MessageInfo }
  'message:read': { messageId: string }
  'message:archived': { messageId: string }

  // 全局 UI 事件
  'count-refresh': void
  'open-publish-modal': void
}

// 创建完全兼容mitt的事件类型
export type MittEvents = SystemEvents & Record<string | symbol, unknown>

// 使用兼容mitt库的事件类型
const mittBus = mitt<MittEvents>()

export default mittBus
