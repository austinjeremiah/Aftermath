const axios = require("axios");

const senderAddress = "0xb1C0fd1C9e63E12eb669eF2136F7727F035717b4";
const apiKey = "95E2VDJW1M1ZC6BXVBXDN5WAG9Z3TSV1AY"; // Get one free from https://etherscan.io/myapikey

async function getLastWalletActivity() {
  try {
    console.log(pushChainClient.universal);
    const url = `https://api.etherscan.io/api
      ?module=account
      &action=txlist
      &address=${senderAddress}
      &sort=desc
      &apikey=${apiKey}`;

    const res = await axios.get(url.replace(/\s+/g, ""));

    if (res.data.status === "1" && res.data.result.length > 0) {
      const latestTx = res.data.result[0];
      const lastTxTime = parseInt(latestTx.timeStamp);
      const lastTxDate = new Date(lastTxTime * 1000);
      console.log(`Latest wallet activity timestamp: ${lastTxTime}`);
      console.log(`Latest wallet activity date: ${lastTxDate}`);
    } else {
      console.log("No transactions found for this wallet yet.");
    }
  } catch (error) {
    console.error("Error fetching wallet activity:", error.message);
  }
}

getLastWalletActivity();
