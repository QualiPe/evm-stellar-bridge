// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract HtlcUSDC {
    address public sender;
    address public recipient;
    IERC20 public usdc;
    uint256 public amount;
    bytes32 public hashlock;
    uint256 public timelock;
    bool public isFunded;
    bool public isWithdrawn;
    bool public isRefunded;
    bytes32 public preimage;

    event Funded(address indexed sender, address indexed recipient, uint256 amount, bytes32 hashlock, uint256 timelock);
    event Withdrawn(address indexed recipient, bytes32 preimage);
    event Refunded(address indexed sender);

    constructor(address _usdc) {
        usdc = IERC20(_usdc);
    }

    function fund(address _recipient, uint256 _amount, bytes32 _hashlock, uint256 _timelock) external {
        require(!isFunded, "Already funded");
        require(_timelock > block.timestamp, "Timelock should be in the future");
        sender = msg.sender;
        recipient = _recipient;
        amount = _amount;
        hashlock = _hashlock;
        timelock = _timelock;
        isFunded = true;
        isWithdrawn = false;
        isRefunded = false;
        preimage = 0x0;
        require(usdc.transferFrom(msg.sender, address(this), _amount), "USDC transfer failed");
        emit Funded(sender, recipient, amount, hashlock, timelock);
    }

    function withdraw(bytes32 _preimage) external {
        require(isFunded, "Not funded");
        require(!isWithdrawn, "Already withdrawn");
        require(!isRefunded, "Already refunded");
        require(msg.sender == recipient, "Not recipient");
        require(sha256(abi.encodePacked(_preimage)) == hashlock, "Invalid preimage");
        isWithdrawn = true;
        preimage = _preimage;
        require(usdc.transfer(recipient, amount), "USDC transfer failed");
        emit Withdrawn(recipient, _preimage);
    }

    function refund() external {
        require(isFunded, "Not funded");
        require(!isWithdrawn, "Already withdrawn");
        require(!isRefunded, "Already refunded");
        require(block.timestamp >= timelock, "Timelock not yet passed");
        require(msg.sender == sender, "Not sender");
        isRefunded = true;
        require(usdc.transfer(sender, amount), "USDC transfer failed");
        emit Refunded(sender);
    }

    function getSwapDetails() external view returns (
        address _sender,
        address _recipient,
        uint256 _amount,
        bytes32 _hashlock,
        uint256 _timelock,
        bool _isFunded,
        bool _isWithdrawn,
        bool _isRefunded,
        bytes32 _preimage
    ) {
        return (sender, recipient, amount, hashlock, timelock, isFunded, isWithdrawn, isRefunded, preimage);
    }
}