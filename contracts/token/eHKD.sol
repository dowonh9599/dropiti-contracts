// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract eHKD is ERC20 {
    address public admin;
    address public tokenVault;
    uint256 public MAX_SUPPLY = 1e27; // 1e9 * 1e18

    constructor(
        address _admin,
        address _tokenVault,
        uint256 mintAmount
    ) ERC20("eHKD", "eHKD") {
        require(mintAmount <= MAX_SUPPLY, "Mint amount exceeds max supply");
        admin = _admin;
        tokenVault = _tokenVault;
        if (mintAmount > 0) {
            _mint(_tokenVault, mintAmount);
        }
    }

    modifier adminOnly() {
        require(msg.sender == admin, "only admin");
        _;
    }

    function mint(uint256 amount) public adminOnly {
        require(
            totalSupply() + amount <= MAX_SUPPLY,
            "Minting exceeds max supply"
        );
        _mint(tokenVault, amount);
    }

    function transferAdmin(address _admin) public adminOnly {
        admin = _admin;
    }

    function transferTokenVault(address _tokenVault) public adminOnly {
        tokenVault = _tokenVault;
    }
}
