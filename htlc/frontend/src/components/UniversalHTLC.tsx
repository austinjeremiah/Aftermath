'use client'

import React, { useState, useEffect } from 'react';
import { useAccount, useWriteContract, useReadContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseEther, formatEther, keccak256, toBytes, toHex } from 'viem';
import { Clock, Lock, Unlock, Loader2, AlertCircle, CheckCircle2, Copy, Key } from 'lucide-react';

const CONTRACT_ADDRESS = '0xd268Cc07f3973ddc47321bc215Ea0baAb409A849';

const CONTRACT_ABI = [
  {
    "inputs": [
      {"internalType": "address","name": "_receiver","type": "address"},
      {"internalType": "bytes32","name": "_hashLock","type": "bytes32"},
      {"internalType": "uint256","name": "_timeLockDuration","type": "uint256"}
    ],
    "name": "createHTLC",
    "outputs": [{"internalType": "bytes32","name": "contractId","type": "bytes32"}],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [
      {"internalType": "bytes32","name": "_contractId","type": "bytes32"},
      {"internalType": "bytes32","name": "_preimage","type": "bytes32"}
    ],
    "name": "withdraw",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "bytes32","name": "_contractId","type": "bytes32"}],
    "name": "refund",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "bytes32","name": "_contractId","type": "bytes32"}],
    "name": "getHTLC",
    "outputs": [
      {"internalType": "address","name": "sender","type": "address"},
      {"internalType": "address","name": "receiver","type": "address"},
      {"internalType": "uint256","name": "amount","type": "uint256"},
      {"internalType": "bytes32","name": "hashLock","type": "bytes32"},
      {"internalType": "uint256","name": "timeLock","type": "uint256"},
      {"internalType": "bool","name": "withdrawn","type": "bool"},
      {"internalType": "bool","name": "refunded","type": "bool"},
      {"internalType": "string","name": "senderChain","type": "string"},
      {"internalType": "string","name": "receiverChain","type": "string"}
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "bytes32","name": "_contractId","type": "bytes32"}],
    "name": "isExpired",
    "outputs": [{"internalType": "bool","name": "","type": "bool"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "bytes32","name": "_contractId","type": "bytes32"}],
    "name": "getRemainingTime",
    "outputs": [{"internalType": "uint256","name": "","type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getContractBalance",
    "outputs": [{"internalType": "uint256","name": "","type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  }
] as const;

export default function UniversalHTLC() {
  const { address, isConnected, chain } = useAccount();
  const [amount, setAmount] = useState('');
  const [receiver, setReceiver] = useState('');
  const [lockDuration, setLockDuration] = useState('60');
  const [timeUnit, setTimeUnit] = useState<'seconds' | 'minutes' | 'hours'>('seconds');
  const [secret, setSecret] = useState('');
  const [generatedSecret, setGeneratedSecret] = useState('');
  const [hashLock, setHashLock] = useState('');
  const [contractId, setContractId] = useState('');
  const [preimage, setPreimage] = useState('');
  const [activeTab, setActiveTab] = useState<'create' | 'withdraw' | 'refund'>('create');
  const [notification, setNotification] = useState<{type: 'success' | 'error', message: string} | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Read contract balance
  const { data: contractBalance } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: CONTRACT_ABI,
    functionName: 'getContractBalance',
  });

  // Write contract hooks
  const { data: createHash, writeContract: createHTLC, isPending: isCreating } = useWriteContract();
  const { data: withdrawHash, writeContract: withdrawHTLC, isPending: isWithdrawing } = useWriteContract();
  const { data: refundHash, writeContract: refundHTLC, isPending: isRefunding } = useWriteContract();

  // Wait for transactions
  const { isLoading: isCreateConfirming, isSuccess: isCreateSuccess } = useWaitForTransactionReceipt({ hash: createHash });
  const { isLoading: isWithdrawConfirming, isSuccess: isWithdrawSuccess } = useWaitForTransactionReceipt({ hash: withdrawHash });
  const { isLoading: isRefundConfirming, isSuccess: isRefundSuccess } = useWaitForTransactionReceipt({ hash: refundHash });

  useEffect(() => {
    if (isCreateSuccess) {
      setNotification({ type: 'success', message: 'HTLC created successfully!' });
      setTimeout(() => setNotification(null), 5000);
    }
  }, [isCreateSuccess]);

  useEffect(() => {
    if (isWithdrawSuccess) {
      setNotification({ type: 'success', message: 'Assets withdrawn successfully!' });
      setContractId('');
      setPreimage('');
      setTimeout(() => setNotification(null), 5000);
    }
  }, [isWithdrawSuccess]);

  useEffect(() => {
    if (isRefundSuccess) {
      setNotification({ type: 'success', message: 'Assets refunded successfully!' });
      setContractId('');
      setTimeout(() => setNotification(null), 5000);
    }
  }, [isRefundSuccess]);

  const generateSecret = () => {
    const randomSecret = '0x' + Array.from(crypto.getRandomValues(new Uint8Array(32)))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    setSecret(randomSecret);
    setGeneratedSecret(randomSecret);
    const hash = keccak256(toBytes(randomSecret));
    setHashLock(hash);
  };

  const handleCreateHTLC = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      setNotification({ type: 'error', message: 'Please enter a valid amount' });
      setTimeout(() => setNotification(null), 3000);
      return;
    }
    if (!receiver || !receiver.startsWith('0x')) {
      setNotification({ type: 'error', message: 'Please enter a valid receiver address' });
      setTimeout(() => setNotification(null), 3000);
      return;
    }
    if (!hashLock) {
      setNotification({ type: 'error', message: 'Please generate a secret first' });
      setTimeout(() => setNotification(null), 3000);
      return;
    }

    try {
      const multiplier = timeUnit === 'seconds' ? 1 : timeUnit === 'minutes' ? 60 : 3600;
      const timeLockDuration = parseInt(lockDuration) * multiplier;

      createHTLC({
        address: CONTRACT_ADDRESS,
        abi: CONTRACT_ABI,
        functionName: 'createHTLC',
        args: [receiver as `0x${string}`, hashLock as `0x${string}`, BigInt(timeLockDuration)],
        value: parseEther(amount)
      });
    } catch (error: any) {
      console.error('Create HTLC error:', error);
      setNotification({ type: 'error', message: error?.message || 'Failed to create HTLC' });
      setTimeout(() => setNotification(null), 5000);
    }
  };

  const handleWithdraw = async () => {
    if (!contractId) {
      setNotification({ type: 'error', message: 'Please enter a contract ID' });
      setTimeout(() => setNotification(null), 3000);
      return;
    }
    if (!preimage) {
      setNotification({ type: 'error', message: 'Please enter the secret preimage' });
      setTimeout(() => setNotification(null), 3000);
      return;
    }

    try {
      withdrawHTLC({
        address: CONTRACT_ADDRESS,
        abi: CONTRACT_ABI,
        functionName: 'withdraw',
        args: [contractId as `0x${string}`, preimage as `0x${string}`]
      });
    } catch (error: any) {
      setNotification({ type: 'error', message: error?.message || 'Failed to withdraw' });
      setTimeout(() => setNotification(null), 3000);
    }
  };

  const handleRefund = async () => {
    if (!contractId) {
      setNotification({ type: 'error', message: 'Please enter a contract ID' });
      setTimeout(() => setNotification(null), 3000);
      return;
    }

    try {
      refundHTLC({
        address: CONTRACT_ADDRESS,
        abi: CONTRACT_ABI,
        functionName: 'refund',
        args: [contractId as `0x${string}`]
      });
    } catch (error: any) {
      setNotification({ type: 'error', message: error?.message || 'Failed to refund' });
      setTimeout(() => setNotification(null), 3000);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setNotification({ type: 'success', message: 'Copied to clipboard!' });
    setTimeout(() => setNotification(null), 2000);
  };

  if (!mounted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 text-center border border-white/20">
          <Loader2 className="w-16 h-16 text-purple-400 mx-auto mb-4 animate-spin" />
          <p className="text-gray-300">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 text-center border border-white/20">
          <Lock className="w-16 h-16 text-purple-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Connect Your Wallet</h2>
          <p className="text-gray-300">Please connect your wallet to use the Universal HTLC</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4">
      {notification && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg ${
          notification.type === 'success' ? 'bg-green-500' : 'bg-red-500'
        } text-white animate-slide-in`}>
          {notification.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          <span>{notification.message}</span>
        </div>
      )}

      <div className="max-w-4xl mx-auto">
        {/* Wallet Info Header */}
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 p-4 mb-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <p className="text-gray-400 text-sm mb-1">Connected Wallet</p>
              <p className="text-white font-mono text-sm">{address}</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="bg-white/10 px-4 py-2 rounded-lg border border-white/20">
                <p className="text-gray-400 text-xs mb-1">Contract Balance</p>
                <p className="text-white font-semibold text-sm">
                  {contractBalance ? formatEther(contractBalance) : '0'} PC
                </p>
              </div>
              <div className="bg-white/10 px-4 py-2 rounded-lg border border-white/20">
                <p className="text-gray-400 text-xs mb-1">Network</p>
                <p className="text-white font-semibold text-sm">{chain?.name || 'Unknown'}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Universal HTLC</h1>
          <p className="text-gray-300">Hash Time Locked Contracts on Push Chain</p>
        </div>

        <div className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 overflow-hidden">
          <div className="flex border-b border-white/20">
            <button
              onClick={() => setActiveTab('create')}
              className={`flex-1 px-6 py-4 font-semibold transition-colors ${
                activeTab === 'create' ? 'bg-purple-600 text-white' : 'text-gray-300 hover:bg-white/5'
              }`}
            >
              <Lock className="w-5 h-5 inline mr-2" />
              Create HTLC
            </button>
            <button
              onClick={() => setActiveTab('withdraw')}
              className={`flex-1 px-6 py-4 font-semibold transition-colors ${
                activeTab === 'withdraw' ? 'bg-purple-600 text-white' : 'text-gray-300 hover:bg-white/5'
              }`}
            >
              <Unlock className="w-5 h-5 inline mr-2" />
              Withdraw
            </button>
            <button
              onClick={() => setActiveTab('refund')}
              className={`flex-1 px-6 py-4 font-semibold transition-colors ${
                activeTab === 'refund' ? 'bg-purple-600 text-white' : 'text-gray-300 hover:bg-white/5'
              }`}
            >
              <Clock className="w-5 h-5 inline mr-2" />
              Refund
            </button>
          </div>

          <div className="p-6">
            {activeTab === 'create' && (
              <div className="space-y-6">
                <div>
                  <label className="block text-gray-300 mb-2 font-medium">Receiver Address</label>
                  <input
                    type="text"
                    value={receiver}
                    onChange={(e) => setReceiver(e.target.value)}
                    placeholder="0x..."
                    className="w-full bg-white/5 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 font-mono text-sm"
                  />
                </div>

                <div>
                  <label className="block text-gray-300 mb-2 font-medium">Amount (PC)</label>
                  <input
                    type="number"
                    step="0.001"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.0"
                    className="w-full bg-white/5 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-gray-300 mb-2 font-medium">Lock Duration</label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      min="1"
                      value={lockDuration}
                      onChange={(e) => setLockDuration(e.target.value)}
                      className="flex-1 bg-white/5 border border-white/20 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-purple-500"
                    />
                    <select
                      value={timeUnit}
                      onChange={(e) => setTimeUnit(e.target.value as 'seconds' | 'minutes' | 'hours')}
                      className="bg-white/5 border border-white/20 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-purple-500"
                    >
                      <option value="seconds">Seconds</option>
                      <option value="minutes">Minutes</option>
                      <option value="hours">Hours</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-gray-300 mb-2 font-medium">Secret & Hash Lock</label>
                  <button
                    onClick={generateSecret}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition-colors flex items-center justify-center gap-2 mb-3"
                  >
                    <Key className="w-5 h-5" />
                    Generate Secret
                  </button>
                  
                  {generatedSecret && (
                    <div className="space-y-3">
                      <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
                        <div className="flex items-start gap-2">
                          <AlertCircle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="text-yellow-500 font-semibold text-sm">Save this secret!</p>
                            <p className="text-yellow-300 text-xs mt-1">
                              The receiver will need this secret to withdraw the funds. Keep it safe!
                            </p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="bg-white/5 border border-white/20 rounded-lg p-3">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-gray-400 text-xs font-medium">Secret (Preimage)</span>
                          <button
                            onClick={() => copyToClipboard(generatedSecret)}
                            className="text-purple-400 hover:text-purple-300 transition-colors"
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                        </div>
                        <p className="text-white font-mono text-xs break-all">{generatedSecret}</p>
                      </div>
                      
                      <div className="bg-white/5 border border-white/20 rounded-lg p-3">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-gray-400 text-xs font-medium">Hash Lock</span>
                          <button
                            onClick={() => copyToClipboard(hashLock)}
                            className="text-purple-400 hover:text-purple-300 transition-colors"
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                        </div>
                        <p className="text-white font-mono text-xs break-all">{hashLock}</p>
                      </div>
                    </div>
                  )}
                </div>

                <button
                  onClick={handleCreateHTLC}
                  disabled={isCreating || isCreateConfirming || !hashLock}
                  className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white font-semibold py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  {(isCreating || isCreateConfirming) ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      {isCreating ? 'Confirming...' : 'Processing...'}
                    </>
                  ) : (
                    <>
                      <Lock className="w-5 h-5" />
                      Create HTLC
                    </>
                  )}
                </button>
              </div>
            )}

            {activeTab === 'withdraw' && (
              <div className="space-y-6">
                <div>
                  <label className="block text-gray-300 mb-2 font-medium">Contract ID</label>
                  <input
                    type="text"
                    value={contractId}
                    onChange={(e) => setContractId(e.target.value)}
                    placeholder="0x..."
                    className="w-full bg-white/5 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 font-mono text-sm"
                  />
                </div>

                <div>
                  <label className="block text-gray-300 mb-2 font-medium">Secret (Preimage)</label>
                  <input
                    type="text"
                    value={preimage}
                    onChange={(e) => setPreimage(e.target.value)}
                    placeholder="0x..."
                    className="w-full bg-white/5 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 font-mono text-sm"
                  />
                </div>

                <HTLCDetails contractId={contractId} />

                <button
                  onClick={handleWithdraw}
                  disabled={isWithdrawing || isWithdrawConfirming}
                  className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white font-semibold py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  {(isWithdrawing || isWithdrawConfirming) ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      {isWithdrawing ? 'Confirming...' : 'Processing...'}
                    </>
                  ) : (
                    <>
                      <Unlock className="w-5 h-5" />
                      Withdraw Assets
                    </>
                  )}
                </button>
              </div>
            )}

            {activeTab === 'refund' && (
              <div className="space-y-6">
                <div>
                  <label className="block text-gray-300 mb-2 font-medium">Contract ID</label>
                  <input
                    type="text"
                    value={contractId}
                    onChange={(e) => setContractId(e.target.value)}
                    placeholder="0x..."
                    className="w-full bg-white/5 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 font-mono text-sm"
                  />
                </div>

                <HTLCDetails contractId={contractId} />

                <button
                  onClick={handleRefund}
                  disabled={isRefunding || isRefundConfirming}
                  className="w-full bg-red-600 hover:bg-red-700 disabled:bg-gray-600 text-white font-semibold py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  {(isRefunding || isRefundConfirming) ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      {isRefunding ? 'Confirming...' : 'Processing...'}
                    </>
                  ) : (
                    <>
                      <Clock className="w-5 h-5" />
                      Refund Assets
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function HTLCDetails({ contractId }: { contractId: string }) {
  const { data: htlcData } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: CONTRACT_ABI,
    functionName: 'getHTLC',
    args: contractId && contractId.startsWith('0x') ? [contractId as `0x${string}`] : undefined,
    query: { enabled: !!contractId && contractId.startsWith('0x') }
  });

  const { data: remainingTime } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: CONTRACT_ABI,
    functionName: 'getRemainingTime',
    args: contractId && contractId.startsWith('0x') ? [contractId as `0x${string}`] : undefined,
    query: { enabled: !!contractId && contractId.startsWith('0x'), refetchInterval: 1000 }
  });

  if (!contractId) return null;
  if (!htlcData) return <p className="text-gray-400 text-center py-4">Enter a contract ID to view details</p>;

  const [sender, receiver, amount, hashLock, timeLock, withdrawn, refunded, senderChain, receiverChain] = htlcData;
  const unlockDate = new Date(Number(timeLock) * 1000);
  const isExpired = Number(remainingTime) === 0;

  return (
    <div className="bg-white/5 rounded-lg p-4 space-y-3 border border-white/20">
      <h3 className="text-white font-semibold mb-3">HTLC Details</h3>
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-400">Sender:</span>
          <span className="text-white font-mono text-xs">{sender.slice(0, 6)}...{sender.slice(-4)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-400">Receiver:</span>
          <span className="text-white font-mono text-xs">{receiver.slice(0, 6)}...{receiver.slice(-4)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-400">Amount:</span>
          <span className="text-white font-semibold">{formatEther(amount)} PC</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-400">Hash Lock:</span>
          <span className="text-white font-mono text-xs">{hashLock.slice(0, 10)}...</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-400">Unlock Time:</span>
          <span className="text-white text-xs">{unlockDate.toLocaleString()}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-400">Remaining Time:</span>
          <span className="text-white font-semibold">
            {isExpired ? 'Expired' : `${remainingTime?.toString()}s`}
          </span>
        </div>
        {senderChain && (
          <div className="flex justify-between">
            <span className="text-gray-400">Sender Chain:</span>
            <span className="text-white text-xs">{senderChain}</span>
          </div>
        )}
        {receiverChain && (
          <div className="flex justify-between">
            <span className="text-gray-400">Receiver Chain:</span>
            <span className="text-white text-xs">{receiverChain}</span>
          </div>
        )}
        <div className="flex justify-between">
          <span className="text-gray-400">Status:</span>
          <span className={`font-semibold ${
            withdrawn ? 'text-green-400' : refunded ? 'text-gray-400' : isExpired ? 'text-red-400' : 'text-yellow-400'
          }`}>
            {withdrawn ? 'Withdrawn' : refunded ? 'Refunded' : isExpired ? 'Expired' : 'Active'}
          </span>
        </div>
      </div>
    </div>
  );
}