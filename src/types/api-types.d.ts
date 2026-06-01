
/**
 * API类型定义文件
 * 包含所有与API交互相关的类型定义：
 * - 统一响应格式（ResultInfo）
 * - 分页相关类型（PageResult, QueryDto）
 * - 通用操作类型（IdRequest, BatchRequest等）
 * - 业务实体类型（UserDto等）
 * - 文件上传类型
 */


/**
 * 统一响应格式（与后端ResultInfo完全匹配）
 * 所有API接口都应该使用这个类型
 */
declare global {
    interface ResultInfo<T> {
        /** 请求是否成功 */
        success: boolean
        /** 响应状态码 */
        code: number
        /** 响应消息 */
        msg: string
        /** 响应数据 */
        data: T
    }
}


/**
 * 分页查询结果（与后端PageResult完全匹配）
 */
interface PageResult<T> {
    /** 数据列表 */
    list: T[]
    /** 总记录数（后端Long -> 前端string） */
    total: string
    /** 当前页码 */
    pageNum: number
    /** 页大小 */
    pageSize: number
    /** 总页数 */
    pages: number
}

/**
 * 分页查询参数（与后端QueryDto完全匹配）
 * 注意：searchTerm, searchText, keyword, statusFilter 等搜索字段
 * 不属于基础QueryDto，而是在具体的查询DTO中定义
 */
interface QueryDto {
    /** 实体ID（后端Long -> 前端string） */
    id?: string
    /** 当前页码（从1开始） */
    pageNum?: number
    /** 用户ID（后端Long -> 前端string） */
    userId?: string
    /** 每页显示记录数 */
    pageSize?: number
    /** 创建时间（后端LocalDateTime -> 前端string） */
    createTime?: string
    /** 开始时间（后端LocalDateTime -> 前端string） */
    startTime?: string
    /** 租户ID（后端Long -> 前端string） */
    tenantId?: string
    /** 结束时间（后端LocalDateTime -> 前端string） */
    endTime?: string
}

/** 通用ID请求类型 */
interface IdRequest {
    id: string
}
/**
 * 用户基本信息DTO - 与后端完全对齐
 * 对应后端：com.nybc.edu.common.model.UserDto
 */
interface UserDto {
    /** 平台用户唯一ID (t_user.id) - 后端为Long，前端处理为string */
    id: string
    /** 登录账号 (通常是 t_user.user_name) */
    userName: string
    /** 用户昵称/姓名 (t_user.nick_name) */
    nickName: string
    /** 手机号码 (t_user.mobile) */
    mobile?: string
    /** 邮箱 (t_user.email) */
    email?: string
    /** 用户状态 - 对应后端 UserStatusEnum，值为 ACTIVE/INACTIVE/PENDING_APPROVAL/SUSPENDED/REJECTED/DELETED */
    status: string
    /** 所属学校ID (如果用户是学生或教师) */
    schoolId?: string
    /** 所属院系ID */
    departmentId?: string
    /** 教师工号 (关联 t_teacher_detail.teacher_number) */
    teacherId?: string
    /** 所属班级ID (如果用户是学生, 关联 t_class.id) */
    classId?: string
    /** 学号 (关联 t_student_detail.student_number) */
    stuId?: string
    /** 用户拥有的角色ID (关联 t_role.id) */
    roleId?: string
    /** 微信OpenID或其他微信相关标识 */
    wechatId?: string
    /** 头像URL (t_user.avatar_url) */
    avatarUrl?: string
    /** 最后登录时间 (t_user.last_login_time) */
    lastLoginTime?: string
    /** 用户角色键 */
    roleKey?: string
    /** 租户ID */
    tenantId?: string
    /** 班级名称 */
    className?: string
    /** 学校名称 */
    schoolName?: string
    /** 院系名称 */
    departmentName?: string
    /** 专业 ID（关联 t_majors.id） */
    majorId?: string
    /** 专业名称（联表填充） */
    majorName?: string
    /** 学号 (关联 t_student_detail.student_number) */
    studentNumber?: string
}



/** 键值对类型 - 使用泛型替代any */
interface LabelValueState<T = string | number> {
    label: string
    value: T
    extra?: string
}


export type {
    BatchRequest,
    BatchResponse,
    FileUploadResponse,
    IdRequest,
    LabelValueState,
    PageResult,
    QueryDto,
    UserDto,
}
