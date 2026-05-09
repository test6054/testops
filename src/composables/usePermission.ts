/**
 * 权限检查组合式函数
 * 提供便捷的权限检查方法
 */

import {computed} from 'vue'
import {useAuthStore, useUserStore} from '@/stores'
import {
    hasAnyRole,
    hasRole,
    hasTeacherTenantPermission,
    isAdmin,
    isStudent,
    isTeacher,
    RoleEnum
} from '@/utils/permission'

/**
 * 权限检查组合式函数
 */
export function usePermission() {
    const userStore = useUserStore()
    const authStore = useAuthStore()

    // 基础用户信息
    const userInfo = computed(() => userStore.userInfo)
    const userRole = computed(() => authStore.userRole)
    const isAuthenticated = computed(() => authStore.isAuthenticated)

    // 角色检查
    const isCurrentAdmin = computed(() => isAdmin(userRole.value))
    const isCurrentTeacher = computed(() => isTeacher(userRole.value))
    const isCurrentStudent = computed(() => isStudent(userRole.value))

    // 租户管理员检查
    const isCurrentTenantAdmin = computed(() => userStore.isTenantAdmin)
    const hasCurrentTeacherTenantPermission = computed(() =>
        hasTeacherTenantPermission(userInfo.value)
    )

    /**
     * 检查当前用户是否具有指定角色
     */
    const checkRole = (targetRole: string): boolean => {
        return hasRole(targetRole, userRole.value)
    }

    /**
     * 检查当前用户是否具有任一指定角色
     */
    const checkAnyRole = (targetRoles: string[]): boolean => {
        return hasAnyRole(targetRoles, userRole.value)
    }

    /**
     * 检查是否为超级管理员
     */
    const checkAdmin = (): boolean => {
        return checkRole(RoleEnum.SUPER_ADMIN)
    }

    /**
     * 检查是否为教师角色（包括所有教师类角色）
     */
    const checkTeacher = (): boolean => {
        return checkAnyRole([
            RoleEnum.SCH_TECH,
            RoleEnum.CROP_ADMIN,
            RoleEnum.CROP_USER,
            RoleEnum.SUPER_ADMIN
        ])
    }

    /**
     * 检查是否为学生角色
     */
    const checkStudent = (): boolean => {
        return checkRole(RoleEnum.SCH_STU)
    }

    /**
     * 检查是否为SCH_TECH角色（教师）
     */
    const checkSchoolTech = (): boolean => {
        return checkRole(RoleEnum.SCH_TECH)
    }

    /**
     * 检查是否为企业角色
     */
    const checkCorp = (): boolean => {
        return checkAnyRole([RoleEnum.CROP_ADMIN, RoleEnum.CROP_USER])
    }

    /**
     * 检查是否具有租户管理权限
     * 超级管理员或租户管理员都具有此权限
     */
    const checkTenantManagement = (): boolean => {
        return checkAdmin() || isCurrentTenantAdmin.value
    }

    /**
     * 检查是否具有班级管理权限
     * 只有SCH_TECH角色可以管理班级
     */
    const checkClassManagement = (): boolean => {
        return checkSchoolTech() || checkAdmin()
    }

    /**
     * 检查是否具有教师管理权限
     * 只有租户管理员可以管理教师
     */
    const checkTeacherManagement = (): boolean => {
        return checkTenantManagement()
    }

    /**
     * 检查是否具有系统公告权限
     * 只有超级管理员可以发布系统公告
     */
    const checkSystemAnnouncement = (): boolean => {
        return checkAdmin()
    }

    /**
     * 检查是否具有全局用户管理权限
     * 只有超级管理员可以管理所有用户
     */
    const checkGlobalUserManagement = (): boolean => {
        return checkAdmin()
    }

    /**
     * 检查是否具有租户配置权限
     * 只有租户管理员可以配置租户设置
     */
    const checkTenantConfig = (): boolean => {
        return checkTenantManagement()
    }

    /**
     * 检查是否具有课程管理权限
     * 所有教师角色都可以管理课程
     */
    const checkCourseManagement = (): boolean => {
        return checkTeacher()
    }

    /**
     * 检查是否具有实训管理权限
     * 所有教师角色都可以管理实训
     */
    const checkPracticeManagement = (): boolean => {
        return checkTeacher()
    }

    /**
     * 检查是否具有学生管理权限
     * 所有教师角色都可以管理学生
     */
    const checkStudentManagement = (): boolean => {
        return checkTeacher()
    }

    /**
     * 检查是否具有评分权限
     * 所有教师角色都可以评分
     */
    const checkGrading = (): boolean => {
        return checkTeacher()
    }

    /**
     * 检查是否可以查看学生作业
     * 学生只能查看自己的作业，教师可以查看所有学生作业
     */
    const checkViewSubmissions = (studentId?: string): boolean => {
        if (checkTeacher()) {
            return true
        }
        if (checkStudent() && studentId) {
            return studentId === userInfo.value?.userId
        }
        return false
    }

    /**
     * 检查是否可以提交作业
     * 只有学生可以提交作业
     */
    const checkSubmitAssignment = (): boolean => {
        return checkStudent()
    }

    /**
     * 检查是否可以查看成绩
     * 学生可以查看自己的成绩，教师可以查看所有成绩
     */
    const checkViewGrades = (studentId?: string): boolean => {
        if (checkTeacher()) {
            return true
        }
        if (checkStudent() && studentId) {
            return studentId === userInfo.value?.userId
        }
        return false
    }

    return {
        // 基础信息
        userInfo,
        userRole,
        isAuthenticated,

        // 角色状态
        isCurrentAdmin,
        isCurrentTeacher,
        isCurrentStudent,
        isCurrentTenantAdmin,
        hasCurrentTeacherTenantPermission,

        // 基础角色检查
        checkRole,
        checkAnyRole,
        checkAdmin,
        checkTeacher,
        checkStudent,
        checkSchoolTech,
        checkCorp,

        // 功能权限检查
        checkTenantManagement,
        checkClassManagement,
        checkTeacherManagement,
        checkSystemAnnouncement,
        checkGlobalUserManagement,
        checkTenantConfig,
        checkCourseManagement,
        checkPracticeManagement,
        checkStudentManagement,
        checkGrading,
        checkViewSubmissions,
        checkSubmitAssignment,
        checkViewGrades,
    }
}
