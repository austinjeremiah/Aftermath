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

function UniversalCounterExample() {
  const walletConfig = {
    network: PushUI.CONSTANTS.PUSH_NETWORK.TESTNET,
  };

  const UCDynamicABI = [
    { "inputs": [], "stateMutability": "nonpayable", "type": "constructor" },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "newCount",
          "type": "uint256"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "newCountUnique",
          "type": "uint256"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "caller",
          "type": "address"
        },
        {
          "indexed": false,
          "internalType": "string",
          "name": "chainNamespace",
          "type": "string"
        },
        {
          "indexed": false,
          "internalType": "string",
          "name": "chainId",
          "type": "string"
        }
      ],
      "name": "CountIncremented",
      "type": "event"
    },
    {
      "inputs": [{ "internalType": "bytes", "name": "", "type": "bytes" }],
      "name": "chainCount",
      "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [{ "internalType": "bytes", "name": "", "type": "bytes" }],
      "name": "chainCountUnique",
      "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
      "name": "chainIds",
      "outputs": [{ "internalType": "bytes", "name": "", "type": "bytes" }],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [{ "internalType": "address", "name": "", "type": "address" }],
      "name": "chainUsers",
      "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "getCount",
      "outputs": [
        { "internalType": "uint256", "name": "count", "type": "uint256" },
        { "internalType": "uint256", "name": "countUnique", "type": "uint256" }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "increment",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
  ];

  const COUNTER_CONTRACT_ADDRESS = '0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9';

  function Component() {
    const { connectionStatus } = usePushWalletContext();
    const { pushChainClient } = usePushChainClient();
    const { PushChain } = usePushChain();

    const [counter, setCounter] = useState(0);
    const [chainData, setChainData] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [txHash, setTxHash] = useState("");

    const fetchCounter = async () => {
      try {
        const provider = new ethers.JsonRpcProvider(
          'https://evm.rpc-testnet-donut-node1.push.org/'
        );

        const contract = new ethers.Contract(
          COUNTER_CONTRACT_ADDRESS,
          UCDynamicABI,
          provider
        );

        const [totalCount] = await contract.getCount();
        setCounter(Number(totalCount));

        const newChainData = [];
        let chainIndex = 0;

        try {
          while (true) {
            const chainHash = await contract.chainIds(chainIndex);
            const count = await contract.chainCount(chainHash);
            const uniqueCount = await contract.chainCountUnique(chainHash);

            newChainData.push({
              chainHash: ethers.hexlify(chainHash),
              count: Number(count),
              uniqueCount: Number(uniqueCount)
            });

            chainIndex++;
          }
        } catch (error) {
          // Expected error when we reach the end of the array
        }
        setChainData(newChainData);
      } catch (err) {
        console.error("Error reading counter:", err);
      }
    };

    const handleSendTransaction = async () => {
      if (pushChainClient) {
        try {
          setIsLoading(true);

          const tx = await pushChainClient.universal.sendTransaction({
            to: COUNTER_CONTRACT_ADDRESS,
            data: PushChain.utils.helpers.encodeTxData({
              abi: UCDynamicABI,
              functionName: "increment",
            }),
            value: BigInt(0),
          });

          setTxHash(tx.hash);
          await tx.wait();
          await fetchCounter();
          setIsLoading(false);
        } catch (err) {
          console.error("Transaction error:", err);
          setIsLoading(false);
        }
      } else {
        console.log("Please connect your wallet first");
      }
    };

    useEffect(() => {
      fetchCounter();
    }, []);

    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', padding: '20px' }}>
        <h2>Universal Counter Example</h2>
        <PushUniversalAccountButton />

        {connectionStatus !== PushUI.CONSTANTS.CONNECTION.STATUS.CONNECTED && (
          <p>Please connect your wallet to interact with the counter.</p>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', width: '100%' }}>
          <h3>Total Universal Count: {counter === -1 ? '...' : counter}</h3>

          {chainData.length > 0 && (
            <div style={{ marginTop: "2rem", maxWidth: "600px", width: "100%" }}>
              <h3 style={{ fontSize: "1.2rem", marginBottom: "1rem", color: "#333" }}>Chain Data</h3>
              <table style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: "0.9rem",
                backgroundColor: "white",
                borderRadius: "8px",
                overflow: "hidden",
                boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
              }}>
                <thead>
                  <tr style={{ backgroundColor: "#f8f9fa" }}>
                    <th style={{ padding: "12px", textAlign: "left", borderBottom: "1px solid #dee2e6" }}>Chain Name</th>
                    <th style={{ padding: "12px", textAlign: "center", borderBottom: "1px solid #dee2e6" }}>Count</th>
                    <th style={{ padding: "12px", textAlign: "center", borderBottom: "1px solid #dee2e6" }}>Unique Count</th>
                  </tr>
                </thead>
                <tbody>
                  {chainData.map((chain, index) => (
                    <tr key={index} style={{ borderBottom: index < chainData.length - 1 ? "1px solid #dee2e6" : "none" }}>
                      <td style={{ padding: "12px", fontFamily: "monospace", fontSize: "0.8rem", wordBreak: "break-all" }}>
                        {PushChain.utils.chains.getChainName(ethers.toUtf8String(chain.chainHash))}
                      </td>
                      <td style={{ padding: "12px", textAlign: "center", fontWeight: "bold" }}>{chain.count}</td>
                      <td style={{ padding: "12px", textAlign: "center", fontWeight: "bold" }}>{chain.uniqueCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {connectionStatus === PushUI.CONSTANTS.CONNECTION.STATUS.CONNECTED && (
          <div className='counter-container' style={{ display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center' }}>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '20px' }}>
              <button
                className='increment-button'
                onClick={handleSendTransaction}
                disabled={isLoading}
                style={{
                  backgroundColor: '#d946ef',
                  color: 'white',
                  border: 'none',
                  borderRadius: '20px',
                  padding: '8px 16px',
                  fontSize: '14px',
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  fontWeight: 'bold',
                  opacity: isLoading ? 0.6 : 1,
                }}
              >
                {isLoading ? 'Processing...' : 'Increment Counter'}
              </button>

              <button
                className='refresh-button'
                onClick={fetchCounter}
                style={{
                  backgroundColor: '#d946ef',
                  color: 'white',
                  border: 'none',
                  borderRadius: '20px',
                  padding: '8px 16px',
                  fontSize: '14px',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                }}
              >
                Refresh Counter Values
              </button>
            </div>

            {txHash && pushChainClient && (
              <div className='transaction-info' style={{ textAlign: 'center' }}>
                <p>
                  Transaction Hash: <a href={pushChainClient.explorer.getTransactionUrl(txHash)} target='_blank' rel='noreferrer' style={{ color: '#d946ef', textDecoration: 'underline' }}>{txHash}</a>
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <PushUniversalWalletProvider config={walletConfig}>
      <Component />
    </PushUniversalWalletProvider>
  );
}

export default UniversalCounterExample;