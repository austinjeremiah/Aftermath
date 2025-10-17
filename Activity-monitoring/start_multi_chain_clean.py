"""
Multi-Chain Activity Monitor - Clean Version
Based on working Sepolia setup, runs all chains through one webhook endpoint
"""

from fastapi import FastAPI, Request
import json
import os
from datetime import datetime
from uagents import Agent, Context
import uvicorn
import threading
import time

# Create FastAPI app
app = FastAPI()

# Configuration for all chains
CHAIN_CONFIG = {
    "sepolia": {
        "file": "sepolia_transactions.json", 
        "wallet": "0xdB630944101765cfb1f6836AE7579Eee1cdBbCBC",
        "port": 8001
    },
    "bnb": {
        "file": "bnb_transactions.json", 
        "wallet": "0xdB630944101765cfb1f6836AE7579Eee1cdBbCBC",
        "port": 8002
    },
    "optimism": {
        "file": "optimism_transactions.json", 
        "wallet": "0xdB630944101765cfb1f6836AE7579Eee1cdBbCBC",
        "port": 8003
    }
}

# Create agents for each chain
agents = {}
for chain_name, config in CHAIN_CONFIG.items():
    agent = Agent(name=f"{chain_name}_monitor", seed=f"{chain_name}_seed", port=config["port"])
    agents[chain_name] = agent

# Currently active chain (will be detected from incoming data)
current_chain = "sepolia"

@app.post("/webhook")
async def webhook_receiver(request: Request):
    """
    Single webhook endpoint that handles all chains - just like the working Sepolia version
    """
    global current_chain
    
    try:
        webhook_data = await request.json()
        
        # Auto-detect chain type from transaction data
        detected_chain = "sepolia"  # default
        if "data" in webhook_data and isinstance(webhook_data["data"], list):
            for batch in webhook_data["data"]:
                if isinstance(batch, list) and len(batch) > 0:
                    sample_tx = batch[0]
                    # Simple chain detection logic
                    if isinstance(sample_tx, dict):
                        # Look for chain-specific fields
                        if sample_tx.get("chainId") == "0x38":  # BNB Chain
                            detected_chain = "bnb"
                        elif "l1Fee" in sample_tx or "l1GasUsed" in sample_tx:  # Optimism
                            detected_chain = "optimism"
        
        current_chain = detected_chain
        
        print(f"\n🔗 CHAIN DETECTED: {current_chain.upper()}")
        print(f"📥 Received webhook data from {current_chain.upper()}:")
        
        # Extract transactions (exactly like working Sepolia version)
        transactions = []
        if "data" in webhook_data and isinstance(webhook_data["data"], list):
            for batch in webhook_data["data"]:
                if isinstance(batch, list):
                    for receipt in batch:
                        if isinstance(receipt, dict):
                            tx = {
                                "hash": receipt.get("transactionHash", ""),
                                "blockNumber": receipt.get("blockNumber", ""),
                                "blockHash": receipt.get("blockHash", ""),
                                "from": receipt.get("from", ""),
                                "to": receipt.get("to", ""),
                                "contractAddress": receipt.get("contractAddress"),
                                "cumulativeGasUsed": receipt.get("cumulativeGasUsed", ""),
                                "effectiveGasPrice": receipt.get("effectiveGasPrice", ""),
                                "gasUsed": receipt.get("gasUsed", ""),
                                "status": receipt.get("status", ""),
                                "timestamp": datetime.now().isoformat(),
                                "raw_data": receipt
                            }
                            transactions.append(tx)
                            
                            # Show transaction info clearly
                            print(f"  📝 Tx: {tx['hash'][:15]}... | From: {tx['from'][:10]}... | To: {tx['to'][:10]}...")
        
        # Save to chain-specific file
        transactions_file = CHAIN_CONFIG[current_chain]["file"]
        existing_transactions = []
        if os.path.exists(transactions_file):
            try:
                with open(transactions_file, 'r') as f:
                    existing_transactions = json.load(f)
            except:
                existing_transactions = []
        
        existing_transactions.extend(transactions)
        if len(existing_transactions) > 100:
            existing_transactions = existing_transactions[-100:]
        
        with open(transactions_file, 'w') as f:
            json.dump(existing_transactions, f, indent=2)
        
        print(f"💾 Stored {len(transactions)} {current_chain.upper()} transactions")
        print("-" * 60)
        
        return {"status": "ok", "transactions_stored": len(transactions), "chain": current_chain}
    
    except Exception as e:
        print(f"❌ Error processing webhook: {str(e)}")
        return {"status": "error", "message": str(e)}

# Set up agent monitoring for each chain
def create_agent_functions(chain_name, config):
    """Create monitoring functions for each chain"""
    
    @agents[chain_name].on_interval(period=5)
    async def check_wallet_activity(ctx: Context):
        processed_tx = ctx.storage.get("processed_tx") or []
        
        tx_list = []
        if os.path.exists(config["file"]):
            try:
                with open(config["file"], 'r') as f:
                    tx_list = json.load(f)
            except Exception as e:
                ctx.logger.error(f"Error reading {chain_name} transactions: {e}")
                return
        
        if not tx_list:
            return
        
        ctx.logger.info(f"📊 Checking {len(tx_list)} {chain_name.upper()} transactions...")
        
        for tx in tx_list:
            tx_hash = tx.get("hash") or tx.get("blockHash") or None
            if not tx_hash or tx_hash in processed_tx:
                continue
            
            from_address = (tx.get("from") or "").lower()
            to_address = (tx.get("to") or "").lower()
            monitored_lower = config["wallet"].lower()
            
            if from_address == monitored_lower or to_address == monitored_lower:
                timestamp = tx.get("timestamp") or datetime.now().isoformat()
                block_number = tx.get("blockNumber", "unknown")
                
                if from_address == monitored_lower:
                    ctx.logger.info(f"🚀 OUTGOING {chain_name.upper()} transaction detected!")
                    ctx.logger.info(f"   From: {config['wallet']}")
                    ctx.logger.info(f"   To: {tx.get('to', 'unknown')}")
                else:
                    ctx.logger.info(f"📨 INCOMING {chain_name.upper()} transaction detected!")
                    ctx.logger.info(f"   From: {tx.get('from', 'unknown')}")
                    ctx.logger.info(f"   To: {config['wallet']}")
                
                ctx.logger.info(f"   Block: {block_number}")
                ctx.logger.info(f"   Time: {timestamp}")
                ctx.logger.info(f"   Hash: {tx_hash[:20]}...")
                
                ctx.storage.set("last_active", timestamp)
                activity_count = ctx.storage.get("activity_count") or 0
                ctx.storage.set("activity_count", activity_count + 1)
            
            processed_tx.append(tx_hash)
        
        if len(processed_tx) > 200:
            processed_tx = processed_tx[-200:]
        ctx.storage.set("processed_tx", processed_tx)
    
    @agents[chain_name].on_interval(period=30)
    async def status_update(ctx: Context):
        last_active = ctx.storage.get("last_active")
        activity_count = ctx.storage.get("activity_count") or 0
        
        if last_active:
            ctx.logger.info(f"📈 Monitoring {chain_name.upper()} wallet: {config['wallet']}")
            ctx.logger.info(f"🎯 Total activities detected: {activity_count}")
            ctx.logger.info(f"⏰ Last activity: {last_active}")
        else:
            ctx.logger.info(f"👀 Monitoring {chain_name.upper()} wallet: {config['wallet']} (No activity yet)")

# Create agent functions for all chains
for chain_name, config in CHAIN_CONFIG.items():
    create_agent_functions(chain_name, config)

def run_agent(agent):
    """Run agent in separate thread"""
    agent.run()

def start_monitoring():
    """Start the multi-chain monitoring system"""
    print("🚀 Starting Multi-Chain Wallet Monitor")
    print("=" * 50)
    print("Based on working Sepolia setup")
    print("All chains use same /webhook endpoint")
    print("=" * 50)
    
    # Start all agents in background threads
    for chain_name, agent in agents.items():
        thread = threading.Thread(target=run_agent, args=(agent,), daemon=True)
        thread.start()
        print(f"✅ {chain_name.upper()} agent started (port {CHAIN_CONFIG[chain_name]['port']})")
    
    print("\n📡 Starting webhook server on port 3001...")
    print("🎯 Monitoring wallet: 0xdB630944101765cfb1f6836AE7579Eee1cdBbCBC")
    print("📋 Use this webhook URL for ALL chains: https://your-ngrok-url/webhook")
    print("\nPress Ctrl+C to stop...\n")
    
    # Start the webhook server
    uvicorn.run(app, host="0.0.0.0", port=3001)

if __name__ == "__main__":
    start_monitoring()