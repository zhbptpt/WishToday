# 私人笔记本页面背景接入设计

## 目标

将用户选定的“私人笔记本”古籍背景应用到 `/notebook` 页面，同时保持 `/recipes/:recipeId` 私人酒谱详情页继续使用原有独立背景。此次只更换页面底图和路由级样式标识，不改动笔记本的数据、登录跳转、卡片内容或交互。

## 已选视觉

- 视觉源：本轮生成的私人笔记本背景。
- 项目资源名：`public/assets/page-backgrounds/private-notebook-grimoire-golden-v4.png`。
- 风格：暖金黄褐古纸、焦黑厚边、古铜护角、日月徽记、锁芯与钥匙、羽毛笔、墨水瓶、压制药草，以及低对比度钥匙孔/月牙/笔尖暗纹。
- 版式约束：背景中央保留大面积可读区域，装饰集中于边缘；保持原始竖版比例，不裁掉四角五金和底部暗纹文字。

## 接入方案

采用路由专属外壳类，这是现有首页、详情页、DIY、预览页和私人酒谱详情页已经使用的模式。

1. `/notebook` 的 `AppShell` 增加 `app-shell--notebook-book`。
2. 新类在 `global.css` 中引用新的私人笔记本背景资源，并使用与既有古籍页一致的宽度、背景铺放与移动端适配规则。
3. 登录态与未登录跳转态都继续位于同一路由，因此共享同一背景。
4. `/recipes/:recipeId` 保留 `app-shell--recipe-detail-book` 和 `private-recipe-grimoire-golden-v4.png`，避免两个页面错误共用底图。

未采用的方案：替换全局 `app-shell--book-background` 会同时影响登录、注册等页面；在 `NotebookPage` 内额外叠加背景会重复页面容器职责，并增加层级和裁切风险。

## 可读性与响应式

- 不修改现有笔记本卡片结构；深棕卡片继续为文字提供稳定对比度。
- 页面底图按完整画幅铺放，移动端保持护角、焦边和中央内容区的相对位置。
- 若实装截图显示标题或卡片遮挡底部锁匙插画，仅调整 `/notebook` 专属内边距或背景尺寸，不改动其他页面。
- 尊重现有页面翻动动画和 `prefers-reduced-motion` 行为。

## 测试与验证

- 先在 `AppShell.test.tsx` 增加失败用例，确认只有 `/notebook` 获得 `app-shell--notebook-book`。
- 在 `PageBackgrounds.test.mjs` 增加失败映射用例，确认新类指向 `private-notebook-grimoire-golden-v4.png`。
- 接入资源与最小 CSS 后运行相关测试、类型检查和生产构建。
- 使用项目当前的应用内浏览器，在 `/notebook` 的目标移动端视口截图；将该截图与选定背景放在同一张对比图中，检查背景裁切、装饰遮挡、文字对比度和控制台错误。

## 完成标准

- `/notebook` 显示新私人笔记本背景。
- `/recipes/:recipeId` 仍显示私人酒谱详情背景。
- 页面功能和导航无回归。
- 自动化检查通过，设计 QA 无未解决的 P0、P1 或 P2 问题。
