# Test script for the DSPy "get content for note" functionality

Write-Host "Testing DSPy 'get content for note' functionality..." -ForegroundColor Blue

# First test direct DSPy service
try {
    Write-Host "`nSending direct request to DSPy service (port 5001)..." -ForegroundColor Green
    
    $body = @{
        user_input = "get content for note 15"
        chat_history = @(
            @("find notes about DSPy", "{`"results`": [{`"id`": 15, `"type`": `"note`", `"title`": `"DSPy Planning`", `"relevance`": 0.85, `"preview`": `"Initial thoughts on DSPy integration...`"}]}")
        )
        user_id = "1"
    } | ConvertTo-Json -Depth 5
    
    $directResponse = Invoke-RestMethod -Uri "http://localhost:5001/chat" `
                     -Method Post `
                     -ContentType "application/json" `
                     -Body $body
    
    Write-Host "Direct DSPy service response:" -ForegroundColor Green
    Write-Host $directResponse.final_answer -ForegroundColor White
    Write-Host "`n-----------------------------------`n" -ForegroundColor Yellow
} catch {
    Write-Host "Error testing direct DSPy service: $_" -ForegroundColor Red
}

# Then test through Node.js backend
try {
    Write-Host "Testing through Node.js backend (port 5000)..." -ForegroundColor Green
    
    # Use the JWT token you already have
    $token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwidXNlcm5hbWUiOiJhYWEiLCJpYXQiOjE3NDU4NzU1NDF9.su3QTqoZMy6bZr1jbeNzPxK7X466_TUutneDHyyuYDQ"
    
    $body = @{
        userInput = "get content for note 15"
        chatHistory = @(
            @("find notes about DSPy", "{`"results`": [{`"id`": 15, `"type`": `"note`", `"title`": `"DSPy Planning`", `"relevance`": 0.85, `"preview`": `"Initial thoughts on DSPy integration...`"}]}")
        )
    } | ConvertTo-Json -Depth 5
    
    $backendResponse = Invoke-RestMethod -Uri "http://localhost:5000/api/chat" `
                      -Method Post `
                      -ContentType "application/json" `
                      -Headers @{Authorization = "Bearer $token"} `
                      -Body $body
    
    Write-Host "Node.js backend response:" -ForegroundColor Green
    if ($backendResponse.success) {
        Write-Host $backendResponse.final_answer -ForegroundColor White
    } else {
        Write-Host "Error: $($backendResponse.error)" -ForegroundColor Red
    }
    
    Write-Host "`nTest complete." -ForegroundColor Blue
} catch {
    Write-Host "Error testing through Node.js backend: $_" -ForegroundColor Red
    Write-Host "Make sure both the DSPy service and Node.js backend are running." -ForegroundColor Yellow
}
