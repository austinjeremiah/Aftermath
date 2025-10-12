"""
Startup script to run both the webhook server and the monitoring agent
"""

import subprocess
import sys
import time
import os
from threading import Thread

def run_webhook_server():
    """Run the FastAPI webhook server"""
    print("🌐 Starting webhook server on port 3001...")
    subprocess.run([sys.executable, "webhook_server.py"])

def run_agent():
    """Run the monitoring agent"""
    print("🤖 Starting monitoring agent...")
    time.sleep(2)  # Wait a bit for webhook server to start
    subprocess.run([sys.executable, "agent.py"])

if __name__ == "__main__":
    print("🚀 Starting LifeLink Wallet Activity Monitor...")
    print(f"📂 Working directory: {os.getcwd()}")
    
    # Start webhook server in background thread
    webhook_thread = Thread(target=run_webhook_server, daemon=True)
    webhook_thread.start()
    
    # Start agent in main thread
    try:
        run_agent()
    except KeyboardInterrupt:
        print("\n⏹️  Shutting down monitoring system...")
        sys.exit(0)