// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract eHKD is ERC20 {
    address public admin;
    uint256 public MAX_SUPPLY = 1e27; // 1e9 * 1e18

    constructor(address _admin) ERC20("eHKD", "eHKD") {
        admin = _admin;
        _mint(_admin, MAX_SUPPLY);
    }

    function mint(address to, uint256 amount) public {
        _mint(to, amount);
    }
}
