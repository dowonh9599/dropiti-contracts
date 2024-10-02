// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import '../../interfaces/IRentalEscrow.sol';
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";

contract RentalEscrow is OwnableUpgradeable, PausableUpgradeable, ReentrancyGuardUpgradeable, IRentalEscrow {
    uint256 dealCounter;
    mapping(uint256 => Deal) deals;
    mapping(address => bool) whitelisted;
    mapping(address => bool) whitelistedTokens;

    event DealCreated(uint256 dealId, address maker, address taker, address token, uint256 amount);
    event DealClosed(uint256 dealId);
    event TakerSettled(uint256 dealId, uint256 amount, uint256 totalSettledAmount);
    event TakerApprovedFundRelease(uint256 dealId, bool isMakerCanReleaseFund);
    event MakerReleasedFund(uint256 dealId, uint256 amount, uint256 totalReleasedAmount);
    event TakerRetrievedFund(uint256 dealId, uint256 amount, uint256 remainingSettledAmount);

    function initialize(
        address[] memory _whitelisted,
        address[] memory _whitelistedTokens
    ) public initializer {
        __Ownable_init(msg.sender);
        __Pausable_init();
        __ReentrancyGuard_init();

        dealCounter = 0;

        // Whitelist accounts
        whitelisted[msg.sender] = true;
        for (uint i = 0; i < _whitelisted.length; i++) {
            whitelisted[_whitelisted[i]] = true;
        }

        // Whitelist tokens
        for (uint i = 0; i < _whitelistedTokens.length; i++) {
            whitelistedTokens[_whitelistedTokens[i]] = true;
        }
    }

    modifier onlyWhitelisted() {
        require(whitelisted[msg.sender], "Caller is not whitelisted");
        _;
    }

    // Whitelisted addresses
    function isWhitelisted(address addr) public view returns (bool) {
        return whitelisted[addr];
    }

    function addWhitelist(address _addr, bool _isWhitelisted) external onlyWhitelisted {
        if (!_isWhitelisted) {
            require(isWhitelisted(_addr), "Address not found in whitelist");
        }
        whitelisted[_addr] = _isWhitelisted;
    }
    function addWhitelists(address[] calldata _addrs, bool[] calldata _isWhitelisted) external onlyWhitelisted {
        for (uint i = 0; i < _addrs.length; i++) {
            whitelisted[_addrs[i]] = _isWhitelisted[i];
        }
    }


    // Token whitelist
    function isTokenWhitelisted(address _token) public view returns (bool) {
        return whitelistedTokens[_token];
    }

    function addWhitelistedToken(address _addr, bool _isWhitelisted) external onlyWhitelisted {
        if (!_isWhitelisted) {
            require(isTokenWhitelisted(_addr), "Token address not found in token whitelist");
        }
        whitelistedTokens[_addr] = _isWhitelisted;
    }

     function addWhitelistedTokens(address[] calldata _addrs, bool[] calldata _isWhitelisted) external onlyWhitelisted {
        for (uint i = 0; i < _addrs.length; i++) {
            whitelistedTokens[_addrs[i]] = _isWhitelisted[i];
        }
    }

    function openDeal(address _taker, address _token, uint256 _requestedAmount) external whenNotPaused nonReentrant {
        require(isTokenWhitelisted(_token), "Token is not whitelisted");

        deals[dealCounter] = Deal({
            maker: msg.sender,
            taker: _taker,
            token: _token,
            requestedAmount: _requestedAmount,
            settledAmount: 0,
            releasedAmount: 0,
            isTakerFullySettled: false,
            isMakerCanReleaseFund: false,
            isFundFullyReleasedToMaker: false,
            isActive: true
        });
        dealCounter++;

        emit DealCreated(dealCounter, msg.sender, _taker, _token, _requestedAmount);
    }

    function getDeal(uint256 _dealId) public view returns (Deal memory) {
        Deal storage deal = deals[_dealId];
        return deal;
    }

    function getDealCounter() public view returns (uint256) {
        return dealCounter;
    }

    function getMaker(uint256 dealId) external view returns (address) {
        return deals[dealId].maker;
    }

    function getTaker(uint256 dealId) external view returns (address) {
        return deals[dealId].taker;
    }

    function getToken(uint256 dealId) external view returns (address) {
        return deals[dealId].token;
    }

    function getRequestedAmount(uint256 dealId) external view returns (uint256) {
        return deals[dealId].requestedAmount;
    }

    function getSettledAmount(uint256 dealId) external view returns (uint256) {
        return deals[dealId].settledAmount;
    }

    function getReleasedAmount(uint256 dealId) external view returns (uint256) {
        return deals[dealId].releasedAmount;
    }

    function isTakerFullySettled(uint256 dealId) external view returns (bool) {
        return deals[dealId].isTakerFullySettled;
    }

    function canMakerReleaseFund(uint256 dealId) external view returns (bool) {
        return deals[dealId].isMakerCanReleaseFund;
    }

    function isFundFullyReleasedToMaker(uint256 dealId) external view returns (bool) {
        return deals[dealId].isFundFullyReleasedToMaker;
    }

    function isActive(uint256 dealId) external view returns (bool) {
        return deals[dealId].isActive;
    }

    function closeDeal(uint256 _dealId) external whenNotPaused nonReentrant {
        require(getDeal(_dealId).maker != address(0), "Deal not found");
        Deal storage deal = deals[_dealId];

        require(deal.isActive, "Deal is not active");
        require(msg.sender == deal.maker, "Only designated maker can close the deal");
        deal.isActive = false;

        emit DealClosed(_dealId);
    }

    function fundDeal(uint256 _dealId, address _token, uint256 _amount) external whenNotPaused nonReentrant {
        require(getDeal(_dealId).maker != address(0), "Deal not found");
        Deal storage deal = deals[_dealId];

        require(deal.isActive, "Deal is inactive");
        require(msg.sender == deal.taker, "Only designated taker can fund the deal");
        require(isTokenWhitelisted(_token), "Token is not whitelisted");
        require(_token == deal.token, "Incorrect token");
        require(!deal.isTakerFullySettled, "Deal already funded");
        require(_amount > 0, "Invalid amount");
        require(_amount <= (deal.requestedAmount - deal.settledAmount), "Amount exceeds remaining requested amount");

        IERC20(_token).transferFrom(msg.sender, address(this), _amount);

        deal.settledAmount += _amount;
        if (deal.settledAmount == deal.requestedAmount) {
            deal.isTakerFullySettled = true;
        }

        emit TakerSettled(_dealId, _amount, deal.settledAmount);
    }

    function setIsMakerCanReleaseFund(uint256 _dealId, bool value) external whenNotPaused nonReentrant {
        require(getDeal(_dealId).maker != address(0), "Deal not found");
        Deal storage deal = deals[_dealId];

        require(deal.isActive, "Deal is inactive");
        require(msg.sender == deal.taker, "Only designated taker can approve fund release");
        if (value) {
            require(deal.settledAmount > 0, "Taker haven't settled any fund yet");
            require(!deal.isMakerCanReleaseFund, "Taker already approved fund release");
        }

        deal.isMakerCanReleaseFund = value;

        emit TakerApprovedFundRelease(_dealId, value);
    }

    function releaseFunds(uint256 _dealId, address _token, uint256 _amount) external whenNotPaused nonReentrant {
        require(getDeal(_dealId).maker != address(0), "Deal not found");
        Deal storage deal = deals[_dealId];

        require(deal.isActive, "Deal is inactive");
        require(!deal.isFundFullyReleasedToMaker, "Fund already fully released to maker");
        require(msg.sender == deal.maker || msg.sender == owner(), "Only designated maker can call to release funds");
        require(_token == deal.token, "Incorrect token");
        require(isTokenWhitelisted(_token), "Token is not whitelisted");
        require(deal.isMakerCanReleaseFund, "Fund release not approved by taker");
        require(_amount > 0, "Invalid request amount");
        require(_amount <= (deal.requestedAmount - deal.releasedAmount), "Cannot release amount higher than remaining requested amount");
        require(_amount <= deal.settledAmount, "Cannot release amount higher than amount settled by taker");

        IERC20(_token).transfer(deal.maker, _amount);

        deal.releasedAmount += _amount;
        if (deal.releasedAmount == deal.requestedAmount) {
            deal.isFundFullyReleasedToMaker = true;
            deal.isActive = false;
        }

        emit MakerReleasedFund(_dealId, _amount, deal.releasedAmount);
    }

    function retrieveFunds(uint256 _dealId, address _token, uint256 _amount) external whenNotPaused nonReentrant {
        require(getDeal(_dealId).maker != address(0), "Deal not found");
        Deal storage deal = deals[_dealId];

        require(!deal.isActive, "Deal is still active");
        require(msg.sender == deal.taker, "Only designated taker can call to retrieve funds");
        require(_token == deal.token, "Incorrect token");
        require(isTokenWhitelisted(_token), "Token is not whitelisted");
        require(deal.settledAmount != 0, "No settled amount remaining");
        require(_amount > 0, "Invalid request amount");
        require(_amount <= deal.settledAmount, "Cannot retrieve amount higher than remaining settled amount");

        IERC20(_token).transfer(msg.sender, _amount);

        deal.settledAmount -= _amount;

        emit TakerRetrievedFund(_dealId, _amount, deal.settledAmount);
    }
}
