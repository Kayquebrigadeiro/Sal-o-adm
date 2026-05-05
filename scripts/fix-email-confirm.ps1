$path = "supabase/functions/criar-proprietaria/index.ts"
$content = Get-Content $path -Raw
$content = $content -replace 'email_confirm: false', 'email_confirm: true'
Set-Content -Path $path -Value $content -NoNewline
Write-Host "Updated email_confirm to true"
