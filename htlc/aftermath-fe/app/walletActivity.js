import axios from 'axios';

const ALCHEMY_KEY = process.env.ALCHEMY_KEY;

console.log('ALCHEMY_KEY:', ALCHEMY_KEY ? 'Set ✓' : 'MISSING ✗');

/**
 * Supported networks with Alchemy endpoints
 */
const NETWORKS = {
  ethereum: {
    mainnet: {
      type: 'alchemy',
      url: `https://eth-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}`
    },
    testnet: {
      type: 'alchemy',
      url: `https://eth-sepolia.g.alchemy.com/v2/${ALCHEMY_KEY}`
    }
  },
  polygon: {
    mainnet: {
      type: 'alchemy',
      url: `https://polygon-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}`
    },
    testnet: {
      type: 'alchemy',
      url: `https://polygon-amoy.g.alchemy.com/v2/${ALCHEMY_KEY}`
    }
  },
  arbitrum: {
    mainnet: {
      type: 'alchemy',
      url: `https://arb-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}`
    },
    testnet: {
      type: 'alchemy',
      url: `https://arb-sepolia.g.alchemy.com/v2/${ALCHEMY_KEY}`
    }
  },
  optimism: {
    mainnet: {
      type: 'alchemy',
      url: `https://opt-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}`
    },
    testnet: {
      type: 'alchemy',
      url: `https://opt-sepolia.g.alchemy.com/v2/${ALCHEMY_KEY}`
    }
  },
  base: {
    mainnet: {
      type: 'alchemy',
      url: `https://base-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}`
    },
    testnet: {
      type: 'alchemy',
      url: `https://base-sepolia.g.alchemy.com/v2/${ALCHEMY_KEY}`
    }
  }
};

/**
 * Fetches the last wallet activity using Alchemy RPC
 */
const getAlchemyActivity = async (url, address) => {
  try {
    // Try to get transactions where address is sender OR receiver
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
          order: "desc"
        }
      ]
    };

    // First, try getting transactions sent FROM this address
    payload.params[0].fromAddress = address;
    let res = await axios.post(url, payload);
    let txFrom = res.data.result?.transfers?.[0];

    // Then, try getting transactions sent TO this address
    delete payload.params[0].fromAddress;
    payload.params[0].toAddress = address;
    res = await axios.post(url, payload);
    let txTo = res.data.result?.transfers?.[0];

    // Pick the most recent one
    let tx = null;
    if (txFrom && txTo) {
      const timeFrom = new Date(txFrom.metadata.blockTimestamp).getTime();
      const timeTo = new Date(txTo.metadata.blockTimestamp).getTime();
      tx = timeFrom > timeTo ? txFrom : txTo;
    } else {
      tx = txFrom || txTo;
    }

    if (!tx) {
      return { found: false, message: "No transactions found" };
    }

    const timestamp = tx.metadata?.blockTimestamp
      ? new Date(tx.metadata.blockTimestamp)
      : null;

    return {
      found: true,
      hash: tx.hash,
      from: tx.from,
      to: tx.to,
      asset: tx.asset,
      value: tx.value,
      blockNum: tx.blockNum,
      timestamp: timestamp ? Math.floor(timestamp.getTime() / 1000) : 0,
      date: timestamp ? timestamp.toLocaleString() : "Unknown",
    };
  } catch (error) {
    return { found: false, message: error.message };
  }
};

/**
 * Fetches the last wallet activity for a given address on a specific chain
 * 
 * @param {string} chain - Chain name (ethereum, polygon, arbitrum, optimism, base)
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

    const result = await getAlchemyActivity(config.url, address);

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
  const evmAddress = "0xb1C0fd1C9e63E12eb669eF2136F7727F035717b4"; // Replace with your actual address

  console.log("\n=== ETHEREUM ===");
  console.log("Mainnet:", await getLastWalletActivity("ethereum", "mainnet", evmAddress));
  console.log("Testnet (Sepolia):", await getLastWalletActivity("ethereum", "testnet", evmAddress));
  
  console.log("\n=== POLYGON ===");
  console.log("Mainnet:", await getLastWalletActivity("polygon", "mainnet", evmAddress));
  console.log("Testnet (Amoy):", await getLastWalletActivity("polygon", "testnet", evmAddress));
  
  console.log("\n=== ARBITRUM ===");
  console.log("Mainnet:", await getLastWalletActivity("arbitrum", "mainnet", evmAddress));
  console.log("Testnet (Sepolia):", await getLastWalletActivity("arbitrum", "testnet", evmAddress));
  
  console.log("\n=== OPTIMISM ===");
  console.log("Mainnet:", await getLastWalletActivity("optimism", "mainnet", evmAddress));
  console.log("Testnet (Sepolia):", await getLastWalletActivity("optimism", "testnet", evmAddress));
  
  console.log("\n=== BASE ===");
  console.log("Mainnet:", await getLastWalletActivity("base", "mainnet", evmAddress));
  console.log("Testnet (Sepolia):", await getLastWalletActivity("base", "testnet", evmAddress));
})();
