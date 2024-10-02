// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/interfaces/IERC20.sol";

interface IERC20Mock is IERC20 {
    // Additional functions in ERC20Mock
    function mint(address to, uint256 amount) external;
    function decimals() external view returns (uint8);
}
