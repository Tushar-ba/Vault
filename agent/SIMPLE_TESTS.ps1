# Simple Test Commands for PowerShell (Windows)
# Copy and paste these commands one by one!

Write-Host "=== Test 1: Gas Calculation (Ethereum) ===" -ForegroundColor Cyan
curl.exe -X POST http://localhost:3000/chat -H "Content-Type: application/json" -d '{\"message\": \"What was my total gas spend in the last 10 transactions for 0x49f51e3C94B459677c3B1e611DB3E44d4E6b1D55?\", \"chainId\": \"1\"}'

Write-Host "`n`n=== Test 2: Gas Calculation (Sepolia) ===" -ForegroundColor Cyan
curl.exe -X POST http://localhost:3000/chat -H "Content-Type: application/json" -d '{\"message\": \"What was my total gas spend in the last 10 transactions for 0x49f51e3C94B459677c3B1e611DB3E44d4E6b1D55?\", \"chainId\": \"11155111\"}'

Write-Host "`n`n=== Test 3: Contract Safety Analysis ===" -ForegroundColor Cyan
curl.exe -X POST http://localhost:3000/chat -H "Content-Type: application/json" -d '{\"message\": \"Here is this contract 0xB6C58FDB4BBffeD7B7224634AB932518a29e4C4b, please analyze its transaction pattern and let me know if its safe to interact with it\", \"chainId\": \"11155111\"}'

Write-Host "`n`n=== Test 4: Token Info (UNI Token) ===" -ForegroundColor Cyan
curl.exe -X POST http://localhost:3000/chat -H "Content-Type: application/json" -d '{\"message\": \"Tell me about this token: 0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984\", \"chainId\": \"1\"}'

Write-Host "`n`n=== Test 5: Last Transaction ===" -ForegroundColor Cyan
curl.exe -X POST http://localhost:3000/chat -H "Content-Type: application/json" -d '{\"message\": \"What is the last transaction for 0x49f51e3C94B459677c3B1e611DB3E44d4E6b1D55?\"}'

Write-Host "`n`n=== Test 6: Multi-Chain (Explicit) ===" -ForegroundColor Cyan
curl.exe -X POST http://localhost:3000/chat -H "Content-Type: application/json" -d '{\"message\": \"Show me activity for 0x49f51e3C94B459677c3B1e611DB3E44d4E6b1D55 across all chains\"}'

Write-Host "`n`n=== Test 7: Token Holdings on Sepolia ===" -ForegroundColor Cyan
curl.exe -X POST http://localhost:3000/chat -H "Content-Type: application/json" -d '{\"message\": \"What tokens does 0x49f51e3C94B459677c3B1e611DB3E44d4E6b1D55 hold?\", \"chainId\": \"11155111\"}'

Write-Host "`n`nAll tests complete!" -ForegroundColor Green

