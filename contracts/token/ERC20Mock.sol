// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "../../interfaces/IERC20Mock.sol";

contract ERC20Mock is ERC20, IERC20Mock {
    uint8 private _decimals;

    constructor(string memory _name, string memory _symbol, uint8 decimals_) ERC20(_name, _symbol) {
        _decimals = decimals_;
    }

    function mint(address to, uint256 amount) public {
        _mint(to, amount);
    }

    function decimals() public view virtual override(ERC20, IERC20Mock) returns (uint8) {
        return _decimals;
    }
}
