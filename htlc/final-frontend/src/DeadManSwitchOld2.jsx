import React, { useState } from 'react';
import { ethers } from 'ethers';
import {
  PushUniversalWalletProvider,
  PushUniversalAccountButton,
  usePushWalletContext,
  usePushChainClient,
  usePushChain,
  PushUI,
} from '@pushchain/ui-kit';
import axios from 'axios';
import './DeadManSwitch.css';

function DeadManSwitchApp() {
  const walletConfig = {
    network: PushUI.CONSTANTS.PUSH_NETWORK.TESTNET,
  };

  const DEADMAN_SWITCH_ABI = [
    {
      "inputs": [
        {"internalType": "address", "name": "_receiver", "type": "address"},
        {"internalType": "uint256", "name": "_inactivityPeriod", "type": "uint256"}
      ],
      "name": "deposit",
      "outputs": [{"internalType": "bytes32", "name": "lockId", "type": "bytes32"}],
      "stateMutability": "payable",
      "type": "function"
    },
    {
      "inputs": [{"internalType": "bytes32", "name": "_lockId", "type": "bytes32"}],
      "name": "updateActivity",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {"internalType": "bytes32", "name": "_lockId", "type": "bytes32"},
        {"internalType": "uint256", "name": "_senderLastTxTimestamp", "type": "uint256"}
      ],
      "name": "releaseFunds",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [{"internalType": "bytes32", "name": "_lockId", "type": "bytes32"}],
      "name": "cancelLock",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {"internalType": "bytes32", "name": "_lockId", "type": "bytes32"},
        {"internalType": "uint256", "name": "_senderLastTxTimestamp", "type": "uint256"}
      ],
      "name": "getDeadLock",
      "outputs": [
        {"internalType": "address", "name": "sender", "type": "address"},
        {"internalType": "address", "name": "receiver", "type": "address"},
        {"internalType": "uint256", "name": "amount", "type": "uint256"},
        {"internalType": "uint256", "name": "lastActivityTime", "type": "uint256"},
        {"internalType": "uint256", "name": "inactivityPeriod", "type": "uint256"},
        {"internalType": "bool", "name": "fundsReleased", "type": "bool"},
        {"internalType": "bool", "name": "cancelled", "type": "bool"},
        {"internalType": "string", "name": "senderChain", "type": "string"},
        {"internalType": "string", "name": "receiverChain", "type": "string"}
      ],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [{"internalType": "bytes32", "name": "_lockId", "type": "bytes32"}],
      "name": "getDeadLockView",
      "outputs": [
        {"internalType": "address", "name": "sender", "type": "address"},
        {"internalType": "address", "name": "receiver", "type": "address"},
        {"internalType": "uint256", "name": "amount", "type": "uint256"},
        {"internalType": "uint256", "name": "lastActivityTime", "type": "uint256"},
        {"internalType": "uint256", "name": "inactivityPeriod", "type": "uint256"},
        {"internalType": "bool", "name": "fundsReleased", "type": "bool"},
        {"internalType": "bool", "name": "cancelled", "type": "bool"},
        {"internalType": "string", "name": "senderChain", "type": "string"},
        {"internalType": "string", "name": "receiverChain", "type": "string"}
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {"internalType": "bytes32", "name": "_lockId", "type": "bytes32"},
        {"internalType": "uint256", "name": "_senderLastTxTimestamp", "type": "uint256"}
      ],
      "name": "isEligibleForRelease",
      "outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [{"internalType": "bytes32", "name": "_lockId", "type": "bytes32"}],
      "name": "isEligibleForReleaseView",
      "outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {"internalType": "bytes32", "name": "_lockId", "type": "bytes32"},
        {"internalType": "uint256", "name": "_senderLastTxTimestamp", "type": "uint256"}
      ],
      "name": "getTimeUntilRelease",
      "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [{"internalType": "bytes32", "name": "_lockId", "type": "bytes32"}],
      "name": "getTimeUntilReleaseView",
      "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {"internalType": "bytes32", "name": "_lockId", "type": "bytes32"},
        {"internalType": "uint256", "name": "_senderLastTxTimestamp", "type": "uint256"}
      ],
      "name": "getTimeSinceLastActivity",
      "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [{"internalType": "bytes32", "name": "_lockId", "type": "bytes32"}],
      "name": "getTimeSinceLastActivityView",
      "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {"internalType": "bytes32", "name": "_lockId", "type": "bytes32"},
        {"internalType": "uint256", "name": "_senderLastTxTimestamp", "type": "uint256"}
      ],
      "name": "simulateActivityUpdate",
      "outputs": [
        {"internalType": "uint256", "name": "newActivityTime", "type": "uint256"},
        {"internalType": "bool", "name": "wouldUpdate", "type": "bool"}
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [{"internalType": "address", "name": "_user", "type": "address"}],
      "name": "getUserLocks",
      "outputs": [{"internalType": "bytes32[]", "name": "", "type": "bytes32[]"}],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "getContractBalance",
      "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "anonymous": false,
      "inputs": [
        {"indexed": true, "internalType": "bytes32", "name": "lockId", "type": "bytes32"},
        {"indexed": true, "internalType": "address", "name": "sender", "type": "address"},
        {"indexed": true, "internalType": "address", "name": "receiver", "type": "address"},
        {"indexed": false, "internalType": "uint256", "name": "amount", "type": "uint256"},
        {"indexed": false, "internalType": "uint256", "name": "inactivityPeriod", "type": "uint256"},
        {"indexed": false, "internalType": "uint256", "name": "lastActivityTime", "type": "uint256"},
        {"indexed": false, "internalType": "string", "name": "senderChain", "type": "string"}
      ],
      "name": "DeadLockCreated",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {"indexed": true, "internalType": "bytes32", "name": "lockId", "type": "bytes32"},
        {"indexed": true, "internalType": "address", "name": "sender", "type": "address"},
        {"indexed": false, "internalType": "uint256", "name": "newActivityTime", "type": "uint256"},
        {"indexed": false, "internalType": "string", "name": "updateChain", "type": "string"},
        {"indexed": false, "internalType": "bool", "name": "autoUpdated", "type": "bool"}
      ],
      "name": "ActivityUpdated",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {"indexed": true, "internalType": "bytes32", "name": "lockId", "type": "bytes32"},
        {"indexed": true, "internalType": "address", "name": "receiver", "type": "address"},
        {"indexed": false, "internalType": "uint256", "name": "amount", "type": "uint256"},
        {"indexed": false, "internalType": "string", "name": "releaseChain", "type": "string"}
      ],
      "name": "FundsReleased",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {"indexed": true, "internalType": "bytes32", "name": "lockId", "type": "bytes32"},
        {"indexed": true, "internalType": "address", "name": "sender", "type": "address"},
        {"indexed": false, "internalType": "uint256", "name": "amount", "type": "uint256"},
        {"indexed": false, "internalType": "string", "name": "cancelChain", "type": "string"}
      ],
      "name": "LockCancelled",
      "type": "event"
    }
  ];

  const CONTRACT_ADDRESS = '0x1B7266696133D1B2063373e960e7F39393B3C81A';

  function Component() {
    const { connectionStatus } = usePushWalletContext();
    const { pushChainClient } = usePushChainClient();
    const { PushChain } = usePushChain();

    const [activeTab, setActiveTab] = useState('create');
    const [isLoading, setIsLoading] = useState(false);
    const [txHash, setTxHash] = useState('');
    const [statusMessage, setStatusMessage] = useState('');

    const [receiverAddress, setReceiverAddress] = useState('');
    const [amount, setAmount] = useState('');
    const [inactivityPeriod, setInactivityPeriod] = useState('5184000');
    const [createdLockId, setCreatedLockId] = useState('');

    const [updateLockId, setUpdateLockId] = useState('');
    const [releaseLockId, setReleaseLockId] = useState('');
    const [cancelLockId, setCancelLockId] = useState('');

    const [viewLockId, setViewLockId] = useState('');
    const [lockDetails, setLockDetails] = useState(null);
    const [timeUntilRelease, setTimeUntilRelease] = useState(null);
    const [timeSinceActivity, setTimeSinceActivity] = useState(null);
    const [walletActivityInfo, setWalletActivityInfo] = useState(null);

    const [userLocks, setUserLocks] = useState([]);
    const [activityCheckStatus, setActivityCheckStatus] = useState('');

    const getLastWalletActivity = async (address) => {
      try {
        const apiKey = "95E2VDJW1M1ZC6BXVBXDN5WAG9Z3TSV1AY";
        const url = `https://api.etherscan.io/api?module=account&action=txlist&address=${address}&sort=desc&apikey=${apiKey}`;

        const res = await axios.get(url);

        if (res.data.status === "1" && res.data.result.length > 0) {
          const latestTx = res.data.result[0];
          const lastTxTime = parseInt(latestTx.timeStamp);
          return {
            timestamp: lastTxTime,
            date: new Date(lastTxTime * 1000).toLocaleString(),
            found: true
          };
        } else {
          return { timestamp: 0, found: false, message: "No transactions found" };
        }
      } catch (error) {
        console.error("Error fetching wallet activity:", error);
        return { timestamp: 0, found: false, message: error.message };
      }
    };

    const formatDuration = (seconds) => {
      const days = Math.floor(seconds / 86400);
      const hours = Math.floor((seconds % 86400) / 3600);
      const mins = Math.floor((seconds % 3600) / 60);
      const secs = seconds % 60;

      const parts = [];
      if (days > 0) parts.push(`${days}d`);
      if (hours > 0) parts.push(`${hours}h`);
      if (mins > 0) parts.push(`${mins}m`);
      if (secs > 0 || parts.length === 0) parts.push(`${secs}s`);

      return parts.join(' ');
    };

    const handleCreateLock = async () => {
      if (!pushChainClient) {
        setStatusMessage('Please connect your wallet first');
        return;
      }

      if (!receiverAddress || !amount || !inactivityPeriod) {
        setStatusMessage('Please fill all fields');
        return;
      }

      try {
        setIsLoading(true);
        setStatusMessage('Creating Dead Man Switch...');

        const amountInWei = ethers.parseEther(amount);
        
        const iface = new ethers.Interface(DEADMAN_SWITCH_ABI);
        const encodedData = iface.encodeFunctionData('deposit', [
          receiverAddress, 
          parseInt(inactivityPeriod)
        ]);

        const tx = await pushChainClient.universal.sendTransaction({
          to: CONTRACT_ADDRESS,
          data: encodedData,
          value: amountInWei,
        });

        setTxHash(tx.hash);
        setStatusMessage('Transaction submitted. Waiting for confirmation...');

        const receipt = await tx.wait();
        
        const provider = new ethers.JsonRpcProvider('https://evm.rpc-testnet-donut-node1.push.org/');
        const contract = new ethers.Contract(CONTRACT_ADDRESS, DEADMAN_SWITCH_ABI, provider);
        const iface2 = contract.interface;
        
        for (const log of receipt.logs) {
          try {
            const parsed = iface2.parseLog(log);
            if (parsed.name === 'DeadLockCreated') {
              setCreatedLockId(parsed.args.lockId);
              setStatusMessage(`Dead Man Switch Created! Lock ID: ${parsed.args.lockId}`);
              break;
            }
          } catch (e) {
            continue;
          }
        }

        setIsLoading(false);
      } catch (err) {
        console.error('Create lock error:', err);
        setStatusMessage(`Error: ${err.message}`);
        setIsLoading(false);
      }
    };

    const handleUpdateActivity = async () => {
      if (!pushChainClient) {
        setStatusMessage('Please connect your wallet first');
        return;
      }

      if (!updateLockId) {
        setStatusMessage('Please enter lock ID');
        return;
      }

      try {
        setIsLoading(true);
        setStatusMessage('Updating activity...');

        const iface = new ethers.Interface(DEADMAN_SWITCH_ABI);
        const encodedData = iface.encodeFunctionData('updateActivity', [updateLockId]);

        const tx = await pushChainClient.universal.sendTransaction({
          to: CONTRACT_ADDRESS,
          data: encodedData,
          value: BigInt(0),
        });

        setTxHash(tx.hash);
        setStatusMessage('Transaction submitted. Waiting for confirmation...');

        await tx.wait();
        setStatusMessage('Activity updated successfully! Timer has been reset.');
        setIsLoading(false);
      } catch (err) {
        console.error('Update activity error:', err);
        setStatusMessage(`Error: ${err.message}`);
        setIsLoading(false);
      }
    };

    const handleReleaseFunds = async () => {
      if (!pushChainClient) {
        setStatusMessage('Please connect your wallet first');
        return;
      }

      if (!releaseLockId) {
        setStatusMessage('Please enter lock ID');
        return;
      }

      try {
        setIsLoading(true);
        setActivityCheckStatus('Checking sender wallet activity...');
        setStatusMessage('Preparing to release funds...');

        const provider = new ethers.JsonRpcProvider('https://evm.rpc-testnet-donut-node1.push.org/');
        const contract = new ethers.Contract(CONTRACT_ADDRESS, DEADMAN_SWITCH_ABI, provider);
        
        const lockDetailsView = await contract.getDeadLockView(releaseLockId);
        const senderAddress = lockDetailsView[0];

        const activity = await getLastWalletActivity(senderAddress);
        
        if (activity.found) {
          setActivityCheckStatus(`✅ Found wallet activity: ${activity.date}`);
          setWalletActivityInfo(activity);
        } else {
          setActivityCheckStatus('⚠️ No wallet activity found, using existing lock time');
          setWalletActivityInfo(null);
        }

        setStatusMessage('Releasing funds with activity check...');

        const iface = new ethers.Interface(DEADMAN_SWITCH_ABI);
        const encodedData = iface.encodeFunctionData('releaseFunds', [
          releaseLockId,
          activity.found ? activity.timestamp : 0
        ]);

        const tx = await pushChainClient.universal.sendTransaction({
          to: CONTRACT_ADDRESS,
          data: encodedData,
          value: BigInt(0),
        });

        setTxHash(tx.hash);
        setStatusMessage('Transaction submitted. Waiting for confirmation...');

        await tx.wait();
        setStatusMessage('Funds released successfully to receiver!');
        setActivityCheckStatus('');
        setIsLoading(false);
      } catch (err) {
        console.error('Release funds error:', err);
        setStatusMessage(`Error: ${err.message}`);
        setActivityCheckStatus('');
        setIsLoading(false);
      }
    };

    const handleCancelLock = async () => {
      if (!pushChainClient) {
        setStatusMessage('Please connect your wallet first');
        return;
      }

      if (!cancelLockId) {
        setStatusMessage('Please enter lock ID');
        return;
      }

      try {
        setIsLoading(true);
        setStatusMessage('Cancelling lock...');

        const iface = new ethers.Interface(DEADMAN_SWITCH_ABI);
        const encodedData = iface.encodeFunctionData('cancelLock', [cancelLockId]);

        const tx = await pushChainClient.universal.sendTransaction({
          to: CONTRACT_ADDRESS,
          data: encodedData,
          value: BigInt(0),
        });

        setTxHash(tx.hash);
        setStatusMessage('Transaction submitted. Waiting for confirmation...');

        await tx.wait();
        setStatusMessage('Lock cancelled successfully! Funds returned to sender.');
        setIsLoading(false);
      } catch (err) {
        console.error('Cancel lock error:', err);
        setStatusMessage(`Error: ${err.message}`);
        setIsLoading(false);
      }
    };

    const handleViewLock = async () => {
      if (!viewLockId) {
        setStatusMessage('Please enter lock ID');
        return;
      }

      try {
        setIsLoading(true);
        setActivityCheckStatus('Checking wallet activity...');
        setStatusMessage('Fetching lock details...');

        const provider = new ethers.JsonRpcProvider('https://evm.rpc-testnet-donut-node1.push.org/');
        const contract = new ethers.Contract(CONTRACT_ADDRESS, DEADMAN_SWITCH_ABI, provider);

        const lockDetailsView = await contract.getDeadLockView(viewLockId);
        const senderAddress = lockDetailsView[0];

        const activity = await getLastWalletActivity(senderAddress);
        
        if (activity.found) {
          setActivityCheckStatus(`✅ Wallet activity found: ${activity.date}`);
          setWalletActivityInfo(activity);
          
          const simulation = await contract.simulateActivityUpdate(viewLockId, activity.timestamp);
          if (simulation.wouldUpdate) {
            setActivityCheckStatus(`✅ Activity will auto-update to: ${new Date(Number(simulation.newActivityTime) * 1000).toLocaleString()}`);
          } else {
            setActivityCheckStatus('ℹ️ Activity timestamp is not newer, no update needed');
          }
        } else {
          setActivityCheckStatus('⚠️ No wallet activity found, showing current lock state');
          setWalletActivityInfo(null);
        }

        // Use view-only functions (no transaction needed)
        const details = await contract.getDeadLockView(viewLockId);
        const timeUntil = await contract.getTimeUntilReleaseView(viewLockId);
        const timeSince = await contract.getTimeSinceLastActivityView(viewLockId);

        setLockDetails({
          sender: details[0],
          receiver: details[1],
          amount: ethers.formatEther(details[2]),
          lastActivityTime: new Date(Number(details[3]) * 1000).toLocaleString(),
          inactivityPeriod: Number(details[4]),
          fundsReleased: details[5],
          cancelled: details[6],
          senderChain: details[7],
          receiverChain: details[8]
        });

        setTimeUntilRelease(Number(timeUntil));
        setTimeSinceActivity(Number(timeSince));
        setStatusMessage('Lock details fetched successfully (with auto-activity check)');
        setIsLoading(false);
      } catch (err) {
        console.error('View lock error:', err);
        setStatusMessage(`Error: ${err.message}`);
        setActivityCheckStatus('');
        setIsLoading(false);
      }
    };

    const handleFetchUserLocks = async () => {
      if (!pushChainClient) {
        setStatusMessage('Please connect your wallet first');
        return;
      }

      try {
        setIsLoading(true);
        setStatusMessage('Fetching your locks...');

        const provider = new ethers.JsonRpcProvider('https://evm.rpc-testnet-donut-node1.push.org/');
        const contract = new ethers.Contract(CONTRACT_ADDRESS, DEADMAN_SWITCH_ABI, provider);

        const userAddress = await pushChainClient.universal.getAddress();
        const locks = await contract.getUserLocks(userAddress);

        const locksWithDetails = await Promise.all(
          locks.map(async (lockId) => {
            try {
              const details = await contract.getDeadLockView(lockId);
              const timeUntil = await contract.getTimeUntilReleaseView(lockId);
              
              return {
                lockId: lockId,
                receiver: details[1],
                amount: ethers.formatEther(details[2]),
                fundsReleased: details[5],
                cancelled: details[6],
                timeUntilRelease: Number(timeUntil)
              };
            } catch (e) {
              return null;
            }
          })
        );

        setUserLocks(locksWithDetails.filter(l => l !== null));
        setStatusMessage(`Found ${locksWithDetails.filter(l => l !== null).length} locks`);
        setIsLoading(false);
      } catch (err) {
        console.error('Fetch user locks error:', err);
        setStatusMessage(`Error: ${err.message}`);
        setIsLoading(false);
      }
    };

    return (
      <div className="app-container">
        <div className="header">
          <h1>⚡ Dead Man Switch</h1>
          <p>Secure Legacy & Inheritance Protocol with Auto-Activity Tracking</p>
          <PushUniversalAccountButton />
        </div>

        {connectionStatus !== PushUI.CONSTANTS.CONNECTION.STATUS.CONNECTED && (
          <div className="connect-warning">
            <p>⚠️ Please connect your wallet to interact with Dead Man Switch</p>
          </div>
        )}

        <div className="tabs-container">
          <div className="tabs">
            {['create', 'ping', 'release', 'cancel', 'view', 'my-locks'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`tab-button ${activeTab === tab ? 'active' : ''}`}
              >
                {tab === 'my-locks' ? 'My Locks' : tab}
              </button>
            ))}
          </div>
        </div>

        {activeTab === 'create' && (
          <div className="tab-content">
            <h3>🔒 Create New Dead Man Switch</h3>
            
            <div className="info-box blue">
              <p>
                <strong>Auto-Activity Tracking:</strong> Your wallet activity is automatically monitored! When viewing or releasing funds, the system checks your latest on-chain transaction and updates the timer accordingly - no manual pinging needed!
              </p>
            </div>

            <div className="form-group">
              <label className="form-label">Beneficiary Address:</label>
              <input
                type="text"
                value={receiverAddress}
                onChange={(e) => setReceiverAddress(e.target.value)}
                placeholder="0x... (who receives funds if you're inactive)"
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Amount (PUSH):</label>
              <input
                type="text"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="10.0"
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Inactivity Period:</label>
              <select
                value={inactivityPeriod}
                onChange={(e) => setInactivityPeriod(e.target.value)}
                className="form-select"
              >
                <option value="300">5 minutes (testing)</option>
                <option value="3600">1 hour (testing)</option>
                <option value="86400">1 day</option>
                <option value="604800">7 days</option>
                <option value="2592000">30 days</option>
                <option value="5184000">60 days</option>
                <option value="7776000">90 days</option>
                <option value="15552000">180 days</option>
                <option value="31536000">1 year</option>
              </select>
              <small className="form-hint">
                Funds transfer to beneficiary if you don't have any wallet activity within this period
              </small>
            </div>

            <button
              onClick={handleCreateLock}
              disabled={isLoading || connectionStatus !== PushUI.CONSTANTS.CONNECTION.STATUS.CONNECTED}
              className="btn btn-primary"
            >
              {isLoading ? 'Creating...' : '🔒 Create Dead Man Switch'}
            </button>

            {createdLockId && (
              <div className="success-box">
                <p>✅ Lock Created Successfully!</p>
                <p className="lock-id">
                  <strong>Lock ID:</strong> {createdLockId}
                </p>
                <p>
                  💡 Your wallet activity is automatically tracked - any transaction resets the timer!
                </p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'ping' && (
          <div className="tab-content">
            <h3>💓 Manual Activity Update</h3>
            
            <div className="info-box blue">
              <p>
                <strong>Note:</strong> Manual pinging is optional! The system automatically tracks your wallet activity. Use this only if you want to explicitly update the timer without making other transactions.
              </p>
            </div>

            <div className="form-group">
              <label className="form-label">Lock ID:</label>
              <input
                type="text"
                value={updateLockId}
                onChange={(e) => setUpdateLockId(e.target.value)}
                placeholder="0x..."
                className="form-input"
              />
            </div>

            <button
              onClick={handleUpdateActivity}
              disabled={isLoading || connectionStatus !== PushUI.CONSTANTS.CONNECTION.STATUS.CONNECTED}
              className="btn btn-green"
            >
              {isLoading ? 'Updating...' : '💓 Send Manual Heartbeat'}
            </button>
          </div>
        )}

        {activeTab === 'release' && (
          <div className="tab-content">
            <h3>📤 Release Funds to Beneficiary</h3>
            
            <div className="info-box green">
              <p>
                <strong>Smart Check:</strong> Before releasing, the system automatically checks the sender's latest wallet activity via Etherscan. If recent activity is found, the timer updates accordingly!
              </p>
            </div>

            {activityCheckStatus && (
              <div className="info-box yellow">
                <p>{activityCheckStatus}</p>
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Lock ID:</label>
              <input
                type="text"
                value={releaseLockId}
                onChange={(e) => setReleaseLockId(e.target.value)}
                placeholder="0x..."
                className="form-input"
              />
            </div>

            <button
              onClick={handleReleaseFunds}
              disabled={isLoading || connectionStatus !== PushUI.CONSTANTS.CONNECTION.STATUS.CONNECTED}
              className="btn btn-orange"
            >
              {isLoading ? 'Checking & Releasing...' : '📤 Release Funds (with Activity Check)'}
            </button>
          </div>
        )}

        {activeTab === 'cancel' && (
          <div className="tab-content">
            <h3>❌ Cancel Lock & Reclaim Funds</h3>
            
            <div className="info-box red">
              <p>
                ⚠️ Only the sender can cancel. This permanently closes the lock and returns all funds.
              </p>
            </div>

            <div className="form-group">
              <label className="form-label">Lock ID:</label>
              <input
                type="text"
                value={cancelLockId}
                onChange={(e) => setCancelLockId(e.target.value)}
                placeholder="0x..."
                className="form-input"
              />
            </div>

            <button
              onClick={handleCancelLock}
              disabled={isLoading || connectionStatus !== PushUI.CONSTANTS.CONNECTION.STATUS.CONNECTED}
              className="btn btn-red"
            >
              {isLoading ? 'Cancelling...' : '❌ Cancel Lock'}
            </button>
          </div>
        )}

        {activeTab === 'view' && (
          <div className="tab-content">
            <h3>🔍 View Lock Details</h3>
            
            {activityCheckStatus && (
              <div className="info-box green">
                <p>{activityCheckStatus}</p>
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Lock ID:</label>
              <div className="input-group">
                <input
                  type="text"
                  value={viewLockId}
                  onChange={(e) => setViewLockId(e.target.value)}
                  placeholder="0x..."
                  className="form-input"
                />
                <button
                  onClick={handleViewLock}
                  disabled={isLoading}
                  className="btn btn-blue"
                >
                  {isLoading ? '...' : '🔍 View'}
                </button>
              </div>
            </div>

            {lockDetails && (
              <div className="lock-details">
                <div className="status-section">
                  <h4>Status</h4>
                  <div className="status-badge">
                    {lockDetails.fundsReleased 
                      ? <span style={{ color: '#10b981' }}>✅ Funds Released</span>
                      : lockDetails.cancelled 
                      ? <span style={{ color: '#ef4444' }}>❌ Cancelled</span>
                      : timeUntilRelease === 0
                      ? <span style={{ color: '#f59e0b' }}>⏰ Ready for Release</span>
                      : <span style={{ color: '#3b82f6' }}>🔒 Active (Auto-Tracked)</span>
                    }
                  </div>
                </div>

                {walletActivityInfo && walletActivityInfo.found && (
                  <div className="activity-info">
                    <p>
                      <strong>🔄 Latest Wallet Activity:</strong> {walletActivityInfo.date}
                    </p>
                  </div>
                )}

                <table className="details-table">
                  <tbody>
                    <tr>
                      <td>Sender:</td>
                      <td className="address-text">{lockDetails.sender}</td>
                    </tr>
                    <tr>
                      <td>Beneficiary:</td>
                      <td className="address-text">{lockDetails.receiver}</td>
                    </tr>
                    <tr>
                      <td>Amount:</td>
                      <td className="amount-text">{lockDetails.amount} PUSH</td>
                    </tr>
                    <tr>
                      <td>Last Activity:</td>
                      <td>{lockDetails.lastActivityTime}</td>
                    </tr>
                    <tr>
                      <td>Time Since Activity:</td>
                      <td style={{ 
                        color: timeSinceActivity > lockDetails.inactivityPeriod ? '#ef4444' : '#10b981', 
                        fontWeight: 'bold' 
                      }}>
                        {formatDuration(timeSinceActivity)}
                      </td>
                    </tr>
                    <tr>
                      <td>Inactivity Period:</td>
                      <td>{formatDuration(lockDetails.inactivityPeriod)}</td>
                    </tr>
                    <tr>
                      <td>Time Until Release:</td>
                      <td style={{ 
                        fontWeight: 'bold', 
                        color: timeUntilRelease === 0 ? '#ef4444' : '#10b981' 
                      }}>
                        {timeUntilRelease > 0 
                          ? formatDuration(timeUntilRelease)
                          : '⏰ Eligible Now!'
                        }
                      </td>
                    </tr>
                    <tr>
                      <td>Sender Chain:</td>
                      <td>{lockDetails.senderChain || 'N/A'}</td>
                    </tr>
                    <tr>
                      <td>Receiver Chain:</td>
                      <td>{lockDetails.receiverChain || 'N/A'}</td>
                    </tr>
                  </tbody>
                </table>

                {!lockDetails.fundsReleased && !lockDetails.cancelled && (
                  <div className="info-box" style={{
                    marginTop: '20px',
                    backgroundColor: timeUntilRelease === 0 ? '#fef3c7' : '#dbeafe'
                  }}>
                    <p style={{ 
                      margin: 0, 
                      color: timeUntilRelease === 0 ? '#92400e' : '#1e40af', 
                      fontWeight: 'bold',
                      fontSize: '14px'
                    }}>
                      {timeUntilRelease === 0 
                        ? '⚠️ This lock is eligible for fund release! Anyone can trigger it now.'
                        : '💡 Activity is automatically tracked - any wallet transaction resets the timer!'
                      }
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === 'my-locks' && (
          <div className="tab-content">
            <div className="my-locks-header">
              <h3>📋 My Locks</h3>
              <button
                onClick={handleFetchUserLocks}
                disabled={isLoading || connectionStatus !== PushUI.CONSTANTS.CONNECTION.STATUS.CONNECTED}
                className="btn btn-blue"
                style={{ width: 'auto' }}
              >
                {isLoading ? 'Loading...' : '🔄 Refresh'}
              </button>
            </div>

            {userLocks.length === 0 ? (
              <div className="empty-state">
                <p>No locks found</p>
                <p>Create your first Dead Man Switch to get started!</p>
              </div>
            ) : (
              <div className="locks-grid">
                {userLocks.map((lock, index) => (
                  <div key={index} className="lock-card">
                    <div className="lock-card-header">
                      <div className="lock-card-info">
                        <p className="lock-card-id">
                          Lock ID: {lock.lockId.slice(0, 20)}...
                        </p>
                        <p className="lock-card-amount">
                          {lock.amount} PUSH
                        </p>
                      </div>
                      <div className="lock-card-status-icon">
                        {lock.fundsReleased 
                          ? <span style={{ color: '#10b981' }}>✅</span>
                          : lock.cancelled 
                          ? <span style={{ color: '#ef4444' }}>❌</span>
                          : lock.timeUntilRelease === 0
                          ? <span style={{ color: '#f59e0b' }}>⏰</span>
                          : <span style={{ color: '#3b82f6' }}>🔒</span>
                        }
                      </div>
                    </div>

                    <div className="lock-card-detail">
                      <span>Beneficiary: </span>
                      <span>
                        {lock.receiver.slice(0, 10)}...{lock.receiver.slice(-8)}
                      </span>
                    </div>

                    <div className="lock-card-status">
                      <span>Status: </span>
                      <span style={{ 
                        color: lock.fundsReleased ? '#10b981' : lock.cancelled ? '#ef4444' : lock.timeUntilRelease === 0 ? '#f59e0b' : '#3b82f6' 
                      }}>
                        {lock.fundsReleased 
                          ? 'Released'
                          : lock.cancelled 
                          ? 'Cancelled'
                          : lock.timeUntilRelease === 0
                          ? 'Ready for Release'
                          : `Active (${formatDuration(lock.timeUntilRelease)} remaining)`
                        }
                      </span>
                    </div>

                    <div className="lock-card-actions">
                      <button
                        onClick={() => {
                          setViewLockId(lock.lockId);
                          setActiveTab('view');
                        }}
                        className="btn btn-blue btn-small"
                      >
                        View Details
                      </button>
                      {!lock.fundsReleased && !lock.cancelled && (
                        <button
                          onClick={() => {
                            setUpdateLockId(lock.lockId);
                            setActiveTab('ping');
                          }}
                          className="btn btn-green btn-small"
                        >
                          💓 Manual Ping
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {statusMessage && (
          <div className={`status-message ${
            statusMessage.includes('Error') ? 'error' : 
            statusMessage.includes('success') ? 'success' : 'info'
          }`}>
            <p>{statusMessage}</p>
          </div>
        )}

        {txHash && pushChainClient && (
          <div className="tx-hash-box">
            <p>Transaction Hash:</p>
            <a
              href={pushChainClient.explorer.getTransactionUrl(txHash)}
              target='_blank'
              rel='noopener noreferrer'
            >
              {txHash}
            </a>
          </div>
        )}

        <div className="how-it-works">
          <h4>📖 How Auto-Activity Tracking Works:</h4>
          <div className="how-it-works-grid">
            <div className="how-it-works-item">
              <p>
                <strong>1. Automatic Monitoring:</strong> Your wallet activity is tracked via Etherscan API. Any transaction you make on Ethereum automatically counts as activity.
              </p>
            </div>
            <div className="how-it-works-item">
              <p>
                <strong>2. Smart Updates:</strong> When viewing lock details or releasing funds, the system checks your latest transaction and updates the timer if it's more recent.
              </p>
            </div>
            <div className="how-it-works-item">
              <p>
                <strong>3. No Manual Pinging Needed:</strong> Just use your wallet normally! Transfers, swaps, or any blockchain interaction resets your timer automatically.
              </p>
            </div>
            <div className="how-it-works-item">
              <p>
                <strong>4. Fallback Protection:</strong> If no recent activity is found, the original lock time is used. You can still manually ping if needed.
              </p>
            </div>
          </div>
          
          <div className="perfect-for">
            <p>
              <strong>💡 Perfect for:</strong> Digital inheritance, emergency fund access, business continuity, or any scenario where your on-chain activity proves you're alive and well!
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <PushUniversalWalletProvider config={walletConfig}>
      <Component />
    </PushUniversalWalletProvider>
  );
}

export default DeadManSwitchApp