# Test script for Ollama connection with DSPy service
# This script verifies that the DSPy service can connect to Ollama
# and use the gemma3:4b-it-qat model for generating responses

Write-Host "===== Testing DSPy-Ollama Integration =====" -ForegroundColor Cyan

# Check if Ollama is running
Write-Host "`nChecking Ollama service..." -ForegroundColor Blue
try {
    $ollamaResponse = Invoke-RestMethod -Uri "http://localhost:11434/api/tags" -Method Get -TimeoutSec 5
    Write-Host "✓ Ollama is running!" -ForegroundColor Green
    
    # Check if gemma3:4b-it-qat model is available
    $gemmaModel = $ollamaResponse.models | Where-Object { $_.name -eq "gemma3:4b-it-qat" }
    
    if ($gemmaModel) {
        Write-Host "✓ gemma3:4b-it-qat model is available!" -ForegroundColor Green
        Write-Host "  Size: $([math]::Round($gemmaModel.size / 1GB, 2)) GB" -ForegroundColor DarkGray
    } else {
        Write-Host "✗ gemma3:4b-it-qat model not found in Ollama" -ForegroundColor Red
        Write-Host "You may need to pull the model first:" -ForegroundColor Yellow
        Write-Host "ollama pull gemma3:4b-it-qat" -ForegroundColor Yellow
        exit 1
    }
} catch {
    Write-Host "✗ Error connecting to Ollama. Is it running?" -ForegroundColor Red
    Write-Host "Make sure Ollama is installed and running before continuing." -ForegroundColor Yellow
    Write-Host "Download Ollama from: https://ollama.com/download" -ForegroundColor Yellow
    exit 1
}

# Test Ollama API directly to verify model functionality
Write-Host "`nTesting Ollama API directly..." -ForegroundColor Blue

$ollamaTestPrompt = "Briefly explain what DSPy is in one short paragraph."
$ollamaTestBody = @{
    model = "gemma3:4b-it-qat"
    prompt = $ollamaTestPrompt
    stream = $false
} | ConvertTo-Json

try {
    Write-Host "Sending test prompt to Ollama: '$ollamaTestPrompt'" -ForegroundColor DarkGray
    $startTime = Get-Date
    $ollamaTestResponse = Invoke-RestMethod -Uri "http://localhost:11434/api/generate" -Method Post -Body $ollamaTestBody -ContentType "application/json"
    $endTime = Get-Date
    $duration = ($endTime - $startTime).TotalSeconds
    
    Write-Host "✓ Ollama API responded successfully in $($duration.ToString("0.00")) seconds!" -ForegroundColor Green
    Write-Host "Response:" -ForegroundColor White
    Write-Host $ollamaTestResponse.response -ForegroundColor Gray
} catch {
    Write-Host "✗ Error calling Ollama API directly" -ForegroundColor Red
    Write-Host "Error details: $_" -ForegroundColor Red
    exit 1
}

# Check if DSPy server is using Ollama
Write-Host "`nTesting if DSPy server is using Ollama..." -ForegroundColor Blue

# First check if DSPy server is running
try {
    $healthCheck = Invoke-RestMethod -Uri "http://localhost:5001/health" -Method Get -TimeoutSec 5
    
    if ($healthCheck.status -eq "ok") {
        Write-Host "✓ DSPy server is running!" -ForegroundColor Green
    } else {
        Write-Host "! DSPy server health check returned unexpected status: $($healthCheck.status)" -ForegroundColor Yellow
    }
} catch {
    Write-Host "✗ DSPy server is not running" -ForegroundColor Red
    Write-Host "Please start the DSPy server with: python dspy_server.py" -ForegroundColor Yellow
    Write-Host "Note: Make sure DEFAULT_LLM_PROVIDER is set to 'ollama' in config.py" -ForegroundColor Yellow
    exit 1
}

# Now test the DSPy chat endpoint with Ollama
Write-Host "`nTesting DSPy chat with Ollama backend..." -ForegroundColor Blue

$dspyTestPrompt = "Give me a short joke about programming."
$dspyTestBody = @{
    user_input = $dspyTestPrompt
    chat_history = @()
    user_id = "1"
} | ConvertTo-Json

try {
    Write-Host "Sending test prompt to DSPy: '$dspyTestPrompt'" -ForegroundColor DarkGray
    $startTime = Get-Date
    $dspyTestResponse = Invoke-RestMethod -Uri "http://localhost:5001/chat" -Method Post -Body $dspyTestBody -ContentType "application/json"
    $endTime = Get-Date
    $dspyDuration = ($endTime - $startTime).TotalSeconds
    
    Write-Host "✓ DSPy responded successfully in $($dspyDuration.ToString("0.00")) seconds!" -ForegroundColor Green
    Write-Host "Response:" -ForegroundColor White
    Write-Host $dspyTestResponse.final_answer -ForegroundColor Gray
    
    # Compare response times (Ollama direct vs. DSPy+Ollama)
    $overhead = $dspyDuration - $duration
    Write-Host "`nDSPy processing overhead: $($overhead.ToString("0.00")) seconds" -ForegroundColor DarkGray
    
    Write-Host "`n✓✓✓ Complete test successful! DSPy is correctly configured to use Ollama with gemma3:4b-it-qat" -ForegroundColor Green
} catch {
    Write-Host "✗ Error calling DSPy chat endpoint" -ForegroundColor Red
    Write-Host "Error details: $_" -ForegroundColor Red
    
    if ($_.Exception.Response) {
        $responseBody = $null
        try {
            $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
            $responseBody = $reader.ReadToEnd()
            $reader.Close()
            
            Write-Host "Server response: $responseBody" -ForegroundColor Red
        } catch {
            # Do nothing if we can't get response body
        }
    }
    
    Write-Host "`nPossible issues:" -ForegroundColor Yellow
    Write-Host "1. DSPy config.py is not set to use Ollama" -ForegroundColor Yellow
    Write-Host "2. DSPy is using a different Ollama model than gemma3:4b-it-qat" -ForegroundColor Yellow
    Write-Host "3. There could be an error in the DSPy server code" -ForegroundColor Yellow
    Write-Host "`nCheck logs in the DSPy server terminal for more details." -ForegroundColor Yellow
}

Write-Host "`n===== Test Complete =====" -ForegroundColor Cyan
