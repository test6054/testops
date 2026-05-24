/**
 * 消息系统API
 * 对接后端 InboxMessageController (/api/inbox) 和 SystemAnnouncementController (/api/admin/announcements)
 *
 * 注意：站内信和系统公告是两个完全独立的功能
 */

import type { PageResult, QueryDto } from '@/types'
import type { UserDto } from '@/types/api-types.d'
import type { NotificationTypeEnum } from '@/types/enums'
import http from '@/config/axios'

export enum MessageFolderEnum {
  INBOX = 'INBOX',
  SENT = 'SENT',
  ARCHIVED = 'ARCHIVED',
  TRASH = 'TRASH',
}

/** 消息操作类型枚举 - 对应后端MessageOperationTypeEnum */
export enum MessageOperationTypeEnum {
  MARK_READ = 'MARK_READ',
  MARK_UNREAD = 'MARK_UNREAD',
  ARCHIVE = 'ARCHIVE',
  UNARCHIVE = 'UNARCHIVE',
  TRASH = 'TRASH',
  RESTORE_FROM_TRASH = 'RESTORE_FROM_TRASH',
  PURGE = 'PURGE'
}

/** 系统公告状态枚举 - 对应后端AnnouncementStatusEnum */
export enum AnnouncementStatusEnum {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
  WITHDRAWN = 'WITHDRAWN',
  ARCHIVED = 'ARCHIVED'
}

/** 系统公告优先级枚举 - 对应后端AnnouncementPriorityEnum */
export enum AnnouncementPriorityEnum {
  NORMAL = 'NORMAL',
  IMPORTANT = 'IMPORTANT'
}


/** 站内信创建请求DTO - 对应后端InboxMessageCreateRequest */
export interface InboxMessageCreateRequest {
  /** 收件人用户ID列表，系统通知和班级公告可为空（由后端自动填充） */
  recipientUserIds?: string[]
  /** 站内信类型 */
  messageType?: NotificationTypeEnum
  /** 站内信主题 */
  subject: string
  /** 站内信正文，存储为HTML格式，支持富文本 */
  contentHtml?: string
  /** 站内信元数据，JSON格式，包含跳转链接等信息 */
  metadata?: MessageMetadata
  /** 是否为系统保护消息，不允许普通用户删除，仅管理员可设置 */
  isSystemProtected?: boolean
  /** 租户ID */
  tenantId?: string
  /** 班级ID（班级公告时必填） */
  classId?: string
}

/** 消息元数据 */
export interface MessageMetadata {
  /** 关联的业务实体类型 */
  entityType?: string
  /** 关联的业务实体ID */
  entityId?: string
  /** 前端跳转的相对路径 */
  jumpUrl?: string
  /** 关联的项目ID */
  projectId?: string
  /** 关联的任务ID */
  taskId?: string
  /** 关联的课程ID */
  courseId?: string
  /** 消息来源ID（如实践ID） */
  sourceId?: string
  /** 消息来源类型（如 PRACTICE） */
  sourceType?: string
}

/** 站内信列表查询 */
export interface InboxMessageListQuery extends QueryDto {
  /** 文件夹类型 */
  folder?: MessageFolderEnum
  /** 消息类型 */
  messageType?: NotificationTypeEnum
  /** 是否已读 */
  isRead?: boolean
  /** 发件人用户ID */
  senderUserId?: string
  /** 收件人用户ID */
  recipientUserId?: string
  /** 关键词搜索 */
  keyword?: string
}

/** 站内信标记请求DTO - 对应后端InboxMessageMarkRequest */
export interface InboxMessageMarkRequest {
  /** 站内信关联ID列表（t_inbox_message_recipient.id） */
  recipientMessageIds: string[]
  /** 操作类型 */
  operationType: MessageOperationTypeEnum
  /** 租户ID */
  tenantId?: string
}

/** 未读数量请求 */
export interface InboxUnreadCountRequest {
  /** 用户ID */
  userId?: string
}

/** 用户信息DTO */

/** 站内信列表项 */
export interface InboxMessageListItemDTO {
  /** 站内信唯一ID */
  id: string
  /** 消息主体ID */
  messageId: string
  /** 站内信类型 */
  messageType: NotificationTypeEnum
  /** 站内信主题 */
  subject: string
  /** 站内信正文 */
  contentHtml?: string
  /** 发送者用户ID */
  senderUserId: string
  /** 发送者用户信息 */
  senderInfo?: UserDto
  /** 发送时间 */
  sendTime: string
  /** 是否已读 */
  isRead: boolean
  /** 消息元数据 */
  metadata?: MessageMetadata
}

/** 站内信详情响应 */
export interface InboxMessageDetailResponse {
  /** 站内信唯一ID */
  id: string
  /** 收件记录ID */
  recipientMessageId: string
  /** 站内信类型 */
  messageType: NotificationTypeEnum
  /** 站内信主题 */
  subject: string
  /** 站内信正文 */
  contentHtml?: string
  /** 发送者用户ID */
  senderUserId: string
  /** 发送者用户信息 */
  senderInfo?: UserDto
  /** 发送时间 */
  sendTime: string
  /** 阅读时间 */
  readTime?: string
  /** 是否已读 */
  isRead: boolean
  /** 消息元数据 */
  metadata?: MessageMetadata
}

/** 未读数量响应 */
export interface InboxUnreadCountResponse {
  /** 租户ID */
  tenantId: string
  /** 未读数量 */
  unreadCount: number
  /** 未读系统通知数量 */
  unreadSystemNotificationCount: number
  /** 总未读数量 */
  totalUnreadCount: number
}

/** 消息统计响应 */
export interface InboxMessageStatsResponse {
  /** 总消息数 */
  totalCount: number
  /** 未读消息数 */
  unreadCount: number
  /** 收件箱消息数 */
  inboxCount: number
  /** 已发送消息数 */
  sentCount: number
  /** 已归档消息数 */
  archivedCount: number
  /** 回收站消息数 */
  trashCount: number
}


/** 系统公告查询请求DTO - 对应后端SystemAnnouncementQueryRequest */
export interface SystemAnnouncementQueryRequest extends QueryDto {
  /** 公告标题关键词 */
  titleKeyword?: string
  /** 公告优先级：NORMAL-普通，IMPORTANT-重要 */
  priority?: string
  /** 公告状态：DRAFT-草稿，PUBLISHED-已发布，ARCHIVED-已归档 */
  status?: string
  /** 是否只查询已发布的公告（用户查看时使用） */
  publishedOnly?: boolean
  /** 是否只查询未读公告 */
  unreadOnly?: boolean
}

/** 系统公告创建请求DTO - 对应后端SystemAnnouncementCreateRequest */
export interface SystemAnnouncementCreateRequest {
  /** 公告标题 */
  title: string
  /** 公告内容（支持HTML富文本） */
  content: string
  /** 公告优先级：NORMAL-普通，IMPORTANT-重要 */
  priority?: string
  /** 是否立即发布：true-立即发布，false-保存为草稿 */
  publishImmediately?: boolean
  /** 目标类型：ALL-全部租户，SPECIFIC-特定租户 */
  targetType?: string
  /** 目标租户ID列表，当targetType为SPECIFIC时必填 */
  targetTenantIds?: string[]
}

/** 系统公告更新请求DTO - 对应后端SystemAnnouncementUpdateRequest */
export interface SystemAnnouncementUpdateRequest {
  /** 公告ID - 前端使用string避免精度问题 */
  id: string
  /** 公告标题 */
  title: string
  /** 公告内容（支持HTML富文本） */
  content: string
  /** 公告优先级：NORMAL-普通，IMPORTANT-重要 */
  priority?: string
  /** 公告状态：DRAFT-草稿，PUBLISHED-已发布，ARCHIVED-已归档 */
  status?: string
  /** 目标类型：ALL-全部租户，SPECIFIC-特定租户 */
  targetType?: string
  /** 目标租户ID列表，当targetType为SPECIFIC时必填 */
  targetTenantIds?: string[]
}

/** 系统公告批量更新请求DTO - 对应后端SystemAnnouncementBatchUpdateRequest */
export interface SystemAnnouncementBatchUpdateRequest {
  /** 公告ID列表 - 前端使用string数组避免精度问题 */
  ids: string[]
  /** 新状态：DRAFT-草稿，PUBLISHED-已发布，ARCHIVED-已归档 */
  status: string
}

/** 系统公告响应DTO - 对应后端SystemAnnouncementResponse */
export interface SystemAnnouncementResponse {
  /** 公告ID */
  id: string
  /** 公告标题 */
  title: string
  /** 公告内容 */
  content: string
  /** 公告优先级：NORMAL-普通，IMPORTANT-重要 */
  priority: string
  /** 优先级显示名称 */
  priorityName: string
  /** 优先级颜色 */
  priorityColor: string
  /** 公告状态：DRAFT-草稿，PUBLISHED-已发布，ARCHIVED-已归档 */
  status: string
  /** 状态显示名称 */
  statusName: string
  /** 创建时间 */
  createTime: string
  /** 创建用户ID */
  createUser: string
  /** 创建用户名称 */
  createUserName: string
  /** 创建用户详细信息 */
  createUserInfo?: UserDto
  /** 更新时间 */
  updateTime?: string
  /** 发布时间（以此作为公告的实际发布时间） */
  publishTime?: string
  /** 相对时间显示（如：2小时前）- 基于发布时间计算 */
  relativeTime: string
  /** 当前用户是否已读 */
  isRead?: boolean
  /** 目标类型：ALL-全部租户，SPECIFIC-特定租户 */
  targetType?: string
  /** 目标类型显示名称 */
  targetTypeName?: string
  /** 目标租户ID列表 */
  targetTenantIds?: string[]
  /** 目标租户名称列表 */
  targetTenantNames?: string[]
}

/** 系统公告统计响应DTO - 对应后端SystemAnnouncementStatsResponse */
export interface SystemAnnouncementStatsResponse {
  /** 公告总数 */
  totalCount: number
  /** 已发布公告数 */
  publishedCount: number
  /** 草稿公告数 */
  draftCount: number
  /** 已撤回公告数 */
  withdrawnCount: number
  /** 已归档公告数 */
  archivedCount: number
  /** 重要公告数 */
  importantCount: number
  /** 普通公告数 */
  normalCount: number
}

/** 系统公告阅读统计响应DTO - 对应后端SystemAnnouncementReadStatsResponse */
export interface SystemAnnouncementReadStatsResponse {
  /** 公告ID - 后端Long类型序列化为string */
  announcementId: string
  /** 总用户数 - 后端Long类型序列化为string */
  totalUsers: string
  /** 已读用户数 - 后端Long类型序列化为string */
  readUsers: string
  /** 未读用户数 - 后端Long类型序列化为string */
  unreadUsers: string
  /** 已确认阅读用户数 - 后端Long类型序列化为string */
  confirmedUsers: string
  /** 阅读率（百分比） - 后端Double类型，前端接收为number */
  readRate: number
}


/**
 * 发送站内信 - 对应后端 POST /api/inbox/send
 */
export function sendMessage(data: InboxMessageCreateRequest): Promise<void> {
  return http.post('/api/inbox/send', data)
}

/**
 * 获取站内信列表 - 对应后端 POST /api/inbox/list
 */
export function getInboxMessages(data: InboxMessageListQuery): Promise<PageResult<InboxMessageListItemDTO>> {
  return http.post('/api/inbox/list', data)
}

/**
 * 获取站内信详情 - 对应后端 POST /api/inbox/detail
 */
export function getMessageDetail(data: { id: string }): Promise<InboxMessageDetailResponse> {
  return http.post('/api/inbox/detail', data)
}

/**
 * 更新站内信状态 - 对应后端 POST /api/inbox/update-status
 */
export function updateMessageStatus(data: InboxMessageMarkRequest): Promise<void> {
  return http.post('/api/inbox/update-status', data)
}

/**
 * 获取未读站内信数量 - 对应后端 GET /api/inbox/unread-count
 */
export function getUnreadCount(): Promise<InboxUnreadCountResponse> {
  return http.get<InboxUnreadCountResponse>('/api/inbox/unread-count')
}

/**
 * 标记所有站内信为已读 - 对应后端 POST /api/inbox/mark-all-as-read
 */
export function markAllAsRead(): Promise<void> {
  return http.post('/api/inbox/mark-all-as-read', {})
}

/**
 * 获取用户消息统计信息 - 对应后端 GET /api/inbox/stats
 */
export function getMessageStats(): Promise<InboxMessageStatsResponse> {
  return http.get('/api/inbox/stats')
}


/**
 * 创建系统公告 - 对应后端 POST /api/admin/announcements/create
 */
export function createAnnouncement(data: SystemAnnouncementCreateRequest): Promise<string> {
  return http.post('/api/admin/announcements/create', data)
}

/**
 * 更新系统公告 - 对应后端 POST /api/admin/announcements/update
 */
export function updateAnnouncement(data: SystemAnnouncementUpdateRequest): Promise<void> {
  // 数据已经是正确的类型，直接发送
  return http.post('/api/admin/announcements/update', data)
}

/**
 * 删除系统公告 - 对应后端 POST /api/admin/announcements/delete
 */
export function deleteAnnouncement(id: string): Promise<void> {
  return http.post('/api/admin/announcements/delete', { id })
}

/**
 * 获取公告详情（管理员）- 对应后端 POST /api/admin/announcements/detail
 */
export function getAnnouncementDetail(id: string): Promise<SystemAnnouncementResponse> {
  return http.post('/api/admin/announcements/detail', { id })
}

/**
 * 分页查询公告列表（管理员）- 对应后端 POST /api/admin/announcements/list
 */
export function getAnnouncementList(data: SystemAnnouncementQueryRequest): Promise<PageResult<SystemAnnouncementResponse>> {
  return http.post('/api/admin/announcements/list', data)
}

/**
 * 发布公告 - 对应后端 POST /api/admin/announcements/publish
 */
export function publishAnnouncement(id: string): Promise<void> {
  return http.post('/api/admin/announcements/publish', {id})
}

/**
 * 归档公告 - 对应后端 POST /api/admin/announcements/archive
 */
export function archiveAnnouncement(id: string): Promise<void> {
  return http.post('/api/admin/announcements/archive', {id})
}

/**
 * 批量更新公告状态 - 对应后端 POST /api/admin/announcements/batch-update-status
 */
export function batchUpdateAnnouncementStatus(data: SystemAnnouncementBatchUpdateRequest): Promise<void> {
  return http.post('/api/admin/announcements/batch-update-status', data)
}

/**
 * 撤回公告 - 对应后端 POST /api/admin/announcements/withdraw
 */
export function withdrawAnnouncement(id: string): Promise<void> {
  return http.post('/api/admin/announcements/withdraw', { id })
}

/**
 * 获取公告阅读统计 - 对应后端 POST /api/admin/announcements/read-stats
 */
export function getAnnouncementReadStats(id: string): Promise<SystemAnnouncementReadStatsResponse> {
  return http.post('/api/admin/announcements/read-stats', { id })
}

/**
 * 获取公告统计信息（管理员）- 对应后端 GET /api/admin/announcements/stats
 */
export function getAnnouncementStats(): Promise<SystemAnnouncementStatsResponse> {
  return http.get('/api/admin/announcements/stats')
}


/**
 * 分页查询已发布公告列表（用户查看）- 对应后端 POST /api/announcements/list
 */
export function getPublishedAnnouncementList(data: SystemAnnouncementQueryRequest): Promise<PageResult<SystemAnnouncementResponse>> {
  return http.post('/api/announcements/list', data)
}

/**
 * 获取已发布公告详情（用户查看）- 对应后端 POST /api/announcements/detail
 */
export function getPublishedAnnouncementDetail(id: string): Promise<SystemAnnouncementResponse> {
  return http.post('/api/announcements/detail', { id })
}

/**
 * 获取已发布公告统计信息（用户查看）- 对应后端 GET /api/announcements/stats
 */
export function getPublishedAnnouncementStats(): Promise<SystemAnnouncementStatsResponse> {
  return http.get('/api/announcements/stats')
}

/**
 * 获取用户未读公告数量 - 对应后端 GET /api/announcements/unread-count
 * 后端返回Long类型，会自动序列化为string避免精度丢失
 */
export function getUserUnreadAnnouncementCount(): Promise<string> {
  return http.get<string>('/api/announcements/unread-count')
}

/**
 * 确认阅读公告 - 对应后端 POST /api/announcements/confirm-read
 */
export function confirmReadAnnouncement(id: string): Promise<void> {
  return http.post('/api/announcements/confirm-read', {id})
}

/**
 * 标记所有公告为已读 - 对应后端 POST /api/announcements/mark-all-as-read
 */
export function markAllAnnouncementsAsRead(): Promise<void> {
  return http.post('/api/announcements/mark-all-as-read', {})
}


/**
 * 发布消息（班级公告/系统通知）
 * 对应后端：POST /api/inbox/publish (MessagePublishController)
 *
 * 说明：此接口使用MessagePublishController，支持：
 * - SUPER_ADMIN 发布系统通知
 * - 教师(SCH_TECH/CROP_ADMIN/CROP_USER) 发布班级公告
 * 后端会自动根据消息类型填充接收者列表
 *
 * @param data 消息创建请求
 * @returns Promise<void>
 */
export function sendTeacherToStudentMessage(data: InboxMessageCreateRequest): Promise<void> {
  return http.post('/api/inbox/publish', data)
}
