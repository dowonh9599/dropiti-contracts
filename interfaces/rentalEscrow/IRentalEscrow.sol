// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IRentalEscrow {
    struct Trade {
        address payee;
        address payer;
        address token;
        uint256 requestedAmount;
        uint256 settledAmount;
        uint256 releasedAmount;
        bool isPayeeCanReleaseFund;
        bool isActive;
    }

    function isWhitelisted(address addr) external view returns (bool);

    function addWhitelist(address _addr, bool _isWhitelisted) external;

    function addWhitelists(
        address[] calldata _addrs,
        bool[] calldata _isWhitelisted
    ) external;

    function isTokenWhitelisted(address _token) external view returns (bool);

    function addWhitelistedToken(address _addr, bool _isWhitelisted) external;

    function addWhitelistedTokens(
        address[] calldata _addrs,
        bool[] calldata _isWhitelisted
    ) external;

    function openTrade(
        address _payer,
        address _token,
        uint256 _requestedAmount
    ) external;

    function getTrade(uint256 _tradeId) external view returns (Trade memory);

    function getPayee(uint256 tradeId) external view returns (address);

    function getPayer(uint256 tradeId) external view returns (address);

    function getToken(uint256 tradeId) external view returns (address);

    function getRequestedAmount(
        uint256 tradeId
    ) external view returns (uint256);

    function getSettledAmount(uint256 tradeId) external view returns (uint256);

    function getReleasedAmount(uint256 tradeId) external view returns (uint256);

    function isPayerFullySettled(uint256 tradeId) external view returns (bool);

    function canPayeeReleaseFund(uint256 tradeId) external view returns (bool);

    function isFundFullyReleasedToPayee(
        uint256 tradeId
    ) external view returns (bool);

    function isActive(uint256 tradeId) external view returns (bool);

    function closeTrade(uint256 _tradeId) external;

    function fundTrade(
        uint256 _tradeId,
        address _token,
        uint256 _amount
    ) external;

    function setIsPayeeCanReleaseFund(uint256 _tradeId, bool value) external;

    function releaseFunds(
        uint256 _tradeId,
        address _token,
        uint256 _amount
    ) external;

    function retrieveFunds(
        uint256 _tradeId,
        address _token,
        uint256 _amount
    ) external;
}
