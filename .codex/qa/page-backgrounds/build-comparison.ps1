Add-Type -AssemblyName System.Drawing

$root = 'D:\zhbxm\WishToday'
$assetRoot = Join-Path $root 'public\assets\page-backgrounds'
$qaRoot = Join-Path $root '.codex\qa\page-backgrounds'
$pairs = @(
  @('Home', 'home-alchemy-grimoire-golden-v4.png', 'home.png'),
  @('Cocktail detail', 'cocktail-detail-alchemy-grimoire-golden-v4.png', 'cocktail-detail.png'),
  @('DIY workbench', 'diy-alchemy-workbench-grimoire-golden-v4.png', 'diy.png'),
  @('Ingredient sheet', 'ingredient-herbarium-grimoire-golden-v4.png', 'ingredient-sheet.png'),
  @('Final preview', 'preview-final-grimoire-golden-v4.png', 'preview.png'),
  @('Private recipe', 'private-recipe-grimoire-golden-v4.png', 'private-recipe.png')
)

$board = New-Object System.Drawing.Bitmap 1440, 1040
$graphics = [System.Drawing.Graphics]::FromImage($board)
$graphics.Clear([System.Drawing.Color]::FromArgb(20, 15, 11))
$graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$font = New-Object System.Drawing.Font('Segoe UI', 16, [System.Drawing.FontStyle]::Bold)
$small = New-Object System.Drawing.Font('Segoe UI', 11)
$gold = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(220, 187, 118))
$muted = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(170, 145, 99))

for ($i = 0; $i -lt $pairs.Count; $i++) {
  $column = $i % 3
  $row = [Math]::Floor($i / 3)
  $x = 20 + $column * 475
  $y = 18 + $row * 510

  $graphics.DrawString($pairs[$i][0], $font, $gold, $x, $y)
  $graphics.DrawString('Source', $small, $muted, $x, $y + 30)
  $graphics.DrawString('Applied page', $small, $muted, $x + 235, $y + 30)

  $sourcePath = Join-Path $assetRoot $pairs[$i][1]
  $implementationPath = Join-Path $qaRoot $pairs[$i][2]
  $source = [System.Drawing.Image]::FromFile($sourcePath)
  $implementation = [System.Drawing.Image]::FromFile($implementationPath)
  $graphics.DrawImage($source, $x, $y + 52, 225, 400)
  $graphics.DrawImage($implementation, $x + 235, $y + 52, 225, 400)
  $source.Dispose()
  $implementation.Dispose()
}

$graphics.Dispose()
$font.Dispose()
$small.Dispose()
$gold.Dispose()
$muted.Dispose()
$outputPath = Join-Path $qaRoot 'comparison-board.png'
$board.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)
$board.Dispose()

Get-Item $outputPath | Select-Object FullName, Length
