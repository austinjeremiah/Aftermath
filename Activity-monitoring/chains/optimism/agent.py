"""
LifeLink Agent — Optimism Wallet Activity Monitor
Monitors transactions for an Optimism Sepolia wallet using QuickNode webhook data.
"""

from uagents import Agent, Context
import json
import os
from datetime import datetime

agent = Agent(name="optimism_wallet_monitor", seed="optimism_wallet_monitor_seed", port=8003)

# Replace with your monitored Optimism wallet
MONITORED_WALLET = "0xdB630944101765cfb1f6836AE7579Eee1cdBbCBC"
TRANSACTIONS_FILE = "optimism_transactions.json"

@agent.on_interval(period=5)  # check every 5 seconds
async def check_wallet_activity(ctx: Context):
    """
    Check if monitored Optimism wallet has any recent transactions
    """
    # Get processed transaction hashes from agent storage
    processed_tx = ctx.storage.get("processed_tx") or []
    
    # Read transactions from file
    tx_list = []
    if os.path.exists(TRANSACTIONS_FILE):
        try:
            with open(TRANSACTIONS_FILE, 'r') as f:
                tx_list = json.load(f)
        except Exception as e:
            ctx.logger.error(f"Error reading Optimism transactions file: {e}")
            return
    
    if not tx_list:
        return
    
    ctx.logger.info(f"📊 Checking {len(tx_list)} Optimism transactions...")
    
    for tx in tx_list:
        tx_hash = tx.get("hash") or tx.get("blockHash") or None
        if not tx_hash or tx_hash in processed_tx:
            continue  # skip already processed tx
        
        # Check if transaction involves our monitored wallet
        from_address = (tx.get("from") or "").lower()
        to_address = (tx.get("to") or "").lower()
        monitored_lower = MONITORED_WALLET.lower()
        
        if from_address == monitored_lower or to_address == monitored_lower:
            timestamp = tx.get("timestamp") or datetime.now().isoformat()
            block_number = tx.get("blockNumber", "unknown")
            l1_fee = tx.get("l1Fee", "unknown")
            
            if from_address == monitored_lower:
                ctx.logger.info(f"↗️ OUTGOING Optimism transaction detected!")
                ctx.logger.info(f"   From: {MONITORED_WALLET}")
                ctx.logger.info(f"   To: {tx.get('to', 'unknown')}")
            else:
                ctx.logger.info(f"↙️ INCOMING Optimism transaction detected!")
                ctx.logger.info(f"   From: {tx.get('from', 'unknown')}")
                ctx.logger.info(f"   To: {MONITORED_WALLET}")
            
            ctx.logger.info(f"   Block: {block_number}")
            ctx.logger.info(f"   L1 Fee: {l1_fee}")
            ctx.logger.info(f"   Time: {timestamp}")
            ctx.logger.info(f"   Hash: {tx_hash[:20]}...")
            
            # Store activity info
            ctx.storage.set("last_active", timestamp)
            activity_count = ctx.storage.get("activity_count") or 0
            ctx.storage.set("activity_count", activity_count + 1)
        
        # Mark transaction as processed
        processed_tx.append(tx_hash)
    
    # Store processed transaction hashes (keep only last 200)
    if len(processed_tx) > 200:
        processed_tx = processed_tx[-200:]
    ctx.storage.set("processed_tx", processed_tx)

@agent.on_interval(period=30)  # status update every 30 seconds  
async def status_update(ctx: Context):
    """
    Print status information
    """
    last_active = ctx.storage.get("last_active")
    activity_count = ctx.storage.get("activity_count") or 0
    
    if last_active:
        ctx.logger.info(f"📈 Monitoring Optimism wallet: {MONITORED_WALLET}")
        ctx.logger.info(f"🎯 Total activities detected: {activity_count}")
        ctx.logger.info(f"⏰ Last activity: {last_active}")
    else:
        ctx.logger.info(f"👀 Monitoring Optimism wallet: {MONITORED_WALLET} (No activity yet)")

if __name__ == "__main__":
    agent.run()