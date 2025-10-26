export const DEADMAN_SWITCH_ABI = [
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

export const CONTRACT_ADDRESS = '0x1B7266696133D1B2063373e960e7F39393B3C81A';