from fastapi import FastAPI, Request
import json
import os
from datetime import datetime

app = FastAPI()

TRANSACTIONS_FILE = "bnb_transactions.json"

@app.post("/webhook")
async def webhook_receiver(request: Request):
    """
    Receives QuickNode BNB transaction JSON payloads and stores them for the agent to process.
    """
    try:
        webhook_data = await request.json()
        print(f"📥 Received BNB webhook data: {json.dumps(webhook_data, indent=2)}")

        # Extract transactions from the webhook data
        transactions = []

        # Handle QuickNode receipt stream format for BNB
        if "data" in webhook_data and isinstance(webhook_data["data"], list):
            for batch in webhook_data["data"]:
                if isinstance(batch, list):
                    # This is a batch of transaction receipts
                    for receipt in batch:
                        if isinstance(receipt, dict):
                            # Extract transaction info from receipt
                            tx = {
                                "hash": receipt.get("transactionHash", ""),
                                "blockNumber": receipt.get("blockNumber", ""),
                                "blockHash": receipt.get("blockHash", ""),
                                "from": receipt.get("from", ""),
                                "to": receipt.get("to", ""),
                                "value": receipt.get("value", "0"),
                                "contractAddress": receipt.get("contractAddress"),
                                "gasUsed": receipt.get("gasUsed", ""),
                                "status": receipt.get("status", ""),
                                "timestamp": datetime.now().isoformat(),
                                "raw_data": receipt  # Keep original data
                            }
                    transactions.append(tx)
        
        # Read existing transactions
        existing_transactions = []
        if os.path.exists(TRANSACTIONS_FILE):
            try:
                with open(TRANSACTIONS_FILE, 'r') as f:
                    existing_transactions = json.load(f)
            except:
                existing_transactions = []
        
        # Add new transactions
        existing_transactions.extend(transactions)
        
        # Keep only last 100 transactions
        if len(existing_transactions) > 100:
            existing_transactions = existing_transactions[-100:]
        
        # Save back to file
        with open(TRANSACTIONS_FILE, 'w') as f:
            json.dump(existing_transactions, f, indent=2)

        print(f"💾 Stored {len(transactions)} BNB transactions")
        return {"status": "ok", "transactions_stored": len(transactions)}
    
    except Exception as e:
        print(f" Error processing BNB webhook: {str(e)}")
        return {"status": "error", "message": str(e)}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=3001)