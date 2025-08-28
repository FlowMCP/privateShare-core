# CORE.md - PrivateShare Core Module Specification

## Overview

The Core module (`2-privateShare-core`) is the heart of the PrivateShare system and responsible for all smart contract interactions, eERC-20 token transfers and communication with MCP servers.

**Important Note**: Due to lack of support and weeks-long wait times with @avalabs/eerc-sdk, we implement our own eERC-20 integration based on the available code as foundation.

## Architecture

### Module Structure
```
2-privateShare-core/
├── src/
│   ├── index.mjs                 # Main export
│   ├── task/
│   │   ├── PrivateShare.mjs      # Main class for eERC-20 operations
│   │   └── ServerManager.mjs     # HTTP server & cron job management
│   └── data/
│       └── config.mjs            # Configuration
├── tests/
│   └── manual/
│       └── 0-test.mjs           # Manual test
└── package.json
```

## PrivateShare Class

### Public API

#### Key Management
```javascript
// Private/Public key generation from Method-ID
const { privateKey, publicKey } = PrivateShare.methodIdToPrivateKey({ 
    methodId: "PRIVATESHARE__GETALLPRICES_DUNE", 
    serverSecret: "secret_from_env" 
})

// Check registration in eERC-20 system
const { isRegistered } = PrivateShare.isRegistered({ 
    publicKey: "0x123..." 
})

// Register new address
const { txHash } = PrivateShare.registerAddress({ 
    publicKey: "0x123..." 
})
```

#### Stats & Distribution
```javascript
// Fetch latest statistics from MCP server
const { status, messages, data } = PrivateShare.getLatestStats({ 
    serverUrl: "http://mcp-server:8080", 
    header: { 'Authorization': 'Bearer token123' } 
})
const { stats, unixFrom, unixTo, dataId } = data

// Generate transfer array based on fair distribution
const { arrayOfTransfers } = PrivateShare.getArrayOfTransfers({ 
    stats: {
        'PRIVATESHARE__GETALLPRICES_DUNE': 45,
        'PRIVATESHARE__GETWEATHER_API': 30,
        'PRIVATESHARE__SENTIMENT_ANALYSIS': 25
    },
    distribution: { 
        type: 'fair', 
        minimumAmount: '0.01' 
    },
    totalAmount: "10.00",
    serverMainAddress: "0xServerMainAddress..."
})
```

#### Transaction Handling
```javascript
// Generate batch proof for eERC-20 transfers
const { transactionProof } = PrivateShare.generateRecursiveTransactionProof({ 
    arrayOfTransfers: [
        {
            methodId: "PRIVATESHARE__GETALLPRICES_DUNE",
            fromAddress: "0xServerMain...",
            toAddress: "0x123...",
            amount: "4.50"
        }
    ]
})

// Send transaction proof to blockchain
const { txHash, success } = PrivateShare.sendTransactionProof({ 
    transactionProof: proof_object 
})

// Monitor transaction confirmation
const { confirmed, failed, pending } = PrivateShare.waitForConfirmation({ 
    txHash: "0xabc...", 
    timeout: 300000 
})
```

#### MCP Communication
```javascript
// Send "finished" message to MCP server
const { status, messages } = PrivateShare.sendFinishedResponse({ 
    serverUrl: "http://mcp-server:8080",
    header: { 'Authorization': 'Bearer token123' },
    dataId: "1234567890"
})
```

#### Balance Queries
```javascript
// Query single encrypted balance
const { encryptedAmount } = PrivateShare.getEncryptedBalance({ 
    methodId: "PRIVATESHARE__GETALLPRICES_DUNE",
    serverSecret: "secret_from_env"
})

// Query multiple encrypted balances
const { arrayOfEncryptedAmounts } = PrivateShare.getEncryptedBalances({ 
    arrayOfMethodIds: [
        "PRIVATESHARE__GETALLPRICES_DUNE",
        "PRIVATESHARE__GETWEATHER_API"
    ],
    serverSecret: "secret_from_env"
})
```

#### Utility
```javascript
// Generate Method-ID from routePath and toolName
const { methodId } = PrivateShare.getMethodId({ 
    routePath: "/privateShare", 
    toolName: "tools/getAllPrices_dune" 
})
// Returns: "PRIVATESHARE__GETALLPRICES_DUNE"

// Health-Check
const { status } = PrivateShare.health()
```

### Private Implementation

#### Key Generation
```javascript
#generateKeys( { methodId, serverSecret } ) {
    // Deterministic private key generation
    const combinedInput = methodId + serverSecret
    const privateKey = ethers.utils.keccak256( ethers.utils.toUtf8Bytes( combinedInput ) )
    const publicKey = ethers.utils.computeAddress( privateKey )
    
    return { privateKey, publicKey }
}
```

#### Method ID Generation
```javascript
#generateMethodId( { routePath, toolName } ) {
    // Transform routePath: remove "/" at beginning, then toUpperCase
    const cleanedRoutePath = routePath.replace( /^\//, '' ).toUpperCase()
    
    // Transform toolName: remove "tools/" prefix if present, then toUpperCase  
    const cleanedToolName = toolName.replace( /^tools\//, '' ).toUpperCase()
    
    // Connect with double underscore
    const methodId = cleanedRoutePath + '__' + cleanedToolName
    
    return { methodId }
}
```

#### Transfer Array Calculation
```javascript
#calculateTransferArray( { stats, distribution, totalAmount, serverMainAddress } ) {
    // Fair distribution algorithm
    const totalCalls = Object.values( stats ).reduce( ( sum, count ) => sum + count, 0 )
    
    const arrayOfTransfers = Object.entries( stats )
        .map( ( [ methodId, count ] ) => {
            const percentage = count / totalCalls
            const amount = ( totalAmount * percentage ).toFixed(2)
            const { publicKey } = this.#generateKeys( { methodId, serverSecret } )
            
            return {
                methodId,
                fromAddress: serverMainAddress,
                toAddress: publicKey,
                amount: amount
            }
        } )
        .filter( ( transfer ) => parseFloat( transfer.amount ) >= parseFloat( distribution.minimumAmount ) )
    
    return { arrayOfTransfers }
}
```

## ServerManager Class

**Main Function**: ServerManager is primarily a **cron job system** that regularly polls MCP servers and processes payments. The HTTP server only serves for debug and dashboard access.

### Constructor & Configuration
```javascript
const server = new ServerManager({
    enableDebugRoute: true,          // /debug endpoint for development time
    enableBalanceRoute: true,        // /getEncryptedBalances endpoint for dashboard
    cronInterval: 300000,            // 5 minute cron job interval
    mcpServers: [                    // MCP servers actively polled
        { 
            url: 'http://mcp1:8080', 
            token: 'bearer_token_1'  // Bearer token protection for MCP route
        },
        { 
            url: 'http://mcp2:8080', 
            token: 'bearer_token_2' 
        }
    ],
    silent: false                    // Console logging enabled
})
```

### Server Management
```javascript
// Start server
const { server } = server.start({ port: 3000 })

// Start cron job for automatic MCP polling
const { started } = server.startCronJob()

// Stop server
const { stopped } = server.stop()

// Health-Check
const { status } = ServerManager.health()
```

### HTTP Routes

#### GET /debug
Development route for transaction statistics (only enabled during development time):
```javascript
// Simple response format:
{
    "status": "running",
    "lastProcessed": "2025-01-15T10:30:00Z",
    "totalTransactions": 156,
    "activeMCPServers": 2
}
```

#### GET /getEncryptedBalances
Dashboard integration for authorized users:
```javascript
// Query Parameter: ?methodIds=METHOD1,METHOD2,METHOD3
// Response-Format:
{
    "balances": [
        {
            "methodId": "PRIVATESHARE__GETALLPRICES_DUNE",
            "address": "0x123...",
            "encryptedAmount": "0xabcd..."
        },
        {
            "methodId": "PRIVATESHARE__GETWEATHER_API", 
            "address": "0x456...",
            "encryptedAmount": "0xefgh..."
        }
    ],
    "timestamp": "2025-01-15T10:30:00Z"
}
```

#### GET /health
```javascript
// Response-Format:
{
    "status": "healthy",
    "services": {
        "cron": "running",
        "blockchain": "connected",
        "mcpServers": 2
    },
    "timestamp": "2025-01-15T10:30:00Z"
}
```

### Cron Job System

#### Automatic MCP Polling
```javascript
// Workflow:
// 1. Poll MCP servers every 5 minutes via POST request
// 2. Collect and process stats (if available)
// 3. Calculate fair distribution
// 4. Execute eERC-20 batch transfers
// 5. Monitor transaction confirmation
// 6. Send "finished" response to MCP via POST

#executeCronJob() {
    this.mcpServers.forEach( async ( mcpServer ) => {
        const { status, data } = await PrivateShare.getLatestStats({ 
            serverUrl: `${mcpServer.url}/stats`,
            method: 'POST',
            header: { 'Authorization': `Bearer ${mcpServer.token}` }
        })
        
        if( status && data.stats ) {
            await this.#processPaymentCycle( { 
                stats: data.stats,
                dataId: data.dataId,
                mcpServer
            } )
        }
    } )
}

#processPaymentCycle( { stats, dataId, mcpServer } ) {
    // 1. Calculate transfers
    const { arrayOfTransfers } = PrivateShare.getArrayOfTransfers( { stats, distribution, totalAmount, serverMainAddress } )
    
    // 2. Generate and send transaction proof
    const { transactionProof } = PrivateShare.generateRecursiveTransactionProof( { arrayOfTransfers } )
    const { txHash, success } = PrivateShare.sendTransactionProof( { transactionProof } )
    
    // 3. Wait for confirmation
    const { confirmed } = PrivateShare.waitForConfirmation( { txHash, timeout: 300000 } )
    
    // 4. Send finished response to unlock MCP server
    if( confirmed ) {
        await PrivateShare.sendFinishedResponse( { 
            serverUrl: `${mcpServer.url}/finished`,
            method: 'POST',
            header: { 'Authorization': `Bearer ${mcpServer.token}` },
            dataId
        } )
    }
}
```

## Data Structures

### Method ID Format (Strictly follow!)
```javascript
// Method-ID-Generierung: routePath + "__" + methodName.toUpperCase()
// Beispiel: "/privateShare" + "__" + "getAllPrices_dune" → "PRIVATESHARE__GETALLPRICES_DUNE"

// Transformation rules:
// 1. routePath: Remove "/" at beginning, then .toUpperCase()  
// 2. methodName: Remove "tools/" prefix, then .toUpperCase()
// 3. Connect with "__" (double underscore)
```

### Stats Object (from MCP Server)
```javascript
{
    stats: {
        'PRIVATESHARE__GETALLPRICES_DUNE': 45,    // Tool-Call-Count
        'PRIVATESHARE__GETWEATHER_API': 30,
        'PRIVATESHARE__SENTIMENT_ANALYSIS': 25
    },
    unixFrom: 1705123200,        // Period start
    unixTo: 1705126800,          // Period end  
    dataId: "1234567890"         // Unique ID for MCP response
}
```

### Distribution Object
```javascript
{
    type: 'fair',               // Fair distribution (only supported type)
    minimumAmount: '0.01'       // Minimum payout in USDC
}
```

### Transfer Object
```javascript
{
    methodId: "PRIVATESHARE__GETALLPRICES_DUNE",
    fromAddress: "0xServerMainAddress...",    // Server's Haupt-Wallet
    toAddress: "0x123...",                    // Generiert aus methodId
    amount: "4.50"                            // Klartext-Betrag für Proof-Generation
}
```

### Transaction Proof Object
```javascript
{
    batchProof: "0xproof...",        // eERC-20 ZK-Batch-Proof
    transfers: [...],                // Array der Transfer-Objects
    totalAmount: "10.00",            // Total amount
    timestamp: 1705123200,           // Transaction timestamp
    nonce: "unique_nonce_123"        // Replay protection
}
```

## Environment Variables

```bash
# Core Configuration
SERVER_MAIN_ADDRESS=0xMainServerAddress...
SERVER_MAIN_PRIVATE_KEY=0xPrivateKeyForMainAddress...
SERVER_SECRET=secret_for_method_address_generation

# MCP Integration  
MCP_API_TOKEN=bearer_token_for_mcp_servers

# eERC-20 Configuration  
EERC_CONTRACT_ADDRESS=0xEERC20ContractAddress...
BASE_RPC_URL=https://base-mainnet.g.alchemy.com/v2/your_key
```

## Integration with eERC-20

### SDK Alternative Implementation
```javascript
// IMPORTANT: @avalabs/eerc-sdk is not trustworthy due to lack of support
// Weeks-long wait times for responses, therefore own implementation
// Based on @avalabs/eerc-sdk code as foundation, but completely independent

// Focus on needed methods:
// - Encryption/Decryption of amounts
// - ZK proof generation for batch transfers  
// - Balance queries with encrypted values
// - Registration management
```

### Proof Generation Flow
```javascript
// 1. Transfer array with plaintext amounts
// 2. Encryption of amounts with recipient public keys
// 3. ZK proof generation for batch transfer
// 4. Transaction broadcasting to Base L2
// 5. Event monitoring for confirmation
```

## Testing Strategy

### Manual Tests
```javascript
// tests/manual/0-test.mjs
// Test basic functionality
```

### Jest Tests (planned)
```javascript
// Complete coverage of all public methods
// Mocking for blockchain interactions  
// Integration tests for MCP communication
```

---

**Status**: 🚧 Specification complete, implementation pending  
**Version**: 0.1.0