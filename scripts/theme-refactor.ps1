#requires -Version 5.1
<#
  Substitui classes Tailwind hardcoded (slate, white) por tokens semanticos
  (bg-card, bg-muted, text-foreground, etc) que respeitam tema claro/escuro.

  - PULA o sidebar (intencionalmente escuro em ambos os temas).
  - PULA classes que aparecem em palavras maiores (limites \b).
  - bg-slate-700/800/900 NUNCA s o trocados (sidebar/overlays/active).
#>

$root = Join-Path $PSScriptRoot '..\src\app'
$skip = @(
  'app-sidebar.component.ts',
  'theme-refactor.ps1'
)

# Pares (regex, replacement). Ordem importa.
$rules = @(
  # Surfaces
  @('\bbg-white\b',                 'bg-card'),
  @('\bbg-slate-50\b',              'bg-muted/40'),
  @('\bbg-slate-100\b',             'bg-muted'),
  @('\bbg-slate-200\b',             'bg-muted'),
  @('\bhover:bg-white\b',           'hover:bg-card'),
  @('\bhover:bg-slate-50\b',        'hover:bg-accent'),
  @('\bhover:bg-slate-100\b',       'hover:bg-accent'),
  @('\bhover:bg-slate-200\b',       'hover:bg-accent'),
  @('\bfocus-within:bg-white\b',    'focus-within:bg-card'),

  # Borders
  @('\bborder-slate-100\b',         'border-border'),
  @('\bborder-slate-200\b',         'border-border'),
  @('\bborder-slate-300\b',         'border-input'),
  @('\bhover:border-slate-300\b',   'hover:border-ring/50'),
  @('\bfocus-within:border-slate-300\b','focus-within:border-ring/50'),

  # Text - high contrast
  @('\btext-slate-950\b',           'text-foreground'),
  @('\btext-slate-900\b',           'text-foreground'),
  @('\btext-slate-800\b',           'text-foreground'),
  # Text - medium
  @('\btext-slate-700\b',           'text-foreground'),
  @('\btext-slate-600\b',           'text-muted-foreground'),
  # Text - muted
  @('\btext-slate-500\b',           'text-muted-foreground'),
  @('\btext-slate-400\b',           'text-muted-foreground'),

  @('\bhover:text-slate-950\b',     'hover:text-foreground'),
  @('\bhover:text-slate-900\b',     'hover:text-foreground'),
  @('\bhover:text-slate-700\b',     'hover:text-foreground'),
  @('\bhover:text-slate-600\b',     'hover:text-foreground')
)

$changed = 0
$totalReplacements = 0

Get-ChildItem -Path $root -Recurse -Include *.ts,*.html | ForEach-Object {
  if ($skip -contains $_.Name) { return }
  $path = $_.FullName
  $content = Get-Content -LiteralPath $path -Raw -Encoding UTF8
  if (-not $content) { return }

  $orig = $content
  $fileReplacements = 0
  foreach ($rule in $rules) {
    $pattern = $rule[0]
    $replacement = $rule[1]
    $matches = [regex]::Matches($content, $pattern)
    if ($matches.Count -gt 0) {
      $fileReplacements += $matches.Count
      $content = [regex]::Replace($content, $pattern, $replacement)
    }
  }

  if ($content -ne $orig) {
    Set-Content -LiteralPath $path -Value $content -Encoding UTF8 -NoNewline
    $changed++
    $totalReplacements += $fileReplacements
    Write-Host ("  [{0,3} subs] {1}" -f $fileReplacements, ($path -replace [regex]::Escape($root + '\'), ''))
  }
}

Write-Host ""
Write-Host ("Done. {0} files modified, {1} total replacements." -f $changed, $totalReplacements) -ForegroundColor Green
