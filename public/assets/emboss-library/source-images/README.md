# 待导入原始浮雕图

这里存放从 ChatGPT 对话或其他生成工具导出的原始图片，不直接作为生产代码依赖。

建议目录与命名：

- `barware/barware-shaker-01.png`
- `barware/barware-jigger-01.png`
- `botanical/botanical-rosemary-01.png`
- `botanical/botanical-mint-01.png`
- `botanical/botanical-sage-01.png`
- `botanical/botanical-thyme-01.png`
- `botanical/botanical-wormwood-01.png`
- `botanical/botanical-juniper-01.png`
- `alchemy/alchemy-symbol-01.png`
- `cocktails/cocktail-old-fashioned-01.png`

原图导入后，应在 `../manifest.json` 增加对应记录。若素材带有背景，先保留原图，再单独导出透明 PNG 或 SVG 到未来的 `production-overlays/` 目录。
