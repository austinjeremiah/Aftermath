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

function UniversalHTLCApp() {
  const walletConfig = {
    network: PushUI.CONSTANTS.PUSH_NETWORK.TESTNET,
  };

  const HTLC_ABI = [
    {
      "inputs": [
        {"internalType": "address", "name": "_receiver", "type": "address"},
        {"internalType": "bytes32", "name": "_hashLock", "type": "bytes32"},
        {"internalType": "uint256", "name": "_timeLockDuration", "type": "uint256"}
      ],
      "name": "createHTLC",
      "outputs": [{"internalType": "bytes32", "name": "contractId", "type": "bytes32"}],
      "stateMutability": "payable",
      "type": "function"
    },
    {
      "inputs": [
        {"internalType": "bytes32", "name": "_contractId", "type": "bytes32"},
        {"internalType": "bytes32", "name": "_preimage", "type": "bytes32"}
      ],
      "name": "withdraw",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [{"internalType": "bytes32", "name": "_contractId", "type": "bytes32"}],
      "name": "refund",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [{"internalType": "bytes32", "name": "_contractId", "type": "bytes32"}],
      "name": "getHTLC",
      "outputs": [
        {"internalType": "address", "name": "sender", "type": "address"},
        {"internalType": "address", "name": "receiver", "type": "address"},
        {"internalType": "uint256", "name": "amount", "type": "uint256"},
        {"internalType": "bytes32", "name": "hashLock", "type": "bytes32"},
        {"internalType": "uint256", "name": "timeLock", "type": "uint256"},
        {"internalType": "bool", "name": "withdrawn", "type": "bool"},
        {"internalType": "bool", "name": "refunded", "type": "bool"},
        {"internalType": "string", "name": "senderChain", "type": "string"},
        {"internalType": "string", "name": "receiverChain", "type": "string"}
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [{"internalType": "bytes32", "name": "_contractId", "type": "bytes32"}],
      "name": "getRemainingTime",
      "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [{"internalType": "bytes32", "name": "_contractId", "type": "bytes32"}],
      "name": "isExpired",
      "outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
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
        {"indexed": true, "internalType": "bytes32", "name": "contractId", "type": "bytes32"},
        {"indexed": true, "internalType": "address", "name": "sender", "type": "address"},
        {"indexed": true, "internalType": "address", "name": "receiver", "type": "address"},
        {"indexed": false, "internalType": "uint256", "name": "amount", "type": "uint256"},
        {"indexed": false, "internalType": "bytes32", "name": "hashLock", "type": "bytes32"},
        {"indexed": false, "internalType": "uint256", "name": "timeLock", "type": "uint256"},
        {"indexed": false, "internalType": "string", "name": "senderChain", "type": "string"},
        {"indexed": false, "internalType": "string", "name": "receiverChain", "type": "string"}
      ],
      "name": "HTLCCreated",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {"indexed": true, "internalType": "bytes32", "name": "contractId", "type": "bytes32"},
        {"indexed": true, "internalType": "address", "name": "receiver", "type": "address"},
        {"indexed": false, "internalType": "bytes32", "name": "preimage", "type": "bytes32"},
        {"indexed": false, "internalType": "string", "name": "withdrawChain", "type": "string"}
      ],
      "name": "HTLCWithdrawn",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {"indexed": true, "internalType": "bytes32", "name": "contractId", "type": "bytes32"},
        {"indexed": true, "internalType": "address", "name": "sender", "type": "address"},
        {"indexed": false, "internalType": "string", "name": "refundChain", "type": "string"}
      ],
      "name": "HTLCRefunded",
      "type": "event"
    }
  ];

  const HTLC_CONTRACT_ADDRESS = '0xB10458469E9b69fB7598316F909bb5F9fc6453a5';

  function Component() {
    const { connectionStatus } = usePushWalletContext();
    const { pushChainClient } = usePushChainClient();
    const { PushChain } = usePushChain();

    const [activeTab, setActiveTab] = useState('create');
    const [isLoading, setIsLoading] = useState(false);
    const [txHash, setTxHash] = useState('');
    const [statusMessage, setStatusMessage] = useState('');

    // Create HTLC form states
    const [receiverAddress, setReceiverAddress] = useState('');
    const [amount, setAmount] = useState('');
    const [secret, setSecret] = useState('');
    const [hashLock, setHashLock] = useState('');
    const [timeLockDuration, setTimeLockDuration] = useState('3600');
    const [createdContractId, setCreatedContractId] = useState('');

    // Withdraw form states
    const [withdrawContractId, setWithdrawContractId] = useState('');
    const [withdrawPreimage, setWithdrawPreimage] = useState('');

    // Refund form states
    const [refundContractId, setRefundContractId] = useState('');

    // View HTLC states
    const [viewContractId, setViewContractId] = useState('');
    const [htlcDetails, setHtlcDetails] = useState(null);
    const [remainingTime, setRemainingTime] = useState(null);

    // Generate hash from secret
    // The contract will hash the preimage again, so we need DOUBLE hashing
    const generateHash = () => {
      if (!secret) {
        setStatusMessage('Please enter a secret first');
        return;
      }
      // First hash: what we'll send as preimage during withdraw
      const firstHash = ethers.keccak256(ethers.toUtf8Bytes(secret));
      // Second hash: what gets stored in the contract (contract hashes the preimage)
      const doubleHash = ethers.keccak256(firstHash);
      setHashLock(doubleHash);
      setStatusMessage(`Hash generated (double-hashed): ${doubleHash}`);
    };

    // Create HTLC
    const handleCreateHTLC = async () => {
      if (!pushChainClient) {
        setStatusMessage('Please connect your wallet first');
        return;
      }

      if (!receiverAddress || !amount || !hashLock || !timeLockDuration) {
        setStatusMessage('Please fill all fields');
        return;
      }

      try {
        setIsLoading(true);
        setStatusMessage('Creating HTLC...');

        const amountInWei = ethers.parseEther(amount);
        
        // Create interface and encode function data
        const iface = new ethers.Interface(HTLC_ABI);
        const encodedData = iface.encodeFunctionData('createHTLC', [
          receiverAddress, 
          hashLock, 
          parseInt(timeLockDuration)
        ]);

        const tx = await pushChainClient.universal.sendTransaction({
          to: HTLC_CONTRACT_ADDRESS,
          data: encodedData,
          value: amountInWei,
        });

        setTxHash(tx.hash);
        setStatusMessage('Transaction submitted. Waiting for confirmation...');

        const receipt = await tx.wait();
        
        // Extract contract ID from logs
        const provider = new ethers.JsonRpcProvider('https://evm.rpc-testnet-donut-node1.push.org/');
        const contract = new ethers.Contract(HTLC_CONTRACT_ADDRESS, HTLC_ABI, provider);
        const iface2 = contract.interface;
        
        for (const log of receipt.logs) {
          try {
            const parsed = iface2.parseLog(log);
            if (parsed.name === 'HTLCCreated') {
              setCreatedContractId(parsed.args.contractId);
              setStatusMessage(`HTLC Created! Contract ID: ${parsed.args.contractId}`);
              break;
            }
          } catch (e) {
            continue;
          }
        }

        setIsLoading(false);
      } catch (err) {
        console.error('Create HTLC error:', err);
        setStatusMessage(`Error: ${err.message}`);
        setIsLoading(false);
      }
    };

    // Withdraw HTLC - FIXED VERSION
    const handleWithdraw = async () => {
      if (!pushChainClient) {
        setStatusMessage('Please connect your wallet first');
        return;
      }

      if (!withdrawContractId || !withdrawPreimage) {
        setStatusMessage('Please fill all fields');
        return;
      }

      try {
        setIsLoading(true);
        setStatusMessage('Withdrawing funds...');

        // CRITICAL FIX: The contract hashes with keccak256(abi.encodePacked(_preimage))
        // So we need to send the ORIGINAL keccak256 hash of the secret
        let preimageBytes32;
        
        if (withdrawPreimage.startsWith('0x') && withdrawPreimage.length === 66) {
          // If already a bytes32 hex string (0x + 64 chars), use it directly
          preimageBytes32 = withdrawPreimage;
        } else {
          // Hash the secret string to get bytes32
          // This hash will be hashed AGAIN by the contract
          preimageBytes32 = ethers.keccak256(ethers.toUtf8Bytes(withdrawPreimage));
        }

        console.log('Secret entered:', withdrawPreimage);
        console.log('Preimage (hashed once):', preimageBytes32);

        // Create interface and encode function data
        const iface = new ethers.Interface(HTLC_ABI);
        const encodedData = iface.encodeFunctionData('withdraw', [
          withdrawContractId, 
          preimageBytes32
        ]);

        const tx = await pushChainClient.universal.sendTransaction({
          to: HTLC_CONTRACT_ADDRESS,
          data: encodedData,
          value: BigInt(0),
        });

        setTxHash(tx.hash);
        setStatusMessage('Transaction submitted. Waiting for confirmation...');

        await tx.wait();
        setStatusMessage('Withdrawal successful!');
        setIsLoading(false);
      } catch (err) {
        console.error('Withdraw error:', err);
        setStatusMessage(`Error: ${err.message}`);
        setIsLoading(false);
      }
    };

    // Refund HTLC
    const handleRefund = async () => {
      if (!pushChainClient) {
        setStatusMessage('Please connect your wallet first');
        return;
      }

      if (!refundContractId) {
        setStatusMessage('Please enter contract ID');
        return;
      }

      try {
        setIsLoading(true);
        setStatusMessage('Processing refund...');

        // Create interface and encode function data
        const iface = new ethers.Interface(HTLC_ABI);
        const encodedData = iface.encodeFunctionData('refund', [refundContractId]);

        const tx = await pushChainClient.universal.sendTransaction({
          to: HTLC_CONTRACT_ADDRESS,
          data: encodedData,
          value: BigInt(0),
        });

        setTxHash(tx.hash);
        setStatusMessage('Transaction submitted. Waiting for confirmation...');

        await tx.wait();
        setStatusMessage('Refund successful!');
        setIsLoading(false);
      } catch (err) {
        console.error('Refund error:', err);
        setStatusMessage(`Error: ${err.message}`);
        setIsLoading(false);
      }
    };

    // View HTLC details
    const handleViewHTLC = async () => {
      if (!viewContractId) {
        setStatusMessage('Please enter contract ID');
        return;
      }

      try {
        setIsLoading(true);
        setStatusMessage('Fetching HTLC details...');

        const provider = new ethers.JsonRpcProvider('https://evm.rpc-testnet-donut-node1.push.org/');
        const contract = new ethers.Contract(HTLC_CONTRACT_ADDRESS, HTLC_ABI, provider);

        const details = await contract.getHTLC(viewContractId);
        const timeRemaining = await contract.getRemainingTime(viewContractId);

        setHtlcDetails({
          sender: details[0],
          receiver: details[1],
          amount: ethers.formatEther(details[2]),
          hashLock: details[3],
          timeLock: new Date(Number(details[4]) * 1000).toLocaleString(),
          withdrawn: details[5],
          refunded: details[6],
          senderChain: details[7],
          receiverChain: details[8]
        });

        setRemainingTime(Number(timeRemaining));
        setStatusMessage('HTLC details fetched successfully');
        setIsLoading(false);
      } catch (err) {
        console.error('View HTLC error:', err);
        setStatusMessage(`Error: ${err.message}`);
        setIsLoading(false);
      }
    };

    return (
      <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto', fontFamily: 'Arial, sans-serif' }}>
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <h1 style={{ color: '#d946ef', marginBottom: '10px' }}>Universal HTLC DApp</h1>
          <p style={{ color: '#666', marginBottom: '20px' }}>Hash Time Locked Contracts on Push Chain</p>
          <PushUniversalAccountButton />
        </div>

        {connectionStatus !== PushUI.CONSTANTS.CONNECTION.STATUS.CONNECTED && (
          <div style={{ textAlign: 'center', padding: '20px', backgroundColor: '#fff3cd', borderRadius: '8px', marginBottom: '20px' }}>
            <p style={{ margin: 0, color: '#856404' }}>Please connect your wallet to interact with HTLCs</p>
          </div>
        )}

        <div style={{ marginBottom: '20px', borderBottom: '2px solid #e5e7eb' }}>
          <div style={{ display: 'flex', gap: '10px' }}>
            {['create', 'withdraw', 'refund', 'view'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  padding: '10px 20px',
                  border: 'none',
                  background: activeTab === tab ? '#d946ef' : 'transparent',
                  color: activeTab === tab ? 'white' : '#666',
                  cursor: 'pointer',
                  borderRadius: '8px 8px 0 0',
                  fontWeight: activeTab === tab ? 'bold' : 'normal',
                  textTransform: 'capitalize'
                }}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {activeTab === 'create' && (
          <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
            <h3 style={{ marginTop: 0, color: '#333' }}>Create New HTLC</h3>
            
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', color: '#555' }}>Receiver Address:</label>
              <input
                type="text"
                value={receiverAddress}
                onChange={(e) => setReceiverAddress(e.target.value)}
                placeholder="0x..."
                style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #ddd', boxSizing: 'border-box' }}
              />
            </div>

            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', color: '#555' }}>Amount (PUSH):</label>
              <input
                type="text"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="1.0"
                style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #ddd', boxSizing: 'border-box' }}
              />
            </div>

            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', color: '#555' }}>Secret (for hash generation):</label>
              <div style={{ display: 'flex', gap: '10px' }}>
                <input
                  type="text"
                  value={secret}
                  onChange={(e) => setSecret(e.target.value)}
                  placeholder="Enter secret phrase"
                  style={{ flex: 1, padding: '10px', borderRadius: '4px', border: '1px solid #ddd' }}
                />
                <button
                  onClick={generateHash}
                  style={{
                    padding: '10px 20px',
                    backgroundColor: '#10b981',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontWeight: 'bold'
                  }}
                >
                  Generate Hash
                </button>
              </div>
            </div>

            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', color: '#555' }}>Hash Lock:</label>
              <input
                type="text"
                value={hashLock}
                onChange={(e) => setHashLock(e.target.value)}
                placeholder="0x... (or generate from secret)"
                style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #ddd', boxSizing: 'border-box', fontSize: '12px' }}
              />
              <small style={{ color: '#666' }}>This is the double-hashed value: keccak256(keccak256(secret))</small>
            </div>

            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', color: '#555' }}>Time Lock Duration (seconds):</label>
              <input
                type="number"
                value={timeLockDuration}
                onChange={(e) => setTimeLockDuration(e.target.value)}
                placeholder="3600"
                style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #ddd', boxSizing: 'border-box' }}
              />
              <small style={{ color: '#666' }}>3600 seconds = 1 hour</small>
            </div>

            <button
              onClick={handleCreateHTLC}
              disabled={isLoading || connectionStatus !== PushUI.CONSTANTS.CONNECTION.STATUS.CONNECTED}
              style={{
                width: '100%',
                padding: '12px',
                backgroundColor: '#d946ef',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                fontWeight: 'bold',
                fontSize: '16px',
                opacity: isLoading ? 0.6 : 1
              }}
            >
              {isLoading ? 'Creating...' : 'Create HTLC'}
            </button>

            {createdContractId && (
              <div style={{ marginTop: '15px', padding: '15px', backgroundColor: '#d1fae5', borderRadius: '4px' }}>
                <p style={{ margin: 0, fontWeight: 'bold', color: '#065f46' }}>Contract Created!</p>
                <p style={{ margin: '5px 0 0 0', wordBreak: 'break-all', fontSize: '12px', color: '#047857' }}>
                  Contract ID: {createdContractId}
                </p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'withdraw' && (
          <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
            <h3 style={{ marginTop: 0, color: '#333' }}>Withdraw from HTLC</h3>
            
            <div style={{ marginBottom: '15px', padding: '10px', backgroundColor: '#dbeafe', borderRadius: '4px' }}>
              <p style={{ margin: 0, fontSize: '14px', color: '#1e40af' }}>
                ℹ️ Enter the EXACT secret phrase you used when creating the HTLC (the raw text, not any hash)
              </p>
            </div>

            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', color: '#555' }}>Contract ID:</label>
              <input
                type="text"
                value={withdrawContractId}
                onChange={(e) => setWithdrawContractId(e.target.value)}
                placeholder="0x..."
                style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #ddd', boxSizing: 'border-box' }}
              />
            </div>

            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', color: '#555' }}>Preimage (Secret Phrase):</label>
              <input
                type="text"
                value={withdrawPreimage}
                onChange={(e) => setWithdrawPreimage(e.target.value)}
                placeholder="Enter the ORIGINAL secret phrase"
                style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #ddd', boxSizing: 'border-box' }}
              />
              <small style={{ color: '#666' }}>This is the same secret you used to generate the hash</small>
            </div>

            <button
              onClick={handleWithdraw}
              disabled={isLoading || connectionStatus !== PushUI.CONSTANTS.CONNECTION.STATUS.CONNECTED}
              style={{
                width: '100%',
                padding: '12px',
                backgroundColor: '#10b981',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                fontWeight: 'bold',
                fontSize: '16px',
                opacity: isLoading ? 0.6 : 1
              }}
            >
              {isLoading ? 'Withdrawing...' : 'Withdraw'}
            </button>
          </div>
        )}

        {activeTab === 'refund' && (
          <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
            <h3 style={{ marginTop: 0, color: '#333' }}>Refund HTLC</h3>
            
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', color: '#555' }}>Contract ID:</label>
              <input
                type="text"
                value={refundContractId}
                onChange={(e) => setRefundContractId(e.target.value)}
                placeholder="0x..."
                style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #ddd', boxSizing: 'border-box' }}
              />
            </div>

            <div style={{ marginBottom: '15px', padding: '10px', backgroundColor: '#fef3c7', borderRadius: '4px' }}>
              <p style={{ margin: 0, fontSize: '14px', color: '#92400e' }}>
                ⚠️ Note: Refund is only possible after the time lock has expired
              </p>
            </div>

            <button
              onClick={handleRefund}
              disabled={isLoading || connectionStatus !== PushUI.CONSTANTS.CONNECTION.STATUS.CONNECTED}
              style={{
                width: '100%',
                padding: '12px',
                backgroundColor: '#ef4444',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                fontWeight: 'bold',
                fontSize: '16px',
                opacity: isLoading ? 0.6 : 1
              }}
            >
              {isLoading ? 'Processing...' : 'Refund'}
            </button>
          </div>
        )}

        {activeTab === 'view' && (
          <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
            <h3 style={{ marginTop: 0, color: '#333' }}>View HTLC Details</h3>
            
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', color: '#555' }}>Contract ID:</label>
              <div style={{ display: 'flex', gap: '10px' }}>
                <input
                  type="text"
                  value={viewContractId}
                  onChange={(e) => setViewContractId(e.target.value)}
                  placeholder="0x..."
                  style={{ flex: 1, padding: '10px', borderRadius: '4px', border: '1px solid #ddd' }}
                />
                <button
                  onClick={handleViewHTLC}
                  disabled={isLoading}
                  style={{
                    padding: '10px 20px',
                    backgroundColor: '#3b82f6',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: isLoading ? 'not-allowed' : 'pointer',
                    fontWeight: 'bold'
                  }}
                >
                  {isLoading ? 'Loading...' : 'View'}
                </button>
              </div>
            </div>

            {htlcDetails && (
              <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#f3f4f6', borderRadius: '4px' }}>
                <table style={{ width: '100%', fontSize: '14px' }}>
                  <tbody>
                    <tr>
                      <td style={{ padding: '8px 0', fontWeight: 'bold', color: '#555' }}>Sender:</td>
                      <td style={{ padding: '8px 0', wordBreak: 'break-all', fontSize: '12px' }}>{htlcDetails.sender}</td>
                    </tr>
                    <tr>
                      <td style={{ padding: '8px 0', fontWeight: 'bold', color: '#555' }}>Receiver:</td>
                      <td style={{ padding: '8px 0', wordBreak: 'break-all', fontSize: '12px' }}>{htlcDetails.receiver}</td>
                    </tr>
                    <tr>
                      <td style={{ padding: '8px 0', fontWeight: 'bold', color: '#555' }}>Amount:</td>
                      <td style={{ padding: '8px 0' }}>{htlcDetails.amount} PUSH</td>
                    </tr>
                    <tr>
                      <td style={{ padding: '8px 0', fontWeight: 'bold', color: '#555' }}>Hash Lock:</td>
                      <td style={{ padding: '8px 0', wordBreak: 'break-all', fontSize: '12px' }}>{htlcDetails.hashLock}</td>
                    </tr>
                    <tr>
                      <td style={{ padding: '8px 0', fontWeight: 'bold', color: '#555' }}>Time Lock:</td>
                      <td style={{ padding: '8px 0' }}>{htlcDetails.timeLock}</td>
                    </tr>
                    <tr>
                      <td style={{ padding: '8px 0', fontWeight: 'bold', color: '#555' }}>Remaining Time:</td>
                      <td style={{ padding: '8px 0' }}>
                        {remainingTime > 0 
                          ? `${Math.floor(remainingTime / 60)} minutes ${remainingTime % 60} seconds`
                          : 'Expired'
                        }
                      </td>
                    </tr>
                    <tr>
                      <td style={{ padding: '8px 0', fontWeight: 'bold', color: '#555' }}>Status:</td>
                      <td style={{ padding: '8px 0' }}>
                        {htlcDetails.withdrawn 
                          ? <span style={{ color: '#10b981', fontWeight: 'bold' }}>✓ Withdrawn</span>
                          : htlcDetails.refunded 
                          ? <span style={{ color: '#ef4444', fontWeight: 'bold' }}>↺ Refunded</span>
                          : <span style={{ color: '#f59e0b', fontWeight: 'bold' }}>⏳ Active</span>
                        }
                      </td>
                    </tr>
                    <tr>
                      <td style={{ padding: '8px 0', fontWeight: 'bold', color: '#555' }}>Sender Chain:</td>
                      <td style={{ padding: '8px 0' }}>{htlcDetails.senderChain || 'N/A'}</td>
                    </tr>
                    <tr>
                      <td style={{ padding: '8px 0', fontWeight: 'bold', color: '#555' }}>Receiver Chain:</td>
                      <td style={{ padding: '8px 0' }}>{htlcDetails.receiverChain || 'N/A'}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {statusMessage && (
          <div style={{ 
            marginTop: '20px', 
            padding: '15px', 
            backgroundColor: statusMessage.includes('Error') ? '#fee2e2' : '#dbeafe', 
            borderRadius: '8px',
            borderLeft: `4px solid ${statusMessage.includes('Error') ? '#ef4444' : '#3b82f6'}`
          }}>
            <p style={{ margin: 0, color: statusMessage.includes('Error') ? '#991b1b' : '#1e40af', fontSize: '14px' }}>
              {statusMessage}
            </p>
          </div>
        )}

        {txHash && pushChainClient && (
          <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#f3f4f6', borderRadius: '8px' }}>
            <p style={{ margin: '0 0 5px 0', fontWeight: 'bold', color: '#374151' }}>Transaction Hash:</p>
            <a
              href={pushChainClient.explorer.getTransactionUrl(txHash)}
              target='_blank'
              rel='noopener noreferrer'
              style={{ 
                color: '#d946ef', 
                textDecoration: 'underline',
                wordBreak: 'break-all',
                fontSize: '12px'
              }}
            >
              {txHash}
            </a>
          </div>
        )}

        <div style={{ marginTop: '30px', padding: '20px', backgroundColor: '#f9fafb', borderRadius: '8px' }}>
          <h4 style={{ marginTop: 0, color: '#374151' }}>How HTLCs Work:</h4>
          <ol style={{ paddingLeft: '20px', color: '#6b7280', fontSize: '14px', lineHeight: '1.6' }}>
            <li><strong>Create:</strong> Sender locks funds with a hash of a secret and time limit</li>
            <li><strong>Withdraw:</strong> Receiver provides the secret to unlock funds before timeout</li>
            <li><strong>Refund:</strong> Sender can reclaim funds after the time lock expires</li>
          </ol>
          <div style={{ marginTop: '15px', padding: '10px', backgroundColor: '#fef3c7', borderRadius: '4px' }}>
            <p style={{ margin: 0, fontSize: '13px', color: '#92400e' }}>
              💡 <strong>Tip:</strong> Keep your secret phrase safe! You'll need it to withdraw funds. The hash ensures security while allowing verification.
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

export default UniversalHTLCApp;