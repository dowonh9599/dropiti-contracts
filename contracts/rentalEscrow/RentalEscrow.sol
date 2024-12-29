// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../../interfaces/rentalEscrow/IRentalEscrow.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract RentalEscrow is Ownable, Pausable, ReentrancyGuard, IRentalEscrow {
    uint256 tradeCounter;
    mapping(uint256 => Trade) trades;
    mapping(address => bool) whitelisted;
    mapping(address => bool) whitelistedTokens;

    event TradeCreated(
        uint256 tradeId,
        address payee,
        address payer,
        address token,
        uint256 amount
    );
    event TradeClosed(uint256 tradeId);
    event PayerSettled(
        uint256 tradeId,
        uint256 amount,
        uint256 totalSettledAmount
    );
    event PayerApprovedFundRelease(uint256 tradeId, bool isPayeeCanReleaseFund);
    event PayeeReleasedFund(
        uint256 tradeId,
        uint256 amount,
        uint256 totalReleasedAmount
    );
    event PayerRetrievedFund(
        uint256 tradeId,
        uint256 amount,
        uint256 remainingSettledAmount
    );

    constructor(
        address _admin,
        address[] memory _whitelisted,
        address[] memory _whitelistedTokens
    ) Ownable(_admin) Pausable() ReentrancyGuard() {
        tradeCounter = 0;

        // Whitelist accounts
        whitelisted[msg.sender] = true;
        for (uint i = 0; i < _whitelisted.length; ) {
            whitelisted[_whitelisted[i]] = true;
            unchecked {
                i++;
            }
        }

        // Whitelist tokens
        for (uint i = 0; i < _whitelistedTokens.length; ) {
            whitelistedTokens[_whitelistedTokens[i]] = true;
            unchecked {
                i++;
            }
        }
    }

    // getters
    function getTrade(uint256 _tradeId) public view returns (Trade memory) {
        Trade storage trade = trades[_tradeId];
        return trade;
    }

    function getTradeCounter() public view returns (uint256) {
        return tradeCounter;
    }

    function getPayee(uint256 tradeId) external view returns (address) {
        return trades[tradeId].payee;
    }

    function getPayer(uint256 tradeId) external view returns (address) {
        return trades[tradeId].payer;
    }

    function getToken(uint256 tradeId) external view returns (address) {
        return trades[tradeId].token;
    }

    function getRequestedAmount(
        uint256 tradeId
    ) external view returns (uint256) {
        return trades[tradeId].requestedAmount;
    }

    function getSettledAmount(uint256 tradeId) external view returns (uint256) {
        return trades[tradeId].settledAmount;
    }

    function getReleasedAmount(
        uint256 tradeId
    ) external view returns (uint256) {
        return trades[tradeId].releasedAmount;
    }

    function isPayerFullySettled(uint256 tradeId) public view returns (bool) {
        return trades[tradeId].settledAmount == trades[tradeId].requestedAmount;
    }

    function canPayeeReleaseFund(uint256 tradeId) external view returns (bool) {
        return trades[tradeId].isPayeeCanReleaseFund;
    }

    function isFundFullyReleasedToPayee(
        uint256 tradeId
    ) public view returns (bool) {
        return
            trades[tradeId].releasedAmount == trades[tradeId].requestedAmount;
    }

    function isActive(uint256 tradeId) external view returns (bool) {
        return trades[tradeId].isActive;
    }

    modifier onlyWhitelisted() {
        require(whitelisted[msg.sender], "Caller is not whitelisted");
        _;
    }

    // Whitelisted addresses
    function isWhitelisted(address addr) public view returns (bool) {
        return whitelisted[addr];
    }

    function addWhitelist(
        address _addr,
        bool _isWhitelisted
    ) external onlyWhitelisted {
        if (!_isWhitelisted) {
            require(isWhitelisted(_addr), "Address not found in whitelist");
        }
        whitelisted[_addr] = _isWhitelisted;
    }

    function addWhitelists(
        address[] calldata _addrs,
        bool[] calldata _isWhitelisted
    ) external onlyWhitelisted {
        for (uint i = 0; i < _addrs.length; ) {
            whitelisted[_addrs[i]] = _isWhitelisted[i];
            unchecked {
                i++;
            }
        }
    }

    // Token whitelist
    function isTokenWhitelisted(address _token) public view returns (bool) {
        return whitelistedTokens[_token];
    }

    function addWhitelistedToken(
        address _addr,
        bool _isWhitelisted
    ) external onlyWhitelisted {
        if (!_isWhitelisted) {
            require(
                isTokenWhitelisted(_addr),
                "Token address not found in token whitelist"
            );
        }
        whitelistedTokens[_addr] = _isWhitelisted;
    }

    function addWhitelistedTokens(
        address[] calldata _addrs,
        bool[] calldata _isWhitelisted
    ) external onlyWhitelisted {
        for (uint i = 0; i < _addrs.length; ) {
            whitelistedTokens[_addrs[i]] = _isWhitelisted[i];
            unchecked {
                i++;
            }
        }
    }

    function fundTrade(
        uint256 _tradeId,
        address _token,
        uint256 _amount
    ) external whenNotPaused nonReentrant {
        Trade storage trade = trades[_tradeId];
        require(trade.payee != address(0), "Trade not found");

        require(trade.isActive, "Trade is inactive");
        require(
            msg.sender == trade.payer,
            "Only designated payer can fund the trade"
        );
        require(isTokenWhitelisted(_token), "Token is not whitelisted");
        require(_token == trade.token, "Incorrect token");
        require(_amount > 0, "Invalid amount");
        require(
            _amount <= (trade.requestedAmount - trade.settledAmount),
            "Amount exceeds remaining requested amount"
        );

        IERC20(_token).transferFrom(msg.sender, address(this), _amount);

        trade.settledAmount += _amount;

        emit PayerSettled(_tradeId, _amount, trade.settledAmount);
    }

    function setIsPayeeCanReleaseFund(
        uint256 _tradeId,
        bool value
    ) external whenNotPaused nonReentrant {
        Trade storage trade = trades[_tradeId];
        require(trade.payee != address(0), "Trade not found");

        require(trade.isActive, "Trade is inactive");
        require(
            msg.sender == trade.payer,
            "Only designated payer can approve fund release"
        );
        if (value) {
            require(
                trade.settledAmount > 0,
                "Payer haven't settled any fund yet"
            );
            require(
                !trade.isPayeeCanReleaseFund,
                "Payer already approved fund release"
            );
        }

        trade.isPayeeCanReleaseFund = value;

        emit PayerApprovedFundRelease(_tradeId, value);
    }

    function releaseFunds(
        uint256 _tradeId,
        address _token,
        uint256 _amount
    ) external whenNotPaused nonReentrant {
        Trade storage trade = trades[_tradeId];
        require(trade.payee != address(0), "Trade not found");

        require(trade.isActive, "Trade is inactive");
        require(
            !isFundFullyReleasedToPayee(_tradeId),
            "Fund already fully released to payee"
        );
        require(
            msg.sender == trade.payee,
            "Only designated payee can call to release funds"
        );
        require(_token == trade.token, "Incorrect token");
        require(isTokenWhitelisted(_token), "Token is not whitelisted");
        require(
            trade.isPayeeCanReleaseFund,
            "Fund release not approved by payer"
        );
        require(_amount > 0, "Invalid request amount");
        require(
            _amount <= (trade.requestedAmount - trade.releasedAmount),
            "Cannot release amount higher than remaining requested amount"
        );
        require(
            _amount <= (trade.settledAmount - trade.releasedAmount),
            "Cannot release amount higher than amount settled by payer remaining"
        );

        IERC20(_token).transfer(trade.payee, _amount);

        trade.releasedAmount += _amount;
        if (trade.releasedAmount == trade.requestedAmount) {
            trade.isActive = false;
        }

        emit PayeeReleasedFund(_tradeId, _amount, trade.releasedAmount);
    }

    function retrieveFunds(
        uint256 _tradeId,
        address _token,
        uint256 _amount
    ) external whenNotPaused nonReentrant {
        Trade storage trade = trades[_tradeId];
        require(trade.payee != address(0), "Trade not found");

        require(!trade.isActive, "Trade is still active");
        require(
            msg.sender == trade.payer,
            "Only designated payer can call to retrieve funds"
        );
        require(_token == trade.token, "Incorrect token");
        require(isTokenWhitelisted(_token), "Token is not whitelisted");
        require(
            (trade.settledAmount - trade.releasedAmount) > 0,
            "No settled amount remaining"
        );
        require(_amount > 0, "Invalid request amount");
        require(
            _amount <= (trade.settledAmount - trade.releasedAmount),
            "Cannot retrieve amount higher than remaining settled amount"
        );

        IERC20(_token).transfer(msg.sender, _amount);

        trade.settledAmount -= _amount;

        if (trade.settledAmount == 0) {
            delete trades[_tradeId];
        }

        emit PayerRetrievedFund(_tradeId, _amount, trade.settledAmount);
    }

    function openTrade(
        address _payer,
        address _token,
        uint256 _requestedAmount
    ) external whenNotPaused nonReentrant {
        require(isTokenWhitelisted(_token), "Token is not whitelisted");

        Trade memory newTrade = Trade({
            payee: msg.sender,
            payer: _payer,
            token: _token,
            requestedAmount: _requestedAmount,
            settledAmount: 0,
            releasedAmount: 0,
            isPayeeCanReleaseFund: false,
            isActive: true
        });
        trades[tradeCounter] = newTrade;
        tradeCounter++;

        emit TradeCreated(
            tradeCounter,
            msg.sender,
            _payer,
            _token,
            _requestedAmount
        );
    }

    function closeTrade(uint256 _tradeId) external whenNotPaused nonReentrant {
        Trade storage trade = trades[_tradeId];
        require(trade.payee != address(0), "Trade not found");

        require(trade.isActive, "Trade is not active");
        require(
            msg.sender == trade.payee,
            "Only designated payee can close the trade"
        );
        trade.isActive = false;

        emit TradeClosed(_tradeId);
    }
}
