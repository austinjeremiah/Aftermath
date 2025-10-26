import axios from 'axios';

const ETHERSCAN_API_KEY = "95E2VDJW1M1ZC6BXVBXDN5WAG9Z3TSV1AY";

/**
 * Fetches the last wallet activity (transaction) for a given Ethereum address
 * Uses Etherscan API to retrieve the most recent transaction
 * 
 * @param {string} address - The Ethereum wallet address to check
 * @returns {Promise<Object>} Object containing:
 *   - timestamp: Unix timestamp of the last transaction
 *   - date: Formatted date string of the last transaction
 *   - found: Boolean indicating if transactions were found
 *   - message: Error or info message (optional)
 */
export const getLastWalletActivity = async (address) => {
  try {
    const url = `https://api.etherscan.io/api?module=account&action=txlist&address=${address}&sort=desc&apikey=${ETHERSCAN_API_KEY}`;

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
      return { 
        timestamp: 0, 
        found: false, 
        message: "No transactions found" 
      };
    }
  } catch (error) {
    console.error("Error fetching wallet activity:", error);
    return { 
      timestamp: 0, 
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