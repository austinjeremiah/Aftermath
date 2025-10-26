// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

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

contract DeadLockHTLC {
    // Dead Lock Structure
    struct DeadLock {
        address sender;
        address receiver;
        uint256 amount;
        uint256 lastActivityTime;
        uint256 inactivityPeriod; // in seconds
        bool fundsReleased;
        bool cancelled;
        string senderChainNamespace;
        string senderChainId;
        string receiverChainNamespace;
        string receiverChainId;
    }

    // Mapping of lock ID to DeadLock
    mapping(bytes32 => DeadLock) public locks;

    // Mapping to track user's active locks
    mapping(address => bytes32[]) public userLocks;

    // Events
    event DeadLockCreated(
        bytes32 indexed lockId,
        address indexed sender,
        address indexed receiver,
        uint256 amount,
        uint256 inactivityPeriod,
        uint256 lastActivityTime,
        string senderChain
    );

    event ActivityUpdated(
        bytes32 indexed lockId,
        address indexed sender,
        uint256 newActivityTime,
        string updateChain,
        bool autoUpdated
    );

    event FundsReleased(
        bytes32 indexed lockId,
        address indexed receiver,
        uint256 amount,
        string releaseChain
    );

    event LockCancelled(
        bytes32 indexed lockId,
        address indexed sender,
        uint256 amount,
        string cancelChain
    );

    /**
     * @dev Create a new Dead Lock by depositing native PUSH tokens
     * @param _receiver Address who will receive funds after inactivity
     * @param _inactivityPeriod Duration in seconds of inactivity before funds can be released
     */
    function deposit(
        address _receiver,
        uint256 _inactivityPeriod
    ) external payable returns (bytes32 lockId) {
        require(_receiver != address(0), "Invalid receiver address");
        require(_receiver != msg.sender, "Receiver cannot be sender");
        require(msg.value > 0, "Must send PUSH tokens");
        require(_inactivityPeriod > 0, "Inactivity period must be greater than 0");

        // Get origin chain info for sender
        address caller = msg.sender;
        (UniversalAccountId memory originAccount, bool isUEA) =
            IUEAFactory(0x00000000000000000000000000000000000000eA).getOriginForUEA(caller);

        // Generate unique lock ID
        lockId = keccak256(
            abi.encodePacked(
                caller,
                _receiver,
                msg.value,
                block.timestamp,
                _inactivityPeriod
            )
        );

        require(locks[lockId].sender == address(0), "Lock already exists");

        // Create Dead Lock
        locks[lockId] = DeadLock({
            sender: caller,
            receiver: _receiver,
            amount: msg.value,
            lastActivityTime: block.timestamp,
            inactivityPeriod: _inactivityPeriod,
            fundsReleased: false,
            cancelled: false,
            senderChainNamespace: originAccount.chainNamespace,
            senderChainId: originAccount.chainId,
            receiverChainNamespace: "",
            receiverChainId: ""
        });

        // Track user's locks
        userLocks[caller].push(lockId);

        emit DeadLockCreated(
            lockId,
            caller,
            _receiver,
            msg.value,
            _inactivityPeriod,
            block.timestamp,
            string(abi.encodePacked(originAccount.chainNamespace, ":", originAccount.chainId))
        );

        return lockId;
    }

    /**
     * @dev Manual activity update - sender pings to show they're active
     * @param _lockId The lock ID
     */
    function updateActivity(bytes32 _lockId) external {
        DeadLock storage lock = locks[_lockId];

        require(lock.sender != address(0), "Lock does not exist");
        require(msg.sender == lock.sender, "Only sender can update activity");
        require(!lock.fundsReleased, "Funds already released");
        require(!lock.cancelled, "Lock already cancelled");

        // Get origin chain info
        (UniversalAccountId memory originAccount, bool isUEA) =
            IUEAFactory(0x00000000000000000000000000000000000000eA).getOriginForUEA(msg.sender);

        lock.lastActivityTime = block.timestamp;

        emit ActivityUpdated(
            _lockId,
            msg.sender,
            block.timestamp,
            string(abi.encodePacked(originAccount.chainNamespace, ":", originAccount.chainId)),
            false
        );
    }

    /**
     * @dev Internal function to update activity based on wallet transaction timestamp
     * @param _lockId The lock ID
     * @param _lastTxTimestamp Last transaction timestamp from wallet
     */
    function _updateActivityFromWallet(bytes32 _lockId, uint256 _lastTxTimestamp) internal {
        DeadLock storage lock = locks[_lockId];

        // Only update if the provided timestamp is:
        // 1. More recent than the current lastActivityTime
        // 2. Not in the future (with small buffer for block time differences)
        // 3. Lock is still active
        if (_lastTxTimestamp > lock.lastActivityTime && 
            _lastTxTimestamp <= block.timestamp + 300 && // 5 min buffer for timestamp differences
            !lock.fundsReleased && 
            !lock.cancelled) {
            
            uint256 oldActivityTime = lock.lastActivityTime;
            lock.lastActivityTime = _lastTxTimestamp;

            // Get origin chain info
            (UniversalAccountId memory originAccount, bool isUEA) =
                IUEAFactory(0x00000000000000000000000000000000000000eA).getOriginForUEA(lock.sender);

            emit ActivityUpdated(
                _lockId,
                lock.sender,
                _lastTxTimestamp,
                string(abi.encodePacked(originAccount.chainNamespace, ":", originAccount.chainId)),
                true
            );
        }
    }

    /**
     * @dev Release funds to receiver after inactivity period
     * @param _lockId The lock ID
     * @param _senderLastTxTimestamp Last transaction timestamp of sender's wallet (0 if no update needed)
     */
    function releaseFunds(bytes32 _lockId, uint256 _senderLastTxTimestamp) external {
        DeadLock storage lock = locks[_lockId];

        require(lock.sender != address(0), "Lock does not exist");
        require(!lock.fundsReleased, "Funds already released");
        require(!lock.cancelled, "Lock already cancelled");

        // Update activity if valid timestamp provided
        if (_senderLastTxTimestamp > 0) {
            _updateActivityFromWallet(_lockId, _senderLastTxTimestamp);
        }

        // Check if inactivity period has been reached
        require(
            block.timestamp >= lock.lastActivityTime + lock.inactivityPeriod,
            "Inactivity period not reached"
        );

        // Get receiver's origin chain info if caller is the receiver
        if (msg.sender == lock.receiver) {
            (UniversalAccountId memory receiverOrigin, bool isUEA) =
                IUEAFactory(0x00000000000000000000000000000000000000eA).getOriginForUEA(msg.sender);
            lock.receiverChainNamespace = receiverOrigin.chainNamespace;
            lock.receiverChainId = receiverOrigin.chainId;
        }

        lock.fundsReleased = true;

        // Transfer native PUSH tokens to receiver
        (bool success, ) = payable(lock.receiver).call{value: lock.amount}("");
        require(success, "Transfer failed");

        emit FundsReleased(
            _lockId,
            lock.receiver,
            lock.amount,
            msg.sender == lock.receiver 
                ? string(abi.encodePacked(lock.receiverChainNamespace, ":", lock.receiverChainId))
                : "keeper"
        );
    }

    /**
     * @dev Cancel lock and reclaim funds - sender can cancel anytime before release
     * @param _lockId The lock ID
     */
    function cancelLock(bytes32 _lockId) external {
        DeadLock storage lock = locks[_lockId];

        require(lock.sender != address(0), "Lock does not exist");
        require(msg.sender == lock.sender, "Only sender can cancel");
        require(!lock.fundsReleased, "Funds already released");
        require(!lock.cancelled, "Lock already cancelled");

        lock.cancelled = true;

        // Get origin chain info
        (UniversalAccountId memory originAccount, bool isUEA) =
            IUEAFactory(0x00000000000000000000000000000000000000eA).getOriginForUEA(msg.sender);

        // Transfer native PUSH tokens back to sender
        (bool success, ) = payable(lock.sender).call{value: lock.amount}("");
        require(success, "Transfer failed");

        emit LockCancelled(
            _lockId,
            lock.sender,
            lock.amount,
            string(abi.encodePacked(originAccount.chainNamespace, ":", originAccount.chainId))
        );
    }

    /**
     * @dev Get Dead Lock details with optional activity update
     * @param _lockId The lock ID
     * @param _senderLastTxTimestamp Last transaction timestamp of sender's wallet (0 if no update needed)
     */
    function getDeadLock(bytes32 _lockId, uint256 _senderLastTxTimestamp)
        external
        returns (
            address sender,
            address receiver,
            uint256 amount,
            uint256 lastActivityTime,
            uint256 inactivityPeriod,
            bool fundsReleased,
            bool cancelled,
            string memory senderChain,
            string memory receiverChain
        )
    {
        DeadLock storage lock = locks[_lockId];
        
        // Update activity if valid timestamp provided
        if (_senderLastTxTimestamp > 0 && lock.sender != address(0)) {
            _updateActivityFromWallet(_lockId, _senderLastTxTimestamp);
        }

        return (
            lock.sender,
            lock.receiver,
            lock.amount,
            lock.lastActivityTime,
            lock.inactivityPeriod,
            lock.fundsReleased,
            lock.cancelled,
            string(abi.encodePacked(lock.senderChainNamespace, ":", lock.senderChainId)),
            string(abi.encodePacked(lock.receiverChainNamespace, ":", lock.receiverChainId))
        );
    }

    /**
     * @dev Get Dead Lock details (view only - no state changes)
     * @param _lockId The lock ID
     */
    function getDeadLockView(bytes32 _lockId)
        external
        view
        returns (
            address sender,
            address receiver,
            uint256 amount,
            uint256 lastActivityTime,
            uint256 inactivityPeriod,
            bool fundsReleased,
            bool cancelled,
            string memory senderChain,
            string memory receiverChain
        )
    {
        DeadLock storage lock = locks[_lockId];
        return (
            lock.sender,
            lock.receiver,
            lock.amount,
            lock.lastActivityTime,
            lock.inactivityPeriod,
            lock.fundsReleased,
            lock.cancelled,
            string(abi.encodePacked(lock.senderChainNamespace, ":", lock.senderChainId)),
            string(abi.encodePacked(lock.receiverChainNamespace, ":", lock.receiverChainId))
        );
    }

    /**
     * @dev Check if lock is eligible for fund release with optional activity update
     * @param _lockId The lock ID
     * @param _senderLastTxTimestamp Last transaction timestamp of sender's wallet (0 if no update needed)
     */
    function isEligibleForRelease(bytes32 _lockId, uint256 _senderLastTxTimestamp) 
        external 
        returns (bool) 
    {
        DeadLock storage lock = locks[_lockId];
        
        // Update activity if valid timestamp provided
        if (_senderLastTxTimestamp > 0 && lock.sender != address(0)) {
            _updateActivityFromWallet(_lockId, _senderLastTxTimestamp);
        }

        return (
            lock.sender != address(0) &&
            !lock.fundsReleased &&
            !lock.cancelled &&
            block.timestamp >= lock.lastActivityTime + lock.inactivityPeriod
        );
    }

    /**
     * @dev Check if lock is eligible for fund release (view only)
     * @param _lockId The lock ID
     */
    function isEligibleForReleaseView(bytes32 _lockId) external view returns (bool) {
        DeadLock storage lock = locks[_lockId];
        return (
            lock.sender != address(0) &&
            !lock.fundsReleased &&
            !lock.cancelled &&
            block.timestamp >= lock.lastActivityTime + lock.inactivityPeriod
        );
    }

    /**
     * @dev Get time remaining until funds can be released with optional activity update
     * @param _lockId The lock ID
     * @param _senderLastTxTimestamp Last transaction timestamp of sender's wallet (0 if no update needed)
     */
    function getTimeUntilRelease(bytes32 _lockId, uint256 _senderLastTxTimestamp) 
        external 
        returns (uint256) 
    {
        DeadLock storage lock = locks[_lockId];
        
        // Update activity if valid timestamp provided
        if (_senderLastTxTimestamp > 0 && lock.sender != address(0)) {
            _updateActivityFromWallet(_lockId, _senderLastTxTimestamp);
        }
        
        if (lock.fundsReleased || lock.cancelled) {
            return 0;
        }
        
        uint256 releaseTime = lock.lastActivityTime + lock.inactivityPeriod;
        if (block.timestamp >= releaseTime) {
            return 0;
        }
        return releaseTime - block.timestamp;
    }

    /**
     * @dev Get time remaining until funds can be released (view only)
     * @param _lockId The lock ID
     */
    function getTimeUntilReleaseView(bytes32 _lockId) external view returns (uint256) {
        DeadLock storage lock = locks[_lockId];
        
        if (lock.fundsReleased || lock.cancelled) {
            return 0;
        }
        
        uint256 releaseTime = lock.lastActivityTime + lock.inactivityPeriod;
        if (block.timestamp >= releaseTime) {
            return 0;
        }
        return releaseTime - block.timestamp;
    }

    /**
     * @dev Get all lock IDs for a user
     * @param _user The user address
     */
    function getUserLocks(address _user) external view returns (bytes32[] memory) {
        return userLocks[_user];
    }

    /**
     * @dev Get contract balance
     */
    function getContractBalance() external view returns (uint256) {
        return address(this).balance;
    }

    /**
     * @dev Get time since last activity with optional activity update
     * @param _lockId The lock ID
     * @param _senderLastTxTimestamp Last transaction timestamp of sender's wallet (0 if no update needed)
     */
    function getTimeSinceLastActivity(bytes32 _lockId, uint256 _senderLastTxTimestamp) 
        external 
        returns (uint256) 
    {
        DeadLock storage lock = locks[_lockId];
        
        if (lock.sender == address(0)) {
            return 0;
        }

        // Update activity if valid timestamp provided
        if (_senderLastTxTimestamp > 0) {
            _updateActivityFromWallet(_lockId, _senderLastTxTimestamp);
        }
        
        return block.timestamp - lock.lastActivityTime;
    }

    /**
     * @dev Get time since last activity (view only)
     * @param _lockId The lock ID
     */
    function getTimeSinceLastActivityView(bytes32 _lockId) external view returns (uint256) {
        DeadLock storage lock = locks[_lockId];
        if (lock.sender == address(0)) {
            return 0;
        }
        return block.timestamp - lock.lastActivityTime;
    }

    /**
     * @dev Simulate what the updated activity time would be (view only)
     * @param _lockId The lock ID
     * @param _senderLastTxTimestamp Last transaction timestamp to check
     */
    function simulateActivityUpdate(bytes32 _lockId, uint256 _senderLastTxTimestamp) 
        external 
        view 
        returns (uint256 newActivityTime, bool wouldUpdate) 
    {
        DeadLock storage lock = locks[_lockId];
        
        wouldUpdate = (
            _senderLastTxTimestamp > lock.lastActivityTime && 
            _senderLastTxTimestamp <= block.timestamp + 300 &&
            !lock.fundsReleased && 
            !lock.cancelled
        );
        
        newActivityTime = wouldUpdate ? _senderLastTxTimestamp : lock.lastActivityTime;
        
        return (newActivityTime, wouldUpdate);
    }
}