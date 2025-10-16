// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

 
contract Vault is Ownable, ReentrancyGuard {

    // --- State Variables ---

    IERC20 public pyusdStablecoin;
    uint8 public constant PYUSD_DECIMALS = 6;
    uint8 public constant STOCK_DECIMALS = 18; 

    struct StockInfo {
        string name;
        uint256 pricingFactor;  
        uint256 currentSupply;  
        bool isSupported;
    }

    mapping(address => StockInfo) public stockList;
    mapping(address => mapping(address => uint256)) public userStockBalances;


    // --- Events ---

    event StockListed(address indexed token, string name, uint256 initialSupply, uint256 pricingFactor);
    event StockBought(address indexed user, address indexed token, uint256 amountBought, uint256 pyusdCost);
    event StockSold(address indexed user, address indexed token, uint256 amountSold, uint256 pyusdReceived);

    // --- Constructor ---

    constructor(address _pyusdStablecoin) Ownable(msg.sender) {
        require(_pyusdStablecoin != address(0), "PYUSD address is zero");
        pyusdStablecoin = IERC20(_pyusdStablecoin);
    }

    // --- View Functions ---

    /**
     * @notice Calculates the current price of ONE WHOLE stock token.
     * @param _token The address of the stock token.
     * @return price The price in PYUSD's smallest unit (e.g., if price is $2.50, returns 2500000).
     */
    function getPrice(address _token) public view returns (uint256 price) {
        StockInfo storage stock = stockList[_token];
        require(stock.isSupported, "Stock not supported");
        require(stock.currentSupply > 0, "No stock available for pricing");
        return (stock.pricingFactor * (10**STOCK_DECIMALS)) / stock.currentSupply;
    }

    // --- Owner Functions ---

    /**
     * @notice Lists a new stock, calculates its pricing factor, and deposits the initial supply.
     * @param _token The address of the stock token.
     * @param _name The readable name of the stock.
     * @param _initialSupplyInWholeTokens The amount of tokens to deposit (e.g., 100000).
     * @param _priceInPyusd The desired price in whole PYUSD at that supply (e.g., 2 for $2.00).
     */
    function listAndDepositInitialStock(
        address _token,
        string memory _name,
        uint256 _initialSupplyInWholeTokens,
        uint256 _priceInPyusd
    ) public onlyOwner nonReentrant {
        require(_token != address(0), "Token address is zero");
        require(!stockList[_token].isSupported, "Stock already supported");
        require(_initialSupplyInWholeTokens > 0, "Initial supply must be > 0");
        require(_priceInPyusd > 0, "Initial price must be > 0");
        require(bytes(_name).length > 0, "Name required");
        
        uint256 initialSupplyInWei = _initialSupplyInWholeTokens * (10**STOCK_DECIMALS);
        uint256 priceInPyusdWei = _priceInPyusd * (10**PYUSD_DECIMALS);

        // Calculate the factor needed to produce the target price at the target supply
        // Factor = (Target Price * Target Supply) / 10^18
        uint256 calculatedFactor = (priceInPyusdWei * initialSupplyInWei) / (10**STOCK_DECIMALS);

        stockList[_token] = StockInfo({
            name: _name,
            pricingFactor: calculatedFactor,
            currentSupply: initialSupplyInWei,
            isSupported: true
        });

        // Pull the initial supply from the owner's wallet into this contract
        // Optional pre-check for clearer error
        require(IERC20(_token).allowance(msg.sender, address(this)) >= initialSupplyInWei, "Insufficient stock allowance for deposit");
        SafeERC20.safeTransferFrom(IERC20(_token), msg.sender, address(this), initialSupplyInWei);

        emit StockListed(_token, _name, initialSupplyInWei, calculatedFactor);
    }

    // --- User Functions ---

    /**
     * @notice User buys a certain amount of stock with PYUSD.
     * @param _token The address of the stock they want to buy.
     * @param _amountInWholeTokens The amount of stock to buy (e.g., 5 for 5 tokens).
     */
    function buyStock(address _token, uint256 _amountInWholeTokens) public nonReentrant {
        StockInfo storage stock = stockList[_token];
        require(stock.isSupported, "Stock not supported");
        require(_token != address(0), "Token address is zero");
        require(_amountInWholeTokens > 0, "Amount must be > 0");

        uint256 amountInWei = _amountInWholeTokens * (10**STOCK_DECIMALS);
        require(stock.currentSupply >= amountInWei, "Insufficient stock in vault");

        uint256 currentPrice = getPrice(_token);
        uint256 totalCost = currentPrice * _amountInWholeTokens;
        require(totalCost > 0, "Total cost is zero");
        
        require(pyusdStablecoin.allowance(msg.sender, address(this)) >= totalCost, "Insufficient PYUSD allowance");
        require(pyusdStablecoin.balanceOf(msg.sender) >= totalCost, "Insufficient PYUSD balance");
        // Ensure vault actually holds the stock to deliver
        require(IERC20(_token).balanceOf(address(this)) >= amountInWei, "Vault token balance low");
        
        // --- State Changes (Checks-Effects-Interactions Pattern) ---
        stock.currentSupply -= amountInWei;
        userStockBalances[_token][msg.sender] += amountInWei;

        // --- Interactions ---
        SafeERC20.safeTransferFrom(pyusdStablecoin, msg.sender, address(this), totalCost);
        SafeERC20.safeTransfer(IERC20(_token), msg.sender, amountInWei);

        emit StockBought(msg.sender, _token, amountInWei, totalCost);
    }

    /**
     * @notice User sells a certain amount of stock back to the vault for PYUSD.
     * @param _token The address of the stock they want to sell.
     * @param _amountInWholeTokens The amount of stock to sell (e.g., 5 for 5 tokens).
     */
    function sellStock(address _token, uint256 _amountInWholeTokens) public nonReentrant {
        StockInfo storage stock = stockList[_token];
        require(stock.isSupported, "Stock not supported");
        require(_token != address(0), "Token address is zero");
        require(_amountInWholeTokens > 0, "Amount must be > 0");
        
        uint256 amountInWei = _amountInWholeTokens * (10**STOCK_DECIMALS);
        require(IERC20(_token).balanceOf(msg.sender) >= amountInWei, "Insufficient stock balance");
        require(IERC20(_token).allowance(msg.sender, address(this)) >= amountInWei, "Insufficient stock allowance");

        uint256 currentPrice = getPrice(_token);
        uint256 payoutAmount = currentPrice * _amountInWholeTokens;
        require(payoutAmount > 0, "Payout is zero");

        require(pyusdStablecoin.balanceOf(address(this)) >= payoutAmount, "Vault has insufficient PYUSD for payout");
        
        // --- State Changes (Checks-Effects-Interactions Pattern) ---
        stock.currentSupply += amountInWei;
        // Only decrease user balance if they actually have a balance from this vault
        if (userStockBalances[_token][msg.sender] >= amountInWei) {
            userStockBalances[_token][msg.sender] -= amountInWei;
        }

        // --- Interactions ---
        SafeERC20.safeTransferFrom(IERC20(_token), msg.sender, address(this), amountInWei);
        SafeERC20.safeTransfer(pyusdStablecoin, msg.sender, payoutAmount);
        
        emit StockSold(msg.sender, _token, amountInWei, payoutAmount);
    }

    function withdrawPYUSD(uint256 _amountInWholeTokens) public onlyOwner nonReentrant {
        require(_amountInWholeTokens > 0, "Amount must be > 0");
        uint256 amountInWei = _amountInWholeTokens * (10**PYUSD_DECIMALS);
        require(pyusdStablecoin.balanceOf(address(this)) >= amountInWei, "Insufficient PYUSD in vault");
        SafeERC20.safeTransfer(pyusdStablecoin, msg.sender, amountInWei);
    }

}