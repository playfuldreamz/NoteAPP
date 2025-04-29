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
        user_input = "Hello, what can you tell me about DSPy?"
        chat_history = @()
        user_id = "1"
    } | ConvertTo-Json
    
    $chatResponse = Invoke-RestMethod -Uri "http://localhost:5001/chat" `
                    -Method Post `
                    -ContentType "application/json" `
                    -Body $body
    
    Write-Host "Chat response:" -ForegroundColor Green
    Write-Host $chatResponse.final_answer -ForegroundColor White
    
    Write-Host "`nTest successful! Your DSPy service is working correctly." -ForegroundColor Blue
} catch {
    Write-Host "Error testing chat endpoint: $_" -ForegroundColor Red
    Write-Host "Make sure the DSPy server is running and the LLM provider configuration is correct." -ForegroundColor Yellow
}
