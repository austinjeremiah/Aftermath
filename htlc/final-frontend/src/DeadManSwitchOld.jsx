import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import {
  PushUniversalWalletProvider,
  PushUniversalAccountButton,
  usePushWalletContext,
  usePushChainClient,
  usePushChain,
  PushUI,
} from '@pushchain/ui-kit';

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
      "inputs": [{"internalType": "bytes32", "name": "_lockId", "type": "bytes32"}],
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
      "inputs": [{"internalType": "bytes32", "name": "_lockId", "type": "bytes32"}],
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
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [{"internalType": "bytes32", "name": "_lockId", "type": "bytes32"}],
      "name": "isEligibleForRelease",
      "outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [{"internalType": "bytes32", "name": "_lockId", "type": "bytes32"}],
      "name": "getTimeUntilRelease",
      "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [{"internalType": "bytes32", "name": "_lockId", "type": "bytes32"}],
      "name": "getTimeSinceLastActivity",
      "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
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
        {"indexed": false, "internalType": "string", "name": "updateChain", "type": "string"}
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

  const CONTRACT_ADDRESS = '0x4BC314a17a4643Ba19C6b10a61385C262151658E';

  function Component() {
    const { connectionStatus } = usePushWalletContext();
    const { pushChainClient } = usePushChainClient();
    const { PushChain } = usePushChain();

    const [activeTab, setActiveTab] = useState('create');
    const [isLoading, setIsLoading] = useState(false);
    const [txHash, setTxHash] = useState('');
    const [statusMessage, setStatusMessage] = useState('');

    // Create Dead Lock form states
    const [receiverAddress, setReceiverAddress] = useState('');
    const [amount, setAmount] = useState('');
    const [inactivityPeriod, setInactivityPeriod] = useState('5184000'); // 60 days default
    const [createdLockId, setCreatedLockId] = useState('');

    // Update Activity form state
    const [updateLockId, setUpdateLockId] = useState('');

    // Release Funds form state
    const [releaseLockId, setReleaseLockId] = useState('');

    // Cancel Lock form state
    const [cancelLockId, setCancelLockId] = useState('');

    // View Lock states
    const [viewLockId, setViewLockId] = useState('');
    const [lockDetails, setLockDetails] = useState(null);
    const [timeUntilRelease, setTimeUntilRelease] = useState(null);
    const [timeSinceActivity, setTimeSinceActivity] = useState(null);

    // My Locks state
    const [userLocks, setUserLocks] = useState([]);

    // Helper function to convert seconds to readable format
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

    // Create Dead Lock
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

    // Update Activity
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

    // Release Funds
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
        setStatusMessage('Releasing funds...');

        const iface = new ethers.Interface(DEADMAN_SWITCH_ABI);
        const encodedData = iface.encodeFunctionData('releaseFunds', [releaseLockId]);

        const tx = await pushChainClient.universal.sendTransaction({
          to: CONTRACT_ADDRESS,
          data: encodedData,
          value: BigInt(0),
        });

        setTxHash(tx.hash);
        setStatusMessage('Transaction submitted. Waiting for confirmation...');

        await tx.wait();
        setStatusMessage('Funds released successfully to receiver!');
        setIsLoading(false);
      } catch (err) {
        console.error('Release funds error:', err);
        setStatusMessage(`Error: ${err.message}`);
        setIsLoading(false);
      }
    };

    // Cancel Lock
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

    // View Lock details
    const handleViewLock = async () => {
      if (!viewLockId) {
        setStatusMessage('Please enter lock ID');
        return;
      }

      try {
        setIsLoading(true);
        setStatusMessage('Fetching lock details...');

        const provider = new ethers.JsonRpcProvider('https://evm.rpc-testnet-donut-node1.push.org/');
        const contract = new ethers.Contract(CONTRACT_ADDRESS, DEADMAN_SWITCH_ABI, provider);

        const details = await contract.getDeadLock(viewLockId);
        const timeUntil = await contract.getTimeUntilRelease(viewLockId);
        const timeSince = await contract.getTimeSinceLastActivity(viewLockId);

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
        setStatusMessage('Lock details fetched successfully');
        setIsLoading(false);
      } catch (err) {
        console.error('View lock error:', err);
        setStatusMessage(`Error: ${err.message}`);
        setIsLoading(false);
      }
    };

    // Fetch user's locks
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
              const details = await contract.getDeadLock(lockId);
              const timeUntil = await contract.getTimeUntilRelease(lockId);
              
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
      <div style={{ padding: '20px', maxWidth: '900px', margin: '0 auto', fontFamily: 'Arial, sans-serif', backgroundColor: '#f9fafb', minHeight: '100vh' }}>
        <div style={{ textAlign: 'center', marginBottom: '30px', padding: '30px', backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
          <h1 style={{ color: '#1f2937', marginBottom: '10px', fontSize: '32px' }}>⚡ Dead Man Switch</h1>
          <p style={{ color: '#6b7280', marginBottom: '20px', fontSize: '16px' }}>Secure Legacy & Inheritance Protocol on Push Chain</p>
          <PushUniversalAccountButton />
        </div>

        {connectionStatus !== PushUI.CONSTANTS.CONNECTION.STATUS.CONNECTED && (
          <div style={{ textAlign: 'center', padding: '20px', backgroundColor: '#fef3c7', borderRadius: '8px', marginBottom: '20px', border: '2px solid #fbbf24' }}>
            <p style={{ margin: 0, color: '#92400e', fontWeight: 'bold' }}>⚠️ Please connect your wallet to interact with Dead Man Switch</p>
          </div>
        )}

        <div style={{ marginBottom: '20px', backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
          <div style={{ display: 'flex', gap: '0', borderBottom: '2px solid #e5e7eb' }}>
            {['create', 'ping', 'release', 'cancel', 'view', 'my-locks'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  flex: 1,
                  padding: '15px 10px',
                  border: 'none',
                  background: activeTab === tab ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : 'transparent',
                  color: activeTab === tab ? 'white' : '#6b7280',
                  cursor: 'pointer',
                  fontWeight: activeTab === tab ? 'bold' : 'normal',
                  textTransform: 'capitalize',
                  fontSize: '14px',
                  transition: 'all 0.3s'
                }}
              >
                {tab === 'my-locks' ? 'My Locks' : tab}
              </button>
            ))}
          </div>
        </div>

        {activeTab === 'create' && (
          <div style={{ backgroundColor: 'white', padding: '30px', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
            <h3 style={{ marginTop: 0, color: '#1f2937', fontSize: '24px', marginBottom: '20px' }}>🔒 Create New Dead Man Switch</h3>
            
            <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#dbeafe', borderRadius: '8px', borderLeft: '4px solid #3b82f6' }}>
              <p style={{ margin: 0, fontSize: '14px', color: '#1e40af', lineHeight: '1.6' }}>
                <strong>How it works:</strong> Lock your funds with a beneficiary. If you don't check in within your chosen period, funds automatically transfer to them. You can cancel anytime.
              </p>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#374151', fontSize: '14px' }}>Beneficiary Address:</label>
              <input
                type="text"
                value={receiverAddress}
                onChange={(e) => setReceiverAddress(e.target.value)}
                placeholder="0x... (who receives funds if you're inactive)"
                style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '2px solid #e5e7eb', boxSizing: 'border-box', fontSize: '14px' }}
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#374151', fontSize: '14px' }}>Amount (PUSH):</label>
              <input
                type="text"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="10.0"
                style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '2px solid #e5e7eb', boxSizing: 'border-box', fontSize: '14px' }}
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#374151', fontSize: '14px' }}>Inactivity Period:</label>
              <select
                value={inactivityPeriod}
                onChange={(e) => setInactivityPeriod(e.target.value)}
                style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '2px solid #e5e7eb', boxSizing: 'border-box', fontSize: '14px', cursor: 'pointer' }}
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
              <small style={{ color: '#6b7280', display: 'block', marginTop: '5px' }}>
                Funds transfer to beneficiary if you don't check in within this period
              </small>
            </div>

            <button
              onClick={handleCreateLock}
              disabled={isLoading || connectionStatus !== PushUI.CONSTANTS.CONNECTION.STATUS.CONNECTED}
              style={{
                width: '100%',
                padding: '15px',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                fontWeight: 'bold',
                fontSize: '16px',
                opacity: isLoading ? 0.6 : 1,
                transition: 'all 0.3s'
              }}
            >
              {isLoading ? 'Creating...' : '🔒 Create Dead Man Switch'}
            </button>

            {createdLockId && (
              <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#d1fae5', borderRadius: '8px', border: '2px solid #10b981' }}>
                <p style={{ margin: 0, fontWeight: 'bold', color: '#065f46' }}>✅ Lock Created Successfully!</p>
                <p style={{ margin: '10px 0 0 0', wordBreak: 'break-all', fontSize: '12px', color: '#047857', fontFamily: 'monospace' }}>
                  <strong>Lock ID:</strong> {createdLockId}
                </p>
                <p style={{ margin: '10px 0 0 0', fontSize: '13px', color: '#065f46' }}>
                  💡 Save this Lock ID to check status or update activity later
                </p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'ping' && (
          <div style={{ backgroundColor: 'white', padding: '30px', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
            <h3 style={{ marginTop: 0, color: '#1f2937', fontSize: '24px', marginBottom: '20px' }}>💓 Update Activity (Heartbeat)</h3>
            
            <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#dbeafe', borderRadius: '8px', borderLeft: '4px solid #3b82f6' }}>
              <p style={{ margin: 0, fontSize: '14px', color: '#1e40af' }}>
                Send a "heartbeat" signal to prove you're active and reset the inactivity timer
              </p>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#374151', fontSize: '14px' }}>Lock ID:</label>
              <input
                type="text"
                value={updateLockId}
                onChange={(e) => setUpdateLockId(e.target.value)}
                placeholder="0x..."
                style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '2px solid #e5e7eb', boxSizing: 'border-box', fontSize: '14px' }}
              />
            </div>

            <button
              onClick={handleUpdateActivity}
              disabled={isLoading || connectionStatus !== PushUI.CONSTANTS.CONNECTION.STATUS.CONNECTED}
              style={{
                width: '100%',
                padding: '15px',
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                fontWeight: 'bold',
                fontSize: '16px',
                opacity: isLoading ? 0.6 : 1
              }}
            >
              {isLoading ? 'Updating...' : '💓 Send Heartbeat'}
            </button>
          </div>
        )}

        {activeTab === 'release' && (
          <div style={{ backgroundColor: 'white', padding: '30px', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
            <h3 style={{ marginTop: 0, color: '#1f2937', fontSize: '24px', marginBottom: '20px' }}>📤 Release Funds to Beneficiary</h3>
            
            <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#fef3c7', borderRadius: '8px', borderLeft: '4px solid #f59e0b' }}>
              <p style={{ margin: 0, fontSize: '14px', color: '#92400e' }}>
                ⚠️ Can only be called after the inactivity period has expired. Anyone can trigger this (keeper service or beneficiary)
              </p>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#374151', fontSize: '14px' }}>Lock ID:</label>
              <input
                type="text"
                value={releaseLockId}
                onChange={(e) => setReleaseLockId(e.target.value)}
                placeholder="0x..."
                style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '2px solid #e5e7eb', boxSizing: 'border-box', fontSize: '14px' }}
              />
            </div>

            <button
              onClick={handleReleaseFunds}
              disabled={isLoading || connectionStatus !== PushUI.CONSTANTS.CONNECTION.STATUS.CONNECTED}
              style={{
                width: '100%',
                padding: '15px',
                background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                fontWeight: 'bold',
                fontSize: '16px',
                opacity: isLoading ? 0.6 : 1
              }}
            >
              {isLoading ? 'Releasing...' : '📤 Release Funds'}
            </button>
          </div>
        )}

        {activeTab === 'cancel' && (
          <div style={{ backgroundColor: 'white', padding: '30px', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
            <h3 style={{ marginTop: 0, color: '#1f2937', fontSize: '24px', marginBottom: '20px' }}>❌ Cancel Lock & Reclaim Funds</h3>
            
            <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#fee2e2', borderRadius: '8px', borderLeft: '4px solid #ef4444' }}>
              <p style={{ margin: 0, fontSize: '14px', color: '#991b1b' }}>
                ⚠️ Only the sender can cancel. This permanently closes the lock and returns all funds.
              </p>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#374151', fontSize: '14px' }}>Lock ID:</label>
              <input
                type="text"
                value={cancelLockId}
                onChange={(e) => setCancelLockId(e.target.value)}
                placeholder="0x..."
                style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '2px solid #e5e7eb', boxSizing: 'border-box', fontSize: '14px' }}
              />
            </div>

            <button
              onClick={handleCancelLock}
              disabled={isLoading || connectionStatus !== PushUI.CONSTANTS.CONNECTION.STATUS.CONNECTED}
              style={{
                width: '100%',
                padding: '15px',
                background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                fontWeight: 'bold',
                fontSize: '16px',
                opacity: isLoading ? 0.6 : 1
              }}
            >
              {isLoading ? 'Cancelling...' : '❌ Cancel Lock'}
            </button>
          </div>
        )}

        {activeTab === 'view' && (
          <div style={{ backgroundColor: 'white', padding: '30px', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
            <h3 style={{ marginTop: 0, color: '#1f2937', fontSize: '24px', marginBottom: '20px' }}>🔍 View Lock Details</h3>
            
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#374151', fontSize: '14px' }}>Lock ID:</label>
              <div style={{ display: 'flex', gap: '10px' }}>
                <input
                  type="text"
                  value={viewLockId}
                  onChange={(e) => setViewLockId(e.target.value)}
                  placeholder="0x..."
                  style={{ flex: 1, padding: '12px', borderRadius: '8px', border: '2px solid #e5e7eb', fontSize: '14px' }}
                />
                <button
                  onClick={handleViewLock}
                  disabled={isLoading}
                  style={{
                    padding: '12px 24px',
                    background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: isLoading ? 'not-allowed' : 'pointer',
                    fontWeight: 'bold'
                  }}
                >
                  {isLoading ? '...' : '🔍 View'}
                </button>
              </div>
            </div>

            {lockDetails && (
              <div style={{ marginTop: '25px', padding: '20px', backgroundColor: '#f9fafb', borderRadius: '12px', border: '2px solid #e5e7eb' }}>
                <div style={{ marginBottom: '15px', paddingBottom: '15px', borderBottom: '2px solid #e5e7eb' }}>
                  <h4 style={{ margin: '0 0 15px 0', color: '#1f2937' }}>Status</h4>
                  <div style={{ fontSize: '24px', fontWeight: 'bold' }}>
                    {lockDetails.fundsReleased 
                      ? <span style={{ color: '#10b981' }}>✅ Funds Released</span>
                      : lockDetails.cancelled 
                      ? <span style={{ color: '#ef4444' }}>❌ Cancelled</span>
                      : timeUntilRelease === 0
                      ? <span style={{ color: '#f59e0b' }}>⏰ Ready for Release</span>
                      : <span style={{ color: '#3b82f6' }}>🔒 Active</span>
                    }
                  </div>
                </div>

                <table style={{ width: '100%', fontSize: '14px', borderCollapse: 'collapse' }}>
                  <tbody>
                    <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                      <td style={{ padding: '12px 8px', fontWeight: 'bold', color: '#6b7280', width: '40%' }}>Sender:</td>
                      <td style={{ padding: '12px 8px', wordBreak: 'break-all', fontSize: '12px', fontFamily: 'monospace' }}>{lockDetails.sender}</td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                      <td style={{ padding: '12px 8px', fontWeight: 'bold', color: '#6b7280' }}>Beneficiary:</td>
                      <td style={{ padding: '12px 8px', wordBreak: 'break-all', fontSize: '12px', fontFamily: 'monospace' }}>{lockDetails.receiver}</td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                      <td style={{ padding: '12px 8px', fontWeight: 'bold', color: '#6b7280' }}>Amount:</td>
                      <td style={{ padding: '12px 8px', fontWeight: 'bold', color: '#1f2937', fontSize: '16px' }}>{lockDetails.amount} PUSH</td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                      <td style={{ padding: '12px 8px', fontWeight: 'bold', color: '#6b7280' }}>Last Activity:</td>
                      <td style={{ padding: '12px 8px' }}>{lockDetails.lastActivityTime}</td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                      <td style={{ padding: '12px 8px', fontWeight: 'bold', color: '#6b7280' }}>Time Since Activity:</td>
                      <td style={{ padding: '12px 8px', color: timeSinceActivity > lockDetails.inactivityPeriod ? '#ef4444' : '#10b981', fontWeight: 'bold' }}>
                        {formatDuration(timeSinceActivity)}
                      </td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                      <td style={{ padding: '12px 8px', fontWeight: 'bold', color: '#6b7280' }}>Inactivity Period:</td>
                      <td style={{ padding: '12px 8px' }}>{formatDuration(lockDetails.inactivityPeriod)}</td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                      <td style={{ padding: '12px 8px', fontWeight: 'bold', color: '#6b7280' }}>Time Until Release:</td>
                      <td style={{ padding: '12px 8px', fontWeight: 'bold', color: timeUntilRelease === 0 ? '#ef4444' : '#10b981' }}>
                        {timeUntilRelease > 0 
                          ? formatDuration(timeUntilRelease)
                          : '⏰ Eligible Now!'
                        }
                      </td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                      <td style={{ padding: '12px 8px', fontWeight: 'bold', color: '#6b7280' }}>Sender Chain:</td>
                      <td style={{ padding: '12px 8px' }}>{lockDetails.senderChain || 'N/A'}</td>
                    </tr>
                    <tr>
                      <td style={{ padding: '12px 8px', fontWeight: 'bold', color: '#6b7280' }}>Receiver Chain:</td>
                      <td style={{ padding: '12px 8px' }}>{lockDetails.receiverChain || 'N/A'}</td>
                    </tr>
                  </tbody>
                </table>

                {!lockDetails.fundsReleased && !lockDetails.cancelled && (
                  <div style={{ marginTop: '20px', padding: '15px', backgroundColor: timeUntilRelease === 0 ? '#fef3c7' : '#dbeafe', borderRadius: '8px' }}>
                    <p style={{ margin: 0, fontSize: '14px', color: timeUntilRelease === 0 ? '#92400e' : '#1e40af', fontWeight: 'bold' }}>
                      {timeUntilRelease === 0 
                        ? '⚠️ This lock is eligible for fund release! Anyone can trigger it now.'
                        : '💡 The sender should ping regularly to prevent automatic fund release.'
                      }
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === 'my-locks' && (
          <div style={{ backgroundColor: 'white', padding: '30px', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, color: '#1f2937', fontSize: '24px' }}>📋 My Locks</h3>
              <button
                onClick={handleFetchUserLocks}
                disabled={isLoading || connectionStatus !== PushUI.CONSTANTS.CONNECTION.STATUS.CONNECTED}
                style={{
                  padding: '10px 20px',
                  background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  fontWeight: 'bold'
                }}
              >
                {isLoading ? 'Loading...' : '🔄 Refresh'}
              </button>
            </div>

            {userLocks.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
                <p style={{ fontSize: '18px', margin: 0 }}>No locks found</p>
                <p style={{ fontSize: '14px', marginTop: '10px' }}>Create your first Dead Man Switch to get started!</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gap: '15px' }}>
                {userLocks.map((lock, index) => (
                  <div
                    key={index}
                    style={{
                      padding: '20px',
                      backgroundColor: '#f9fafb',
                      borderRadius: '12px',
                      border: '2px solid #e5e7eb',
                      transition: 'all 0.3s'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '15px' }}>
                      <div style={{ flex: 1 }}>
                        <p style={{ margin: '0 0 5px 0', fontSize: '12px', color: '#6b7280', fontFamily: 'monospace' }}>
                          Lock ID: {lock.lockId.slice(0, 20)}...
                        </p>
                        <p style={{ margin: 0, fontSize: '20px', fontWeight: 'bold', color: '#1f2937' }}>
                          {lock.amount} PUSH
                        </p>
                      </div>
                      <div style={{ fontSize: '20px', fontWeight: 'bold' }}>
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

                    <div style={{ marginBottom: '10px' }}>
                      <span style={{ fontSize: '12px', color: '#6b7280' }}>Beneficiary: </span>
                      <span style={{ fontSize: '12px', fontFamily: 'monospace', color: '#1f2937' }}>
                        {lock.receiver.slice(0, 10)}...{lock.receiver.slice(-8)}
                      </span>
                    </div>

                    <div style={{ marginBottom: '15px' }}>
                      <span style={{ fontSize: '12px', color: '#6b7280' }}>Status: </span>
                      <span style={{ fontSize: '13px', fontWeight: 'bold', color: lock.fundsReleased ? '#10b981' : lock.cancelled ? '#ef4444' : lock.timeUntilRelease === 0 ? '#f59e0b' : '#3b82f6' }}>
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

                    <div style={{ display: 'flex', gap: '10px' }}>
                      <button
                        onClick={() => {
                          setViewLockId(lock.lockId);
                          setActiveTab('view');
                          handleViewLock();
                        }}
                        style={{
                          flex: 1,
                          padding: '8px',
                          background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontSize: '13px',
                          fontWeight: 'bold'
                        }}
                      >
                        View Details
                      </button>
                      {!lock.fundsReleased && !lock.cancelled && (
                        <button
                          onClick={() => {
                            setUpdateLockId(lock.lockId);
                            setActiveTab('ping');
                          }}
                          style={{
                            flex: 1,
                            padding: '8px',
                            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '13px',
                            fontWeight: 'bold'
                          }}
                        >
                          💓 Ping
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
          <div style={{ 
            marginTop: '20px', 
            padding: '15px', 
            backgroundColor: statusMessage.includes('Error') ? '#fee2e2' : statusMessage.includes('success') ? '#d1fae5' : '#dbeafe', 
            borderRadius: '8px',
            borderLeft: `4px solid ${statusMessage.includes('Error') ? '#ef4444' : statusMessage.includes('success') ? '#10b981' : '#3b82f6'}`
          }}>
            <p style={{ margin: 0, color: statusMessage.includes('Error') ? '#991b1b' : statusMessage.includes('success') ? '#065f46' : '#1e40af', fontSize: '14px' }}>
              {statusMessage}
            </p>
          </div>
        )}

        {txHash && pushChainClient && (
          <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#f3f4f6', borderRadius: '8px', border: '2px solid #e5e7eb' }}>
            <p style={{ margin: '0 0 8px 0', fontWeight: 'bold', color: '#374151' }}>Transaction Hash:</p>
            <a
              href={pushChainClient.explorer.getTransactionUrl(txHash)}
              target='_blank'
              rel='noopener noreferrer'
              style={{ 
                color: '#667eea', 
                textDecoration: 'underline',
                wordBreak: 'break-all',
                fontSize: '12px',
                fontFamily: 'monospace'
              }}
            >
              {txHash}
            </a>
          </div>
        )}

        <div style={{ marginTop: '30px', padding: '25px', backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
          <h4 style={{ marginTop: 0, color: '#1f2937', fontSize: '18px', marginBottom: '15px' }}>📖 How Dead Man Switch Works:</h4>
          <div style={{ display: 'grid', gap: '15px' }}>
            <div style={{ padding: '15px', backgroundColor: '#f0f9ff', borderRadius: '8px', borderLeft: '4px solid #3b82f6' }}>
              <p style={{ margin: 0, fontSize: '14px', color: '#1e40af', lineHeight: '1.6' }}>
                <strong>1. Create Lock:</strong> Deposit funds and designate a beneficiary. Set how long you can be inactive before funds transfer.
              </p>
            </div>
            <div style={{ padding: '15px', backgroundColor: '#f0fdf4', borderRadius: '8px', borderLeft: '4px solid #10b981' }}>
              <p style={{ margin: 0, fontSize: '14px', color: '#065f46', lineHeight: '1.6' }}>
                <strong>2. Stay Active:</strong> Regularly "ping" the contract to prove you're alive and reset the timer. You control when funds transfer.
              </p>
            </div>
            <div style={{ padding: '15px', backgroundColor: '#fffbeb', borderRadius: '8px', borderLeft: '4px solid #f59e0b' }}>
              <p style={{ margin: 0, fontSize: '14px', color: '#92400e', lineHeight: '1.6' }}>
                <strong>3. Auto-Transfer:</strong> If you don't ping within the inactivity period, anyone can trigger fund release to your beneficiary.
              </p>
            </div>
            <div style={{ padding: '15px', backgroundColor: '#fef2f2', borderRadius: '8px', borderLeft: '4px solid #ef4444' }}>
              <p style={{ margin: 0, fontSize: '14px', color: '#991b1b', lineHeight: '1.6' }}>
                <strong>4. Cancel Anytime:</strong> You can always cancel the lock and reclaim your funds before they're released.
              </p>
            </div>
          </div>
          
          <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#fef3c7', borderRadius: '8px' }}>
            <p style={{ margin: 0, fontSize: '13px', color: '#92400e', lineHeight: '1.6' }}>
              <strong>💡 Use Cases:</strong> Digital inheritance, emergency access for family, business succession planning, or any scenario where funds should transfer if you become unavailable.
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

export default DeadManSwitchApp;