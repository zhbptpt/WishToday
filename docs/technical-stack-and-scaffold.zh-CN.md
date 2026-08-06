# WishToday 技术栈与脚手架决策

日期：2026-07-09

## 当前目录状态

当前工作区还没有应用代码脚手架，仅包含产品需求、核心流程规格和实施计划文档。因此第一阶段先建立可承载 MVP 核心链路的前端工程基线。

## 第一版范围

第一版只围绕以下核心链路：

```text
今日推荐 -> 详情 -> 实验台 -> 预览 -> 登录保存 -> 配方详情 -> 私人笔记本
```

本阶段不把社区、摇一摇、发布、收藏、编辑或删除已保存配方等后置功能放回 MVP。

## 技术栈

- App 前端：React + TypeScript + Vite
- 路由：react-router-dom
- 状态管理：zustand
- 本地数据：src/mocks 中维护 mock 鸡尾酒与材料数据
- 服务层：src/services 提供类似后端 API 的异步接口
- 样式：原生 CSS 与 CSS variables

## 选择理由

- React + Vite 能快速搭建移动端优先的 Web App/PWA 原型，适合验证第一版核心流程。
- TypeScript 能约束 Cocktail、Ingredient、DiyDraft、SavedRecipe、UserSession 等领域模型。
- react-router-dom 能清晰表达文档确认过的页面路径。
- zustand 适合保存跨页面的 DIY 草稿、认证状态和已保存配方，避免登录保存流程中草稿丢失。
- services 层隔离 mock 数据与页面逻辑，后续接真实 API 时优先替换服务实现，不重写页面。

## 路由基线

```text
/home
/cocktails/:cocktailId
/diy?sourceCocktailId=:cocktailId
/diy/preview
/login?redirectAction=saveRecipe
/register?redirectAction=saveRecipe
/recipes/:recipeId
/notebook
```

应用根路径 `/` 重定向到 `/home`。

## 目录约定

```text
src/
  components/   通用页面壳和占位组件
  mocks/        本地 mock 数据
  pages/        MVP 核心页面
  routes/       路由配置和路径常量
  services/     预留 API 接入边界
  store/        流程级状态管理
  styles/       全局样式
  types/        领域类型
```

## 后续 API 接入预留

页面不直接读取 mock 数据。页面应通过 `src/services/` 调用数据能力。后续接后端时，可以保留页面和 store，替换服务层中的 mock client。

