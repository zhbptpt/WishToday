# WishToday 浮雕素材库

素材目录：`public/assets/emboss-library/`

## 分类

| 分类 | 文件 | 状态 | 用途 |
| --- | --- | --- | --- |
| 页面背景 | `backgrounds/leather-book-page.png` | 生产可用 | 全站深棕皮革书页背景 |
| 炼金术 | `reference-sheets/alchemy-page.png` | 参考稿 | 炼金符号、星芒、几何仪式图案 |
| 调酒器具 | `reference-sheets/barware-page.png` | 参考稿 | 古典杯、量酒器、吧勺等器具线稿 |
| 草本植物 | `reference-sheets/botanical-page.png` | 参考稿 | 草本枝叶与星盘组合 |
| 草本植物 | `reference-sheets/botanical-page-refined-2x.png` | 推荐参考稿 | 更精细的植物标本与星盘纹路 |
| 方案总览 | `reference-sheets/emboss-options-overview.png` | 参考稿 | 三种方向快速比对 |
| 精细度对比 | `reference-sheets/botanical-refinement-comparison.png` | 参考稿 | 原版与精修版对比 |

完整尺寸、路径和来源记录在 `public/assets/emboss-library/manifest.json`。

## 使用约束

- 大面积背景继续使用深棕皮革书页，不使用 Warm Ivory、cream、beige、sand 或 off-white。
- 浮雕纹只作低对比装饰，不与正文、表单控件和主操作争夺视觉层级。
- 当前 `reference-sheets` 是页面级应用样张，不能当作透明单体图层直接叠加。
- 生产使用单体纹样时，应另行导出透明 PNG 或 SVG，并按 `类别-对象-序号` 命名。
- 394px 移动端优先把纹样放在内容留白处；698px 桌面端可成组使用，但需避开标题和按钮热区。

## 待补素材

引用的 ChatGPT 对话“浮雕纹生成请求”没有随上下文提供原始图片文件。以下类别已在清单中登记为待导入：

- 单一古老调酒器具
- 草本植物标本
- 炼金术符号
- 鸡尾酒单体纹样

拿到原图后可直接放入 `public/assets/emboss-library/source-images/`，再从中筛选并导出生产用透明素材。
