// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract MultiHtlcUSDC {
    IERC20 public usdc;
    
    struct HTLC {
        address sender;
        address recipient;
        uint256 amount;
        bytes32 hashlock;
        uint256 timelock;
        bool isFunded;
        bool isWithdrawn;
        bool isRefunded;
        bytes32 preimage;
    }
    
    // Mapping from swap ID to HTLC details
    mapping(bytes32 => HTLC) public htlcSwaps;
    
    // Counter for generating unique swap IDs
    uint256 private swapCounter;
    
    // Events
    event Funded(bytes32 indexed swapId, address indexed sender, address indexed recipient, uint256 amount, bytes32 hashlock, uint256 timelock);
    event Withdrawn(bytes32 indexed swapId, address indexed recipient, bytes32 preimage);
    event Refunded(bytes32 indexed swapId, address indexed sender);

    constructor(address _usdc) {
        usdc = IERC20(_usdc);
    }

    /**
     * @dev Generate a unique swap ID
     */
    function generateSwapId(address _sender, address _recipient, uint256 _amount, bytes32 _hashlock, uint256 _timelock) 
        public view returns (bytes32) {
        return keccak256(abi.encodePacked(_sender, _recipient, _amount, _hashlock, _timelock, swapCounter));
    }

    /**
     * @dev Fund a new HTLC swap
     */
    function fund(address _recipient, uint256 _amount, bytes32 _hashlock, uint256 _timelock) external returns (bytes32) {
        require(_timelock > block.timestamp, "Timelock should be in the future");
        require(_amount > 0, "Amount must be greater than 0");
        require(_recipient != address(0), "Invalid recipient address");
        
        // Generate unique swap ID
        bytes32 swapId = generateSwapId(msg.sender, _recipient, _amount, _hashlock, _timelock);
        
        // Check if swap already exists
        require(!htlcSwaps[swapId].isFunded, "Swap already exists");
        
        // Create new HTLC
        htlcSwaps[swapId] = HTLC({
            sender: msg.sender,
            recipient: _recipient,
            amount: _amount,
            hashlock: _hashlock,
            timelock: _timelock,
            isFunded: true,
            isWithdrawn: false,
            isRefunded: false,
            preimage: 0x0
        });
        
        // Increment counter for next swap
        swapCounter++;
        
        // Transfer USDC to contract
        require(usdc.transferFrom(msg.sender, address(this), _amount), "USDC transfer failed");
        
        emit Funded(swapId, msg.sender, _recipient, _amount, _hashlock, _timelock);
        
        return swapId;
    }

    /**
     * @dev Withdraw from HTLC using preimage
     */
    function withdraw(bytes32 _swapId, bytes32 _preimage) external {
        HTLC storage htlc = htlcSwaps[_swapId];
        
        require(htlc.isFunded, "Swap not funded");
        require(!htlc.isWithdrawn, "Already withdrawn");
        require(!htlc.isRefunded, "Already refunded");
        require(msg.sender == htlc.recipient, "Not recipient");
        require(sha256(abi.encodePacked(_preimage)) == htlc.hashlock, "Invalid preimage");
        
        htlc.isWithdrawn = true;
        htlc.preimage = _preimage;
        
        require(usdc.transfer(htlc.recipient, htlc.amount), "USDC transfer failed");
        
        emit Withdrawn(_swapId, htlc.recipient, _preimage);
    }

    /**
     * @dev Refund HTLC after timelock expires
     */
    function refund(bytes32 _swapId) external {
        HTLC storage htlc = htlcSwaps[_swapId];
        
        require(htlc.isFunded, "Swap not funded");
        require(!htlc.isWithdrawn, "Already withdrawn");
        require(!htlc.isRefunded, "Already refunded");
        require(block.timestamp >= htlc.timelock, "Timelock not yet passed");
        require(msg.sender == htlc.sender, "Not sender");
        
        htlc.isRefunded = true;
        
        require(usdc.transfer(htlc.sender, htlc.amount), "USDC transfer failed");
        
        emit Refunded(_swapId, htlc.sender);
    }

    /**
     * @dev Get HTLC details by swap ID
     */
    function getSwapDetails(bytes32 _swapId) external view returns (
        address sender,
        address recipient,
        uint256 amount,
        bytes32 hashlock,
        uint256 timelock,
        bool isFunded,
        bool isWithdrawn,
        bool isRefunded,
        bytes32 preimage
    ) {
        HTLC storage htlc = htlcSwaps[_swapId];
        return (
            htlc.sender,
            htlc.recipient,
            htlc.amount,
            htlc.hashlock,
            htlc.timelock,
            htlc.isFunded,
            htlc.isWithdrawn,
            htlc.isRefunded,
            htlc.preimage
        );
    }

    /**
     * @dev Check if swap exists and is funded
     */
    function isSwapFunded(bytes32 _swapId) external view returns (bool) {
        return htlcSwaps[_swapId].isFunded;
    }

    /**
     * @dev Check if swap is expired
     */
    function isSwapExpired(bytes32 _swapId) external view returns (bool) {
        HTLC storage htlc = htlcSwaps[_swapId];
        return htlc.isFunded && block.timestamp >= htlc.timelock;
    }

    /**
     * @dev Get total number of swaps created
     */
    function getSwapCount() external view returns (uint256) {
        return swapCounter;
    }

    /**
     * @dev Get USDC balance of contract
     */
    function getContractBalance() external view returns (uint256) {
        return usdc.balanceOf(address(this));
    }

    /**
     * @dev Emergency function to get USDC balance (only for debugging)
     */
    function emergencyWithdraw() external {
        // This function can be used to withdraw any stuck USDC
        // In production, you might want to add access controls
        uint256 balance = usdc.balanceOf(address(this));
        if (balance > 0) {
            require(usdc.transfer(msg.sender, balance), "Emergency withdrawal failed");
        }
    }
} 