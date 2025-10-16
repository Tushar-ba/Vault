// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract Token is ERC20 {
        address public owner;
        modifier onlyOwner() {
            require(msg.sender == owner, "Not the contract owner");
            _;
        }

    mapping (address => bool) public whitelisted;

    event trasferSuccess(address from, address to, uint256 amount);
    error NotWhitelisted(address addr);

    constructor(string memory name, string memory symbol) ERC20(name, symbol) {
    _mint(msg.sender, 10000 * 10 ** decimals());
    owner = msg.sender;
    }

    function whitelist(address _address) public onlyOwner {
        whitelisted[_address]  = true;
    }

    function transfer( address to, uint256 amount) public  override returns (bool){
        if(!whitelisted[msg.sender] || !whitelisted[to]) {
            revert NotWhitelisted(msg.sender);
        }
        super._transfer(msg.sender, to, amount);
        emit trasferSuccess (msg.sender, to, amount);
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) public override returns (bool){
        if(!whitelisted[from] || !whitelisted[to]) {
            revert NotWhitelisted(msg.sender);
        }
        super._transfer(from, to, amount);
        emit trasferSuccess (from, to, amount);
        return true;
    }
}
