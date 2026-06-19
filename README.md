# edu-practice-mark-vue

阅卷中心 Web 端，对接 `edu-mark` 后端，登录、租户、用户、文件、CAS 等公共能力直接复用 `edu-user` / `edu-storage` / `edu-gateway`。

## 技术栈

- Vue 3.5、Vite 7、TypeScript 5.8、pnpm
- Ant Design Vue 4.2、SCSS
- Pinia 3 + `pinia-plugin-persistedstate`
- Vue Router 5
- Axios（统一 HTTP 拦截器、`Authorization` / `X-Tenant-Id` / `X-Device-Id` / `X-Trace-Id` 自动注入、`refresh token` 自动续期）
- Ui* 图表组件（`UiBarChart` / `UiTrendChart` / `UiScatterChart`）+ `mark-statistics-chart.ts` 数据转换

## 与公共服务的对接

- **edu-user**：登录、刷新令牌、用户详情、租户公开信息、CAS、租户管理员校验。
- **edu-storage**：所有切片图、扫描页、原图、答卷 PDF 都通过 `/api/storage/filesystem/download?nodeId=xxx`（GET，blob）。匿名展示走 `getImageBlobUrl(nodeId)`，文件下载走 `handleDownloadFile({ fileId })`。
- **edu-gateway**：JWT 验证、`X-Tenant-Id` 透传、流量限制；前端默认通过 Vite 代理 / Nginx 转发到网关。
- **edu-mark**：阅卷专属业务，`/api/mark/exams/**`，全部 `POST` + DTO。

## 公共白名单（不带 token 也可访问）

- `/api/auth/tenant-list`
- `/api/auth/tenant-by-code/{code}`
- `/api/auth/tenants-by-student-no`
- `/api/login`、`/api/oauth2/refresh`、`/api/oauth2/token`
- `/api/auth/captcha/*`、`/captcha/`
- `/api/public/*`

## 启动

```bash
pnpm install
pnpm dev          # http://localhost:5273
pnpm typecheck
pnpm build
```

开发模式下 `/api` 由 Vite 代理转发到 `http://localhost:8081`（edu-gateway）。

## 目录约定

- `src/apis/auth.ts`、`src/apis/sso.ts`、`src/apis/tenant-admin.ts`、`src/apis/storage.ts`：基础服务对接（与 web-vue 一致）。
- `src/apis/mark/*`：阅卷业务，按 edu-mark Controller 1:1 拆分。
- `src/stores/modules/auth.ts`、`user.ts`、`tenant.ts`、`app.ts`：与 web-vue 等价，确保跨站点登录态一致。
- `src/utils/auth.ts`、`device.ts`、`trace.ts`、`error-handler.ts`、`subdomain.ts`、`permission.ts`、`file-download.ts`：完整复用。
- `src/styles/ui-tokens.scss`、`var.scss`、`mixin.scss` 等：与 web-vue 一致。

## 后续批次

- Batch 2：路由 + 守卫 + 布局 + 登录页（账号 / 学号 / CAS + 子域名直登）。
- Batch 3：阅卷业务 API。
- Batch 4：教师匿名批阅核心链路 + 切片查看器。
- Batch 5：扫描异常待办 + 影像账本 + 最终成绩确认。
- Batch 6：阅卷进度看板 + 导出 + 审计 + 学生查分。
