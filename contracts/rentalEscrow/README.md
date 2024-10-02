# RentalEscrow Contract

## Overview

The `RentalEscrow` contract is a decentralized escrow system designed for secure rental transactions involving ERC20 tokens. It allows designated makers and takers to create and settle deals with built-in whitelisting and security features.

## Features

- **Deal Management:** Create, close, and manage rental deals between makers and takers.
- **Whitelist System:** Only approved addresses and tokens are allowed to participate.
- **Security Measures:** Uses OpenZeppelin's `Ownable`, `Pausable`, and `ReentrancyGuard` for enhanced security.
- **Event Logging:** Emits events for deal creation, closure, settlement, and fund release.

## Key Functions

### Initialization

- `initialize(address[] _whitelisted, address[] _whitelistedTokens)`: Initializes the contract with whitelisted addresses and tokens.

### Whitelisting

- `isWhitelisted(address addr)`: Checks if an address is whitelisted.
- `addWhitelist(address _addr, bool _isWhitelisted)`: Adds or removes an address from the whitelist.
- `isTokenWhitelisted(address _token)`: Checks if a token is whitelisted.
- `addWhitelistedToken(address _addr, bool _isWhitelisted)`: Adds or removes a token from the whitelist.

### Deal Operations

- `openDeal(address _taker, address _token, uint256 _requestedAmount)`: Opens a new deal.
- `closeDeal(uint256 _dealId)`: Closes an active deal.
- `fundDeal(uint256 _dealId, address _token, uint256 _amount)`: Allows the taker to fund a deal.
- `setIsMakerCanReleaseFund(uint256 _dealId, bool value)`: Approves fund release by the maker.
- `releaseFunds(uint256 _dealId, address _token, uint256 _amount)`: Allows the maker to release funds to themselves.
- `retrieveFunds(uint256 _dealId, address _token, uint256 _amount)`: Allows the taker to retrieve funds.

### Getters

- `getDeal(uint256 _dealId)`: Retrieves details of a specific deal.
- `getDealCounter()`: Returns the total number of deals created.

## Security and Access Control

- **Only Whitelisted:** Functions restricted to whitelisted addresses for added security.
- **Pausable:** The contract can be paused to prevent operations during emergencies.
- **Reentrancy Protection:** Safeguards against reentrancy attacks during fund transfers.

## Events

- `DealCreated`: Emitted when a new deal is created.
- `DealClosed`: Emitted when a deal is closed.
- `TakerSettled`: Emitted when a taker funds a deal.
- `TakerApprovedFundRelease`: Emitted when a taker approves fund release.
- `MakerReleasedFund`: Emitted when the maker releases funds.
- `TakerRetrievedFund`: Emitted when the taker retrieves funds.

## Usage

Deploy the contract, initialize with the necessary whitelisted addresses and tokens, and interact with the functions to manage rental deals securely.
