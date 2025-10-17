"""
Multi-Chain Activity Monitor
Runs all chain monitoring agents and webhook servers simultaneously
"""

import asyncio
import uvicorn
from fastapi import FastAPI, Request
import sys
import os
from pathlib import Path
import json
from datetime import datetime
from uagents import Agent, Context
import threading
from concurrent.futures import ThreadPoolExecutor

# Create FastAPI app
app = FastAPI()

# Global variables for transaction files
TRANSACTIONS_FILES = {
    "sepolia": "pending_transactions.json",
    "bnb": "chains/bnb/bnb_transactions.json",
    "optimism": "chains/optimism/optimism_transactions.json"
}

# Wallet addresses
WALLET_ADDRESSES = {
    "sepolia": "0xdB630944101765cfb1f6836AE7579Eee1cdBbCBC",
    "bnb": "0xdB630944101765cfb1f6836AE7579Eee1cdBbCBC",
    "optimism": "0xdB630944101765cfb1f6836AE7579Eee1cdBbCBC"
}

# Create agents
agents = {
    "sepolia": Agent(name="sepolia_monitor", seed="sepolia_seed", port=8001),
    "bnb": Agent(name="bnb_monitor", seed="bnb_seed", port=8002),
    "optimism": Agent(name="optimism_monitor", seed="optimism_seed", port=8003)
}
    
# Add rate limiting
from datetime import datetime, timedelta
last_processed_time = datetime.now()
MIN_INTERVAL = 2  # minimum seconds between processing

# Single webhook endpoint for all chains
@app.post("/webhook")
async def universal_webhook(request: Request):
    """
    Universal webhook that can handle transactions from any chain
    We'll determine the chain type from the transaction data
    """
    global last_processed_time
    
    try:
        # Rate limiting
        current_time = datetime.now()
        time_diff = (current_time - last_processed_time).total_seconds()
        if time_diff < MIN_INTERVAL:
            return {"status": "throttled", "message": "Request too frequent"}
        
        last_processed_time = current_time
        
        webhook_data = await request.json()
        total_txs = 0
        
        # Count total transactions
        if "data" in webhook_data and isinstance(webhook_data["data"], list):
            for batch in webhook_data["data"]:
                if isinstance(batch, list):
                    total_txs += len(batch)
        
        # Detect which chain based on transaction data
        chain = "sepolia"  # default to sepolia
        if "data" in webhook_data and isinstance(webhook_data["data"], list):
            for batch in webhook_data["data"]:
                if isinstance(batch, list) and len(batch) > 0:
                    tx = batch[0]
                    # Check for BNB specific fields
                    if "chainId" in tx and tx["chainId"] == "0x38":
                        chain = "bnb"
                    # Check for Optimism specific fields
                    elif "l1Fee" in tx or "l1GasUsed" in tx:
                        chain = "optimism"
        
        print(f"\n{'='*50}")
        print(f"⏰ Time: {current_time.strftime('%Y-%m-%d %H:%M:%S')}")
        print(f"🔗 Chain: {chain.upper()}")
        print(f"📦 Transactions in batch: {total_txs}")
        print(f"{'='*50}\n")
        
        return await process_webhook(request, chain)
    except Exception as e:
        print(f"❌ Error in universal webhook: {str(e)}")
        return {"status": "error", "message": str(e)}

async def process_webhook(request: Request, chain: str):
    """Generic webhook processor for all chains"""
    try:
        webhook_data = await request.json()
        print(f"� Received {chain.upper()} webhook data")
        
        transactions = []
        if "data" in webhook_data and isinstance(webhook_data["data"], list):
            for batch in webhook_data["data"]:
                if isinstance(batch, list):
                    for receipt in batch:
                        if isinstance(receipt, dict):
                            tx = {
                                "hash": receipt.get("transactionHash", ""),
                                "blockNumber": receipt.get("blockNumber", ""),
                                "from": receipt.get("from", ""),
                                "to": receipt.get("to", ""),
                                "value": receipt.get("value", "0"),
                                "timestamp": datetime.now().isoformat(),
                                "raw_data": receipt
                            }
                            transactions.append(tx)
        
        # Save transactions to chain-specific file
        file_path = TRANSACTIONS_FILES[chain]
        existing_transactions = []
        if os.path.exists(file_path):
            try:
                with open(file_path, 'r') as f:
                    existing_transactions = json.load(f)
            except:
                existing_transactions = []
        
        existing_transactions.extend(transactions)
        if len(existing_transactions) > 100:
            existing_transactions = existing_transactions[-100:]
        
        with open(file_path, 'w') as f:
            json.dump(existing_transactions, f, indent=2)
        
        print(f"💾 Stored {len(transactions)} {chain.upper()} transactions")
        return {"status": "ok", "transactions_stored": len(transactions)}
    
    except Exception as e:
        print(f"❌ Error processing {chain.upper()} webhook: {str(e)}")
        return {"status": "error", "message": str(e)}

# Agent monitoring function
async def check_wallet_activity(ctx: Context, chain: str):
    """Generic wallet activity checker for all chains"""
    processed_tx = ctx.storage.get("processed_tx") or []
    
    file_path = TRANSACTIONS_FILES[chain]
    tx_list = []
    if os.path.exists(file_path):
        try:
            with open(file_path, 'r') as f:
                tx_list = json.load(f)
        except Exception as e:
            ctx.logger.error(f"Error reading {chain} transactions file: {e}")
            return
    
    if not tx_list:
        return
    
    ctx.logger.info(f"📊 Checking {len(tx_list)} {chain.upper()} transactions...")
    
    for tx in tx_list:
        tx_hash = tx.get("hash")
        if not tx_hash or tx_hash in processed_tx:
            continue
        
        from_address = (tx.get("from") or "").lower()
        to_address = (tx.get("to") or "").lower()
        monitored_lower = WALLET_ADDRESSES[chain].lower()
        
        if from_address == monitored_lower or to_address == monitored_lower:
            timestamp = tx.get("timestamp") or datetime.now().isoformat()
            
            if from_address == monitored_lower:
                ctx.logger.info(f"↗️ OUTGOING {chain.upper()} transaction!")
                ctx.logger.info(f"   From: {WALLET_ADDRESSES[chain]}")
                ctx.logger.info(f"   To: {tx.get('to', 'unknown')}")
            else:
                ctx.logger.info(f"↙️ INCOMING {chain.upper()} transaction!")
                ctx.logger.info(f"   From: {tx.get('from', 'unknown')}")
                ctx.logger.info(f"   To: {WALLET_ADDRESSES[chain]}")
            
            ctx.logger.info(f"   Value: {tx.get('value', '0')}")
            ctx.logger.info(f"   Time: {timestamp}")
            ctx.logger.info(f"   Hash: {tx_hash[:20]}...")
            
            ctx.storage.set("last_active", timestamp)
            activity_count = ctx.storage.get("activity_count") or 0
            ctx.storage.set("activity_count", activity_count + 1)
        
        processed_tx.append(tx_hash)
    
    if len(processed_tx) > 200:
        processed_tx = processed_tx[-200:]
    ctx.storage.set("processed_tx", processed_tx)

# Register monitoring intervals for each chain
for chain, agent in agents.items():
    @agent.on_interval(period=5)
    async def check_chain(ctx: Context):
        await check_wallet_activity(ctx, chain)
    
    @agent.on_interval(period=30)
    async def status_update(ctx: Context):
        last_active = ctx.storage.get("last_active")
        activity_count = ctx.storage.get("activity_count") or 0
        
        if last_active:
            ctx.logger.info(f"� Monitoring {chain.upper()} wallet: {WALLET_ADDRESSES[chain]}")
            ctx.logger.info(f"🎯 Total activities detected: {activity_count}")
            ctx.logger.info(f"⏰ Last activity: {last_active}")
        else:
            ctx.logger.info(f"👀 Monitoring {chain.upper()} wallet: {WALLET_ADDRESSES[chain]} (No activity yet)")

def run_agent(agent):
    """Function to run an agent in a separate thread"""
    agent.run()

def start_monitoring():
    """Start all components of the monitoring system"""
    print("🚀 Starting Multi-Chain Monitoring System")
    print("----------------------------------------")
    
    # Start agents in separate threads
    agent_threads = []
    for chain, agent in agents.items():
        thread = threading.Thread(target=run_agent, args=(agent,))
        thread.daemon = True
        thread.start()
        agent_threads.append(thread)
        print(f"✅ {chain.title()} agent started on port {agent._port}")
    
    # Start FastAPI server
    print("\n� Starting webhook servers...")
    uvicorn.run(app, host="0.0.0.0", port=3001)

if __name__ == "__main__":
    start_monitoring()

if __name__ == "__main__":
    start_monitoring()