$dirs = @("criar-admin", "criar-proprietaria", "invite-user", "remover-admin")

foreach ($dir in $dirs) {
    $path = "supabase/functions/$dir/index.ts"
    if (Test-Path $path) {
        $content = Get-Content $path -Raw
        
        # We want to replace the old corsHeaders block with the new one.
        # It looks like:
        # const corsHeaders = {
        #   'Access-Control-Allow-Origin': 'https://adiministrador.netlify.app',
        #   'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        # }
        
        # New block:
        $newHeaders = "const corsHeaders = {`n  'Access-Control-Allow-Origin': 'https://adm-salao.vercel.app',`n  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',`n  'Access-Control-Allow-Methods': 'POST, OPTIONS',`n}"
        
        # Let's do a regex replace to match the const corsHeaders block
        $pattern = "(?s)const corsHeaders = \{.*?\}"
        $content = $content -replace $pattern, $newHeaders
        
        Set-Content -Path $path -Value $content -NoNewline
        Write-Host "Updated $path"
    }
}
