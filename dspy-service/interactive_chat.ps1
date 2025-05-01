# Interactive chat script for DSPy service

# Configuration
$userId = "1"  # User ID for all interactions
$dspyEndpoint = "http://localhost:5001/chat"
$chatHistory = @()  # Store conversation history
$maxDisplayWidth = 100  # Maximum display width for formatting

function Show-Welcome {
    Clear-Host
    Write-Host "=================================" -ForegroundColor Cyan
    Write-Host "   Interactive DSPy Chat Client   " -ForegroundColor Cyan
    Write-Host "=================================" -ForegroundColor Cyan
    Write-Host "Type your messages and chat with the AI about your notes and transcripts."
    Write-Host "The AI has access to all your content (User ID: $userId)."
    Write-Host "Type 'exit' or 'quit' to end the session."
    Write-Host "Type 'clear' to start a new conversation."
    Write-Host "Type 'help' for commands."
    Write-Host "=================================" -ForegroundColor Cyan
    Write-Host ""
}

function Format-Response {
    param (
        [string]$text
    )
    
    # Split text into lines
    $lines = $text -split "`n"
    $result = @()
    
    foreach ($line in $lines) {
        # If line is longer than display width, wrap it
        if ($line.Length -gt $maxDisplayWidth) {
            $currentLine = ""
            $words = $line -split " "
            
            foreach ($word in $words) {
                if (($currentLine.Length + $word.Length + 1) -gt $maxDisplayWidth) {
                    $result += $currentLine
                    $currentLine = $word
                } else {
                    if ($currentLine.Length -eq 0) {
                        $currentLine = $word
                    } else {
                        $currentLine = "$currentLine $word"
                    }
                }
            }
            
            if ($currentLine.Length -gt 0) {
                $result += $currentLine
            }
        } else {
            $result += $line
        }
    }
    
    return $result -join "`n"
}

function Send-ChatMessage {
    param (
        [string]$message,
        [array]$history,
        [string]$userId
    )
    
    # Format chat history in the structure expected by DSPy ReAct agent
    $formattedHistory = @()
    foreach ($exchange in $history) {
        $formattedHistory += @{
            role = "user"
            content = $exchange.userMessage
        }
        $formattedHistory += @{
            role = "assistant"
            content = $exchange.assistantResponse
        }
    }
    
    $payload = @{
        user_input = $message
        chat_history = $formattedHistory
        user_id = $userId
    } | ConvertTo-Json -Depth 10
    
    try {
        $startTime = Get-Date
        $response = Invoke-RestMethod -Uri $dspyEndpoint -Method Post -ContentType "application/json" -Body $payload
        $endTime = Get-Date
        $duration = ($endTime - $startTime).TotalSeconds
        
        Write-Host "(Response time: $($duration.ToString("0.00")) seconds)" -ForegroundColor DarkGray
        
        return $response.final_answer
    } catch {
        Write-Host "Error communicating with DSPy service: $_" -ForegroundColor Red
        if ($_.Exception.Response) {
            $responseBody = $null
            try {
                $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
                $responseBody = $reader.ReadToEnd()
                $reader.Close()
                
                $parsed = $responseBody | ConvertFrom-Json
                Write-Host "Server response: $($parsed.error)" -ForegroundColor Red
            } catch {
                if ($responseBody) {
                    Write-Host "Server response: $responseBody" -ForegroundColor Red
                }
            }
        }
        return "Sorry, there was an error processing your request. Please try again."
    }
}

function Show-Help {
    Write-Host "`nAvailable Commands:" -ForegroundColor Yellow
    Write-Host "  exit, quit - End the chat session" -ForegroundColor Gray
    Write-Host "  clear      - Clear chat history and start fresh" -ForegroundColor Gray
    Write-Host "  help       - Show this help message" -ForegroundColor Gray
    Write-Host "`nExample queries:" -ForegroundColor Yellow
    Write-Host "  • Find my notes about DSPy" -ForegroundColor Gray
    Write-Host "  • What's in note 15?" -ForegroundColor Gray
    Write-Host "  • Summarize my notes from March" -ForegroundColor Gray
    Write-Host "  • What were the action items mentioned in my latest meeting?" -ForegroundColor Gray
    Write-Host "  • Tell me about my notes on machine learning" -ForegroundColor Gray
    Write-Host "  • Compare notes 15 and 16" -ForegroundColor Gray
    Write-Host ""
}

function Show-ChatHistory {
    if ($chatHistory.Count -eq 0) {
        Write-Host "No chat history yet." -ForegroundColor DarkGray
        return
    }
    
    Write-Host "`nChat History:" -ForegroundColor Yellow
    for ($i = 0; $i -lt $chatHistory.Count; $i++) {
        Write-Host "Turn $($i+1):" -ForegroundColor DarkGray
        Write-Host "You: $($chatHistory[$i].userMessage)" -ForegroundColor Green
        Write-Host "AI: $($chatHistory[$i].assistantResponse)" -ForegroundColor Blue
        Write-Host ""
    }
}

# Check if DSPy service is running
try {
    $healthCheck = Invoke-RestMethod -Uri "http://localhost:5001/health" -Method Get -TimeoutSec 5
    if ($healthCheck.status -ne "ok") {
        Write-Host "Warning: DSPy service health check response unexpected: $($healthCheck | ConvertTo-Json)" -ForegroundColor Yellow
    }
} catch {
    Write-Host "Error: DSPy service does not appear to be running at http://localhost:5001" -ForegroundColor Red
    Write-Host "Please start the DSPy service first with: python dspy_server.py" -ForegroundColor Red
    exit 1
}

# Main chat loop
Show-Welcome

while ($true) {
    # Display prompt
    Write-Host "> " -ForegroundColor Green -NoNewline
    $userInput = Read-Host
    
    # Process special commands
    if ($userInput -eq "exit" -or $userInput -eq "quit") {
        Write-Host "Ending chat session. Goodbye!" -ForegroundColor Cyan
        break
    }
    elseif ($userInput -eq "clear") {
        $chatHistory = @()
        Show-Welcome
        Write-Host "Chat history cleared. Starting fresh conversation." -ForegroundColor Yellow
        continue
    }
    elseif ($userInput -eq "help") {
        Show-Help
        continue
    }
    elseif ($userInput -eq "history") {
        Show-ChatHistory
        continue
    }
    elseif ($userInput -eq "") {
        # Skip empty input
        continue
    }
    
    # Send the message to DSPy service
    Write-Host "`nAI is thinking..." -ForegroundColor DarkGray
    $response = Send-ChatMessage -message $userInput -history $chatHistory -userId $userId
    
    # Display formatted response
    Write-Host "`nAI: " -ForegroundColor Blue
    $formattedResponse = Format-Response -text $response
    Write-Host $formattedResponse -ForegroundColor White
    Write-Host ""
      # Add the exchange to chat history as a proper object with named properties
    $chatHistory += @{
        userMessage = $userInput
        assistantResponse = $response
    }
}
