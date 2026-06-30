$root = $PSScriptRoot
$pnpm = "C:\Users\Administrator\.cache\codex-runtimes\codex-primary-runtime\dependencies\bin\pnpm.cmd"
$nodeBin = "C:\Users\Administrator\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin"
$env:PATH = "$nodeBin;$env:PATH"
$env:ELECTRON_MIRROR = "https://npmmirror.com/mirrors/electron/"
$electronExe = Join-Path $root "node_modules\electron\dist\electron.exe"
if (!(Test-Path -LiteralPath $electronExe)) {
  & $pnpm install --dir $root
  & $pnpm --dir $root approve-builds electron
  & $pnpm --dir $root rebuild electron
  if (!(Test-Path -LiteralPath $electronExe)) {
    & (Join-Path $nodeBin "node.exe") (Join-Path $root "node_modules\electron\install.js")
  }
}
& $pnpm --dir $root start
