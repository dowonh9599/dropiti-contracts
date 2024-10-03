// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../../interfaces/rentalEscrow/IRentalEscrow.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";

contract RentalEscrow is
    OwnableUpgradeable,
    PausableUpgradeable,
    ReentrancyGuardUpgradeable,
    IRentalEscrow
{
    uint256 dealCounter;
    mapping(uint256 => Deal) deals;
    mapping(address => bool) whitelisted;
    mapping(address => bool) whitelistedTokens;

    event DealCreated(
        uint256 dealId,
        address payee,
        address payer,
        address token,
        uint256 amount
    );
    event DealClosed(uint256 dealId);
    event PayerSettled(
        uint256 dealId,
        uint256 amount,
        uint256 totalSettledAmount
    );
    event PayerApprovedFundRelease(uint256 dealId, bool isPayeeCanReleaseFund);
    event PayeeReleasedFund(
        uint256 dealId,
        uint256 amount,
        uint256 totalReleasedAmount
    );
    event PayerRetrievedFund(
        uint256 dealId,
        uint256 amount,
        uint256 remainingSettledAmount
    );

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

    // getters
    function getDeal(uint256 _dealId) public view returns (Deal memory) {
        Deal storage deal = deals[_dealId];
        return deal;
    }

    function getDealCounter() public view returns (uint256) {
        return dealCounter;
    }

    function getPayee(uint256 dealId) external view returns (address) {
        return deals[dealId].payee;
    }

    function getPayer(uint256 dealId) external view returns (address) {
        return deals[dealId].payer;
    }

    function getToken(uint256 dealId) external view returns (address) {
        return deals[dealId].token;
    }

    function getRequestedAmount(
        uint256 dealId
    ) external view returns (uint256) {
        return deals[dealId].requestedAmount;
    }

    function getSettledAmount(uint256 dealId) external view returns (uint256) {
        return deals[dealId].settledAmount;
    }

    function getReleasedAmount(uint256 dealId) external view returns (uint256) {
        return deals[dealId].releasedAmount;
    }

    function isPayerFullySettled(uint256 dealId) public view returns (bool) {
        return deals[dealId].settledAmount == deals[dealId].requestedAmount;
    }

    function canPayeeReleaseFund(uint256 dealId) external view returns (bool) {
        return deals[dealId].isPayeeCanReleaseFund;
    }

    function isFundFullyReleasedToPayee(
        uint256 dealId
    ) public view returns (bool) {
        return deals[dealId].releasedAmount == deals[dealId].requestedAmount;
    }

    function isActive(uint256 dealId) external view returns (bool) {
        return deals[dealId].isActive;
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
        for (uint i = 0; i < _addrs.length; i++) {
            whitelisted[_addrs[i]] = _isWhitelisted[i];
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
        for (uint i = 0; i < _addrs.length; i++) {
            whitelistedTokens[_addrs[i]] = _isWhitelisted[i];
        }
    }

    function fundDeal(
        uint256 _dealId,
        address _token,
        uint256 _amount
    ) external whenNotPaused nonReentrant {
        require(getDeal(_dealId).payee != address(0), "Deal not found");
        Deal storage deal = deals[_dealId];

        require(deal.isActive, "Deal is inactive");
        require(
            msg.sender == deal.payer,
            "Only designated payer can fund the deal"
        );
        require(isTokenWhitelisted(_token), "Token is not whitelisted");
        require(_token == deal.token, "Incorrect token");
        require(_amount > 0, "Invalid amount");
        require(
            _amount <= (deal.requestedAmount - deal.settledAmount),
            "Amount exceeds remaining requested amount"
        );

        IERC20(_token).transferFrom(msg.sender, address(this), _amount);

        deal.settledAmount += _amount;

        emit PayerSettled(_dealId, _amount, deal.settledAmount);
    }

    function setIsPayeeCanReleaseFund(
        uint256 _dealId,
        bool value
    ) external whenNotPaused nonReentrant {
        require(getDeal(_dealId).payee != address(0), "Deal not found");
        Deal storage deal = deals[_dealId];

        require(deal.isActive, "Deal is inactive");
        require(
            msg.sender == deal.payer,
            "Only designated payer can approve fund release"
        );
        if (value) {
            require(
                deal.settledAmount > 0,
                "Payer haven't settled any fund yet"
            );
            require(
                !deal.isPayeeCanReleaseFund,
                "Payer already approved fund release"
            );
        }

        deal.isPayeeCanReleaseFund = value;

        emit PayerApprovedFundRelease(_dealId, value);
    }

    function releaseFunds(
        uint256 _dealId,
        address _token,
        uint256 _amount
    ) external whenNotPaused nonReentrant {
        require(getDeal(_dealId).payee != address(0), "Deal not found");
        Deal storage deal = deals[_dealId];

        require(deal.isActive, "Deal is inactive");
        require(
            !isFundFullyReleasedToPayee(_dealId),
            "Fund already fully released to payee"
        );
        require(
            msg.sender == deal.payee,
            "Only designated payee can call to release funds"
        );
        require(_token == deal.token, "Incorrect token");
        require(isTokenWhitelisted(_token), "Token is not whitelisted");
        require(
            deal.isPayeeCanReleaseFund,
            "Fund release not approved by payer"
        );
        require(_amount > 0, "Invalid request amount");
        require(
            _amount <= (deal.requestedAmount - deal.releasedAmount),
            "Cannot release amount higher than remaining requested amount"
        );
        require(
            _amount <= (deal.settledAmount - deal.releasedAmount),
            "Cannot release amount higher than amount settled by payer remaining"
        );

        IERC20(_token).transfer(deal.payee, _amount);

        deal.releasedAmount += _amount;
        if (deal.releasedAmount == deal.requestedAmount) {
            deal.isActive = false;
        }

        emit PayeeReleasedFund(_dealId, _amount, deal.releasedAmount);
    }

    function retrieveFunds(
        uint256 _dealId,
        address _token,
        uint256 _amount
    ) external whenNotPaused nonReentrant {
        require(getDeal(_dealId).payee != address(0), "Deal not found");
        Deal storage deal = deals[_dealId];

        require(!deal.isActive, "Deal is still active");
        require(
            msg.sender == deal.payer,
            "Only designated payer can call to retrieve funds"
        );
        require(_token == deal.token, "Incorrect token");
        require(isTokenWhitelisted(_token), "Token is not whitelisted");
        require(
            (deal.settledAmount - deal.releasedAmount) > 0,
            "No settled amount remaining"
        );
        require(_amount > 0, "Invalid request amount");
        require(
            _amount <= (deal.settledAmount - deal.releasedAmount),
            "Cannot retrieve amount higher than remaining settled amount"
        );

        IERC20(_token).transfer(msg.sender, _amount);

        deal.settledAmount -= _amount;

        emit PayerRetrievedFund(_dealId, _amount, deal.settledAmount);
    }

    function openDeal(
        address _payer,
        address _token,
        uint256 _requestedAmount
    ) external whenNotPaused nonReentrant {
        require(isTokenWhitelisted(_token), "Token is not whitelisted");

        deals[dealCounter] = Deal({
            payee: msg.sender,
            payer: _payer,
            token: _token,
            requestedAmount: _requestedAmount,
            settledAmount: 0,
            releasedAmount: 0,
            isPayeeCanReleaseFund: false,
            isActive: true
        });
        dealCounter++;

        emit DealCreated(
            dealCounter,
            msg.sender,
            _payer,
            _token,
            _requestedAmount
        );
    }

    function closeDeal(uint256 _dealId) external whenNotPaused nonReentrant {
        require(getDeal(_dealId).payee != address(0), "Deal not found");
        Deal storage deal = deals[_dealId];

        require(deal.isActive, "Deal is not active");
        require(
            msg.sender == deal.payee,
            "Only designated payee can close the deal"
        );
        deal.isActive = false;

        emit DealClosed(_dealId);
    }
}
