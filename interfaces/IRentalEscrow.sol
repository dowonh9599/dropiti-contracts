// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IRentalEscrow {
    struct Deal {
        address maker;
        address taker;
        address token;
        uint256 requestedAmount;
        uint256 settledAmount;
        uint256 releasedAmount;
        bool isTakerFullySettled;
        bool isMakerCanReleaseFund;
        bool isFundFullyReleasedToMaker;
        bool isActive;
    }

    function initialize(address[] memory _whitelisted, address[] memory _whitelistedTokens) external;

    function isWhitelisted(address addr) external view returns (bool);

    function addWhitelist(address _addr, bool _isWhitelisted) external;

    function addWhitelists(address[] calldata _addrs, bool[] calldata _isWhitelisted) external;

    function isTokenWhitelisted(address _token) external view returns (bool);

    function addWhitelistedToken(address _addr, bool _isWhitelisted) external;

    function addWhitelistedTokens(address[] calldata _addrs, bool[] calldata _isWhitelisted) external;

    function openDeal(address _taker, address _token, uint256 _requestedAmount) external;

    function getDeal(uint256 _dealId) external view returns (Deal memory);

    function getMaker(uint256 dealId) external view returns (address);

    function getTaker(uint256 dealId) external view returns (address);

    function getToken(uint256 dealId) external view returns (address);

    function getRequestedAmount(uint256 dealId) external view returns (uint256);

    function getSettledAmount(uint256 dealId) external view returns (uint256);

    function getReleasedAmount(uint256 dealId) external view returns (uint256);

    function isTakerFullySettled(uint256 dealId) external view returns (bool);

    function canMakerReleaseFund(uint256 dealId) external view returns (bool);

    function isFundFullyReleasedToMaker(uint256 dealId) external view returns (bool);

    function isActive(uint256 dealId) external view returns (bool);

    function closeDeal(uint256 _dealId) external;

    function fundDeal(uint256 _dealId, address _token, uint256 _amount) external;

    function setIsMakerCanReleaseFund(uint256 _dealId, bool value) external;

    function releaseFunds(uint256 _dealId, address _token, uint256 _amount) external;

    function retrieveFunds(uint256 _dealId, address _token, uint256 _amount) external;
}
