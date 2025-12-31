# 工单管理系统 - 前端

基于 Vue 3 + Vite + TypeScript + Vue Router + Pinia 的工单管理系统前端应用。

## 技术栈

- **Vue 3** - 渐进式 JavaScript 框架
- **Vite** - 下一代前端构建工具
- **TypeScript** - 类型安全的 JavaScript 超集
- **Vue Router** - 官方路由管理器
- **Pinia** - Vue 的状态管理库
- **Vitest** - 单元测试框架

## 项目结构

```
src/
├── components/          # 可复用组件
│   └── TicketStatusTimeline.vue  # 工单状态时间轴组件
├── layouts/            # 布局组件
│   └── MainLayout.vue  # 主布局
├── router/             # 路由配置
│   └── index.ts        # 路由定义和角色守卫
├── services/           # API 服务
│   └── supabaseApi.ts  # Supabase API 实现
├── stores/             # Pinia stores
│   ├── auth.ts         # 认证状态管理
│   ├── tickets.ts      # 工单状态管理
│   ├── workers.ts      # 维修工状态管理
│   └── kpi.ts          # KPI 状态管理
├── types/              # TypeScript 类型定义
│   └── index.ts        # 类型和接口定义
├── utils/              # 工具函数
│   └── ticketStateMachine.ts  # 工单状态机逻辑
└── views/              # 页面组件
    ├── auth/           # 认证相关页面
    ├── admin/          # 管理员页面
    ├── student/        # 学生页面
    └── worker/         # 维修工页面
```

## 功能特性

### 工单状态机

工单状态流转规则：

- **Draft** (草稿) → **Submitted** (已提交) - 学生
- **Submitted** (已提交) → **Accepted** (已受理) / **Canceled** (已取消) - 管理员/学生
- **Accepted** (已受理) → **Assigned** (已指派) / **Canceled** (已取消) - 管理员/学生
- **Assigned** (已指派) → **InProgress** (进行中) / **Reassigned** (已改派) - 维修工/管理员
- **InProgress** (进行中) → **Resolved** (已解决) / **Reassigned** (已改派) - 维修工/管理员
- **Resolved** (已解决) → **Confirmed** (已确认) - 学生
- **Confirmed** (已确认) → **Closed** (已关闭) - 管理员/学生

### 角色权限

- **学生 (Student)**: 创建工单、查看自己的工单、取消工单（Submitted/Accepted 状态）、验收工单
- **管理员 (Admin)**: 查看所有工单、指派工单、改派工单、管理维修团队、导出工单
- **维修工 (Worker)**: 查看分配的工单、接单、提交维修报告、标记完成

### 认证与会话

- 登录状态自动恢复，空闲 15 分钟自动登出

## 安装和运行

### 前置要求

- Node.js >= 16
- pnpm (推荐) 或 npm/yarn

### 安装依赖

```bash
pnpm install
```

### 开发模式

```bash
pnpm dev
```

应用将在 `http://localhost:5173` 启动

### 构建生产版本

```bash
pnpm build
```

### 运行测试

```bash
pnpm test
```

## Supabase 集成说明

本项目使用 Supabase Auth + 数据库作为后端，前端通过 `src/services/supabaseApi.ts` 进行调用。

### 账号与角色

- 账号通过注册或 Supabase Dashboard 创建
- 角色通过用户 metadata 或 `profiles.role` 管理（`student | admin | worker`）
- 忘记密码流程会跳转到 `/reset-password`

## 开发指南

### 状态机使用

状态机工具函数位于 `src/utils/ticketStateMachine.ts`：

```typescript
import { canTransition, getAvailableTransitions } from '@/utils/ticketStateMachine'

// 检查是否可以转换状态
const canChange = canTransition(currentStatus, targetStatus, userRole)

// 获取可用的状态转换
const availableStatuses = getAvailableTransitions(currentStatus, userRole)
```

### 添加新页面

1. 在 `src/views/` 下创建对应的 Vue 组件
2. 在 `src/router/index.ts` 中添加路由配置
3. 如需权限控制，在路由的 `meta.roles` 中指定允许的角色

### 添加新的 Store

在 `src/stores/` 下创建新的 store 文件，使用 Pinia 的 `defineStore`：

```typescript
import { defineStore } from 'pinia'

export const useMyStore = defineStore('myStore', () => {
  // state
  const data = ref([])
  
  // actions
  async function fetchData() {
    // ...
  }
  
  return { data, fetchData }
})
```

## 测试

项目使用 Vitest 进行单元测试。测试文件位于对应的源文件旁边，使用 `.test.ts` 后缀。

运行测试：

```bash
pnpm test
```

查看测试覆盖率：

```bash
pnpm test -- --coverage
```

## 注意事项

1. **后端依赖**：需要配置 Supabase 项目与环境变量
2. **状态管理**：使用 Pinia 进行状态管理，确保数据流清晰
3. **类型安全**：所有 API 和组件都使用 TypeScript 类型定义

## 后续开发计划

根据需求，可以逐步实现：

1. 图片上传功能（使用 FileReader 或 base64）
2. 更完善的表单验证
3. 更丰富的图表展示（集成 ECharts）
4. 更完善的错误处理
5. 响应式设计优化

## Supabase backend (Part B)

- 完整的 Supabase schema、RLS、存储策略、状态机触发器、KPI RPC、导出 RPC 在 `supabase/schema.sql`
- 实施指南与前端集成要点（Auth/Session、蛇形命名状态、存储路径规则）在 `supabase/README.md`
- 私有存储桶：`repairs-media`；状态值：`draft, submitted, accepted, assigned, reassigned, in_progress, resolved, closed, canceled`

## License

MIT
