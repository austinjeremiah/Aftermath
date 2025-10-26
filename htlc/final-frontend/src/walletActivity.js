import axios from 'axios';


const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY;
const ALCHEMY_KEY = process.env.ALCHEMY_KEY;

/**
 * Supported networks with their API endpoints
 */
const NETWORKS = {
  ethereum: {
    mainnet: {
      type: 'etherscan',
      url: `https://api.etherscan.io/api`,
      apiKey: ETHERSCAN_API_KEY
    },
    testnet: {
      type: 'etherscan',
      url: `https://api-sepolia.etherscan.io/api`,
      apiKey: ETHERSCAN_API_KEY
    }
  },
  polygon: {
    mainnet: {
      type: 'etherscan',
      url: `https://api.polygonscan.com/api`,
      apiKey: ETHERSCAN_API_KEY
    },
    testnet: {
      type: 'alchemy',
      url: `https://polygon-amoy.g.alchemy.com/v2/${ALCHEMY_KEY}`
    }
  },
  arbitrum: {
    mainnet: {
      type: 'etherscan',
      url: `https://api.arbiscan.io/api`,
      apiKey: ETHERSCAN_API_KEY
    },
    testnet: {
      type: 'alchemy',
      url: `https://arb-sepolia.g.alchemy.com/v2/${ALCHEMY_KEY}`
    }
  },
  optimism: {
    mainnet: {
      type: 'etherscan',
      url: `https://api-optimistic.etherscan.io/api`,
      apiKey: ETHERSCAN_API_KEY
    },
    testnet: {
      type: 'alchemy',
      url: `https://opt-sepolia.g.alchemy.com/v2/${ALCHEMY_KEY}`
    }
  },
  base: {
    mainnet: {
      type: 'etherscan',
      url: `https://api.basescan.org/api`,
      apiKey: ETHERSCAN_API_KEY
    },
    testnet: {
      type: 'alchemy',
      url: `https://base-sepolia.g.alchemy.com/v2/${ALCHEMY_KEY}`
    }
  },
  bsc: {
    mainnet: {
      type: 'etherscan',
      url: `https://api.bscscan.com/api`,
      apiKey: ETHERSCAN_API_KEY
    },
    testnet: {
      type: 'etherscan',
      url: `https://api-testnet.bscscan.com/api`,
      apiKey: ETHERSCAN_API_KEY
    }
  },
  avalanche: {
    mainnet: {
      type: 'etherscan',
      url: `https://api.snowtrace.io/api`,
      apiKey: ETHERSCAN_API_KEY
    },
    testnet: {
      type: 'etherscan',
      url: `https://api-testnet.snowtrace.io/api`,
      apiKey: ETHERSCAN_API_KEY
    }
  },
  solana: {
    mainnet: {
      type: 'solana',
      url: `https://solana-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}`
    },
    testnet: {
      type: 'solana',
      url: `https://solana-devnet.g.alchemy.com/v2/${ALCHEMY_KEY}`
    }
  }
};

/**
 * Fetches the last wallet activity using Etherscan-like API
 */
const getEtherscanActivity = async (config, address) => {
  const url = `${config.url}?module=account&action=txlist&address=${address}&sort=desc&apikey=${config.apiKey}`;
  const res = await axios.get(url);

  if (res.data.status === "1" && res.data.result.length > 0) {
    const latestTx = res.data.result[0];
    const lastTxTime = parseInt(latestTx.timeStamp);
    
    return {
      found: true,
      hash: latestTx.hash,
      timestamp: lastTxTime,
      date: new Date(lastTxTime * 1000).toLocaleString(),
      from: latestTx.from,
      to: latestTx.to,
      value: latestTx.value
    };
  } else {
    return { 
      found: false, 
      message: "No transactions found" 
    };
  }
};

/**
 * Fetches the last wallet activity using Alchemy RPC
 */
const getAlchemyActivity = async (url, address) => {
  const payload = {
    jsonrpc: "2.0",
    id: 1,
    method: "alchemy_getAssetTransfers",
    params: [
      {
        fromBlock: "0x0",
        toBlock: "latest",
        category: ["external", "internal", "erc20", "erc721", "erc1155"],
        withMetadata: true,
        maxCount: "0x1",
        order: "desc",
        toAddress: address,
        fromAddress: address,
      },
    ],
  };

  const res = await axios.post(url, payload);
  const tx = res.data.result?.transfers?.[0];

  if (!tx) {
    return { found: false, message: "No transactions found" };
  }

  const timestamp = tx.metadata?.blockTimestamp
    ? new Date(tx.metadata.blockTimestamp)
    : null;

  return {
    found: true,
    hash: tx.hash,
    asset: tx.asset,
    value: tx.value,
    timestamp: timestamp ? Math.floor(timestamp.getTime() / 1000) : 0,
    date: timestamp ? timestamp.toLocaleString() : "Unknown",
  };
};

/**
 * Fetches the last wallet activity for Solana
 */
const getSolanaActivity = async (url, address) => {
  const payload = {
    jsonrpc: "2.0",
    id: 1,
    method: "getSignaturesForAddress",
    params: [address, { limit: 1 }],
  };

  const res = await axios.post(url, payload);
  const tx = res.data.result?.[0];

  if (!tx) {
    return { found: false, message: "No transactions found" };
  }

  const timestamp = tx.blockTime ? new Date(tx.blockTime * 1000) : null;

  return {
    found: true,
    signature: tx.signature,
    timestamp: tx.blockTime || 0,
    date: timestamp ? timestamp.toLocaleString() : "Unknown",
  };
};

/**
 * Fetches the last wallet activity for a given address on a specific chain
 * 
 * @param {string} chain - Chain name (ethereum, polygon, arbitrum, optimism, base, bsc, avalanche, solana)
 * @param {string} network - 'mainnet' or 'testnet'
 * @param {string} address - Wallet address
 * @returns {Promise<Object>} Latest transaction info or message
 */
export const getLastWalletActivity = async (chain, network, address) => {
  try {
    const config = NETWORKS[chain]?.[network];
    if (!config) {
      throw new Error(`Unsupported chain or network: ${chain}/${network}`);
    }

    let result;
    
    switch (config.type) {
      case 'etherscan':
        result = await getEtherscanActivity(config, address);
        break;
      case 'alchemy':
        result = await getAlchemyActivity(config.url, address);
        break;
      case 'solana':
        result = await getSolanaActivity(config.url, address);
        break;
      default:
        throw new Error(`Unknown config type: ${config.type}`);
    }

    return {
      chain,
      network,
      ...result
    };
  } catch (error) {
    console.error(`Error fetching ${chain} activity:`, error.message);
    return { 
      chain, 
      network, 
      found: false, 
      message: error.message 
    };
  }
};

/**
 * Formats a duration in seconds to a human-readable string
 * Breaks down seconds into days, hours, minutes, and seconds
 * 
 * @param {number} seconds - Duration in seconds
 * @returns {string} Formatted duration string (e.g., "2d 3h 15m 30s")
 * 
 * @example
 * formatDuration(90061) // Returns "1d 1h 1m 1s"
 * formatDuration(3661)  // Returns "1h 1m 1s"
 * formatDuration(61)    // Returns "1m 1s"
 * formatDuration(0)     // Returns "0s"
 */
export const formatDuration = (seconds) => {
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

// Example usage:
(async () => {
  const evmAddress = "0xb1C0fd1C9e63E12eb669eF2136F7727";
  const solanaAddress = "9z76kFzRr4iCQQ9vwQbpVv5Lt9LADi4qYq7fXe8yHuK";

  console.log(await getLastWalletActivity("ethereum", "mainnet", evmAddress));
  console.log(await getLastWalletActivity("polygon", "mainnet", evmAddress));
  console.log(await getLastWalletActivity("bsc", "mainnet", evmAddress));
  console.log(await getLastWalletActivity("avalanche", "mainnet", evmAddress));
  console.log(await getLastWalletActivity("solana", "testnet", solanaAddress));
})();
