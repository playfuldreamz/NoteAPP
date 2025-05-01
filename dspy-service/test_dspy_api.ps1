# Test script for DSPy API in PowerShell

Write-Host "Testing DSPy service API..." -ForegroundColor Blue

# First test health endpoint
try {
    Write-Host "Testing health endpoint..." -ForegroundColor Green
    $healthResponse = Invoke-RestMethod -Uri "http://localhost:5001/health" -Method Get
    Write-Host "Health endpoint response: $($healthResponse | ConvertTo-Json)" -ForegroundColor Green
} catch {
    Write-Host "Error testing health endpoint: $_" -ForegroundColor Red
}

# Then test chat endpoint with simple prompt
try {
    Write-Host "`nTesting chat endpoint..." -ForegroundColor Green
    
    $body = @{
        user_input = "Tell me a short joke about programming"
        chat_history = @()
        user_id = "1"
    } | ConvertTo-Json
    
    Write-Host "Sending request: $body" -ForegroundColor Gray
    
    $chatResponse = Invoke-RestMethod -Uri "http://localhost:5001/chat" `
                    -Method Post `
                    -ContentType "application/json" `
                    -Body $body
    
    Write-Host "Chat response:" -ForegroundColor Green
    Write-Host $chatResponse.final_answer -ForegroundColor White
    
    # Show the full response for debugging
    Write-Host "`nFull response payload:" -ForegroundColor Yellow
    Write-Host ($chatResponse | ConvertTo-Json -Depth 4) -ForegroundColor Gray
    
    Write-Host "`nTest successful! Your DSPy service is working correctly." -ForegroundColor Blue
} catch {
    Write-Host "Error testing chat endpoint: $_" -ForegroundColor Red
    Write-Host "Response details:" -ForegroundColor Yellow
    try {
        $errorDetails = $_.ErrorDetails.Message | ConvertFrom-Json
        Write-Host ($errorDetails | ConvertTo-Json) -ForegroundColor Gray
    } catch {
        Write-Host "Could not parse error details." -ForegroundColor Gray
    }
    Write-Host "Make sure the DSPy server is running and the LLM provider configuration is correct." -ForegroundColor Yellow
}