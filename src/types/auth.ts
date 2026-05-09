
export interface RegisterRequest {
    /** 用户名 */
    userName: string
    /** 密码 */
    password: string
    /** 确认密码 */
    confirmPassword: string
    /** 昵称 */
    nickName: string
    /** 邮箱 */
    email?: string
    /** 手机号 */
    mobile?: string
    /** 注册类型 */
    registerType?: string
    /** 验证码(后端使用邀请码作为验证码) */
    code?: string
    /** 用户角色 */
    role?: string
    /** 学号(学生角色时) */
    studentId?: string
    /** 教师编号(教师角色时) */
    teacherCode?: string
    /** 院系(教师角色时) */
    department?: string
    /** 学校ID(可选，后端通过邀请码确定) */
    schId?: string
    /** 院系ID(可选，后端通过邀请码确定) */
    departmentId?: string
    /** 班级ID */
    classId?: string
    /** 公司ID */
    companyId?: string
    /** 邀请码(必填) */
    inviteCode: string
    /** 租户ID(已废弃，通过邀请码自动获取) */
    tenantId?: string
    /** 验证码(已废弃) */
    captcha?: string
    /** 验证码ID(已废弃) */
    captchaId?: string
}
/**
 * 重置密码请求 - 与后端保持一致
 */
export interface ResetPasswordRequest {
    /** 邮箱地址 */
    email: string
    /** 验证码 */
    code: string
    /** 新密码 */
    newPassword: string
    /** 确认密码 */
    confirmPassword: string
}
/**
 * 刷新令牌请求
 */
export interface RefreshTokenRequest {
  /** 刷新令牌 */
  refreshToken: string
  /** 设备ID（可选，前端 auth.ts 会自动填充默认值） */
  deviceId?: string
}

/**
 * 刷新令牌响应 - 与后端OAuth2TokenController.TokenResponse完全一致
 */
export interface RefreshTokenResponse {
    /** 新的访问令牌（与后端 TokenResponse.accessToken 对齐） */
    accessToken: string
    /** 新的刷新令牌 */
    refreshToken?: string
    /** 令牌过期时间（秒） */
    expiresIn: number
}
/**
 * 用户登录响应信息（与后端UserLoginResponseDto完全一致）
 */
export interface UserLoginResponseDto {
    /** 用户ID - 后端Long类型序列化为string */
    userId: string
    /** 租户ID - 后端Long类型序列化为string */
    tenantId: string
    /** 用户名 */
    userName: string
    /** 昵称 */
    nickName: string
    /** 邮箱 */
    email?: string
    /** 手机号 */
    mobile?: string
    /** 头像URL */
    avatarUrl?: string
    /** 用户状态 - 对应后端UserStatusEnum */
    status: string
    /** 用户来源 */
    sourceFrom?: string
    /** 最后登录时间 */
    lastLoginTime?: string
    /** 用户注册时间 */
    createTime?: string
    /** 密码最后修改时间 */
    passwordLastChangedTime?: string
    /** 用户性别 (1-男, 2-女) */
    gender?: number
    /** 角色显示名称 */
    roleDisplayName?: string
    /** 角色键（如：SUPER_ADMIN, SCH_TECH等） */
    roleKey: string
    /** 角色ID - 后端Long类型序列化为string */
    roleId: string
    /** 权限列表 - 对应后端CustomGrantedAuthority集合 */
    authorities: string[]
    /** 权限字符串（后端内部使用，前端可忽略） */
    authoritiesString?: string
    /** 学生详情（如果是学生） */
    studentDetails?: StudentDetailsDto
    /** 教师详情（如果是教师） */
    teacherDetails?: TeacherLoginDetailsDto
    /** 企业助教详情（如果是企业助教） */
    corporateUserDetails?: CorporateUserDetailsDto
    /** 当前登录提供商类型 */
    currentLoginProviderType?: string
    /** 当前登录提供商唯一ID */
    currentLoginProviderUniqueId?: string
    /** 当前登录提供商用户名 */
    currentLoginProviderUsername?: string
    /** 是否需要强制修改密码 */
    forcePasswordChange?: boolean
    /** 租户类型 */
    tenantType: string
}

/**
 * 学生详情DTO - 与后端StudentDetailsDto对应
 */
export interface StudentDetailsDto {
    /** 学生详情ID */
    studentDetailId: string
    /** 学号 */
    studentNumber: string
    /** 班级名称 */
    className: string
    /** 班级ID */
    classId: string
    /** 入学年份 */
    enrollmentYear?: number
    /** 预计毕业年份 */
    graduationYear?: number
    /** 所属学校ID */
    schoolId?: string
    /** 所属学校名称 */
    schoolName?: string
}

/**
 * 教师登录详情DTO - 与后端TeacherDetailsDto对应（登录响应中的精简版，区别于 user-management.ts 的完整管理DTO）
 */
export interface TeacherLoginDetailsDto {
    /** 教师详情ID */
    teacherDetailId: string
    /** 工号 */
    teacherNumber: string
    /** 院系/部门 */
    department?: string
    /** 职称/职务 */
    title?: string
    /** 所属学校ID */
    schoolId?: string
    /** 所属学校名称 */
    schoolName?: string
}

/**
 * 企业助教详情DTO - 与后端CorporateUserDetailsDto对应
 */
export interface CorporateUserDetailsDto {
    /** 企业助教详情ID */
    corporateUserDetailId: string
    /** 所属公司ID */
    companyId?: string
    /** 企业内职位 */
    corporatePosition?: string
}
