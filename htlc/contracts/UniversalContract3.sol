// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22; // Changed from 0.8.22 to 0.8.19

// Universal Account ID Struct
struct UniversalAccountId {
    string chainNamespace;
    string chainId;
    bytes owner;
}

// IUEAFactory Interface
interface IUEAFactory {
    function getOriginForUEA(address addr) external view returns (UniversalAccountId memory account, bool isUEA);
}

contract UniversalHTLC {
    // HTLC Structure
    struct HTLC {
        address sender;
        address receiver;
        uint256 amount;
        bytes32 hashLock;
        uint256 timeLock; // timestamp when contract expires
        bool withdrawn;
        bool refunded;
        string senderChainNamespace;
        string senderChainId;
        string receiverChainNamespace;
        string receiverChainId;
    }

    // Mapping of contract ID to HTLC
    mapping(bytes32 => HTLC) public contracts;

    // Events
    event HTLCCreated(
        bytes32 indexed contractId,
        address indexed sender,
        address indexed receiver,
        uint256 amount,
        bytes32 hashLock,
        uint256 timeLock,
        string senderChain,
        string receiverChain
    );

    event HTLCWithdrawn(
        bytes32 indexed contractId,
        address indexed receiver,
        bytes32 preimage,
        string withdrawChain
    );

    event HTLCRefunded(
        bytes32 indexed contractId,
        address indexed sender,
        string refundChain
    );

    /**
     * @dev Create a new HTLC by locking native PUSH tokens
     * @param _receiver Address of the receiver
     * @param _hashLock Hash of the secret (use keccak256)
     * @param _timeLockDuration Duration in seconds (e.g., 60 for 1 minute)
     */
    function createHTLC(
        address _receiver,
        bytes32 _hashLock,
        uint256 _timeLockDuration
    ) external payable returns (bytes32 contractId) {
        require(_receiver != address(0), "Invalid receiver address");
        require(msg.value > 0, "Must send PUSH tokens");
        require(_hashLock != bytes32(0), "Invalid hash lock");
        require(_timeLockDuration > 0, "Time lock duration must be greater than 0");

        // Get origin chain info for sender
        address caller = msg.sender;
        (UniversalAccountId memory originAccount, bool isUEA) =
            IUEAFactory(0x00000000000000000000000000000000000000eA).getOriginForUEA(caller);

        // Generate unique contract ID
        contractId = keccak256(
            abi.encodePacked(
                caller,
                _receiver,
                msg.value,
                _hashLock,
                block.timestamp
            )
        );

        require(contracts[contractId].sender == address(0), "Contract already exists");

        // Create HTLC (tokens are already locked in contract via msg.value)
        contracts[contractId] = HTLC({
            sender: caller,
            receiver: _receiver,
            amount: msg.value,
            hashLock: _hashLock,
            timeLock: block.timestamp + _timeLockDuration,
            withdrawn: false,
            refunded: false,
            senderChainNamespace: originAccount.chainNamespace,
            senderChainId: originAccount.chainId,
            receiverChainNamespace: "",
            receiverChainId: ""
        });

        emit HTLCCreated(
            contractId,
            caller,
            _receiver,
            msg.value,
            _hashLock,
            block.timestamp + _timeLockDuration,
            string(abi.encodePacked(originAccount.chainNamespace, ":", originAccount.chainId)),
            "TBD"
        );

        return contractId;
    }

    /**
     * @dev Withdraw funds by providing the preimage
     * @param _contractId The contract ID
     * @param _preimage The secret that hashes to hashLock
     */

    function withdraw(bytes32 _contractId, bytes32 _preimage) external {
        HTLC storage htlc = contracts[_contractId];

        require(htlc.sender != address(0), "Contract does not exist");
        require(!htlc.withdrawn, "Already withdrawn");
        require(!htlc.refunded, "Already refunded");
        require(msg.sender == htlc.receiver, "Only receiver can withdraw");
        require(block.timestamp < htlc.timeLock, "Time lock expired");
        require(keccak256(abi.encodePacked(_preimage)) == htlc.hashLock, "Invalid preimage");

        // Get receiver's origin chain info
        (UniversalAccountId memory receiverOrigin, bool isUEA) =
            IUEAFactory(0x00000000000000000000000000000000000000eA).getOriginForUEA(msg.sender);

        htlc.withdrawn = true;
        htlc.receiverChainNamespace = receiverOrigin.chainNamespace;
        htlc.receiverChainId = receiverOrigin.chainId;

        // Transfer native PUSH tokens to receiver
        (bool success, ) = payable(htlc.receiver).call{value: htlc.amount}("");
        require(success, "Transfer failed");

        emit HTLCWithdrawn(
            _contractId,
            htlc.receiver,
            _preimage,
            string(abi.encodePacked(receiverOrigin.chainNamespace, ":", receiverOrigin.chainId))
        );
    }

    /**
     * @dev Refund funds after time lock expires
     * @param _contractId The contract ID
     */
    function refund(bytes32 _contractId) external {
        HTLC storage htlc = contracts[_contractId];

        require(htlc.sender != address(0), "Contract does not exist");
        require(!htlc.withdrawn, "Already withdrawn");
        require(!htlc.refunded, "Already refunded");
        require(msg.sender == htlc.sender, "Only sender can refund");
        require(block.timestamp >= htlc.timeLock, "Time lock not expired");

        htlc.refunded = true;

        // Get refunder's origin chain info
        (UniversalAccountId memory refunderOrigin, bool isUEA) =
            IUEAFactory(0x00000000000000000000000000000000000000eA).getOriginForUEA(msg.sender);

        // Transfer native PUSH tokens back to sender
        (bool success, ) = payable(htlc.sender).call{value: htlc.amount}("");
        require(success, "Transfer failed");

        emit HTLCRefunded(
            _contractId,
            htlc.sender,
            string(abi.encodePacked(refunderOrigin.chainNamespace, ":", refunderOrigin.chainId))
        );
    }

    /**
     * @dev Get HTLC details
     * @param _contractId The contract ID
     */
    function getHTLC(bytes32 _contractId)
        external
        view
        returns (
            address sender,
            address receiver,
            uint256 amount,
            bytes32 hashLock,
            uint256 timeLock,
            bool withdrawn,
            bool refunded,
            string memory senderChain,
            string memory receiverChain
        )
    {
        HTLC storage htlc = contracts[_contractId];
        return (
            htlc.sender,
            htlc.receiver,
            htlc.amount,
            htlc.hashLock,
            htlc.timeLock,
            htlc.withdrawn,
            htlc.refunded,
            string(abi.encodePacked(htlc.senderChainNamespace, ":", htlc.senderChainId)),
            string(abi.encodePacked(htlc.receiverChainNamespace, ":", htlc.receiverChainId))
        );
    }

    /**
     * @dev Check if time lock has expired
     * @param _contractId The contract ID
     */
    function isExpired(bytes32 _contractId) external view returns (bool) {
        return block.timestamp >= contracts[_contractId].timeLock;
    }

    /**
     * @dev Get remaining time in seconds
     * @param _contractId The contract ID
     */
    function getRemainingTime(bytes32 _contractId) external view returns (uint256) {
        HTLC storage htlc = contracts[_contractId];
        if (block.timestamp >= htlc.timeLock) {
            return 0;
        }
        return htlc.timeLock - block.timestamp;
    }

    /**
     * @dev Get contract balance
     */
    function getContractBalance() external view returns (uint256) {
        return address(this).balance;
    }
}
