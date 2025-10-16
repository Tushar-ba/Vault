// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "./vault.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

// Mock ERC20 tokens for testing
contract MockPYUSD is ERC20 {
    constructor() ERC20("PayPal USD", "PYUSD") {
        _mint(msg.sender, 1000000 * 10**6); // 1M PYUSD (6 decimals)
    }
    
    function decimals() public pure override returns (uint8) {
        return 6;
    }
}

contract MockStock is ERC20 {
    constructor(string memory name, string memory symbol) ERC20(name, symbol) {
        _mint(msg.sender, 1000000 * 10**18); // 1M stock tokens (18 decimals)
    }
}

contract VaultTest is Test {
    Vault public vault;
    MockPYUSD public pyusd;
    MockStock public appleStock;
    MockStock public googleStock;
    
    address public owner;
    address public user1;
    address public user2;
    
    uint256 constant INITIAL_STOCK_SUPPLY = 100000; // 100k stocks
    uint256 constant INITIAL_PRICE = 1; // $1 per stock
    
    function setUp() public {
        owner = address(this);
        user1 = makeAddr("user1");
        user2 = makeAddr("user2");
        
        // Deploy mock tokens
        pyusd = new MockPYUSD();
        appleStock = new MockStock("Apple Stock", "AAPL");
        googleStock = new MockStock("Google Stock", "GOOGL");
        
        // Deploy vault
        vault = new Vault(address(pyusd));
        
        // Give users some PYUSD for testing
        pyusd.transfer(user1, 10000 * 10**6); // 10k PYUSD
        pyusd.transfer(user2, 10000 * 10**6); // 10k PYUSD
        
        // Approve vault to spend owner's stock tokens
        appleStock.approve(address(vault), type(uint256).max);
        googleStock.approve(address(vault), type(uint256).max);
    }
    
    function testListAndDepositInitialStock() public {
        // Test listing Apple stock
        vault.listAndDepositInitialStock(
            address(appleStock),
            "Apple Inc",
            INITIAL_STOCK_SUPPLY,
            INITIAL_PRICE
        );
        
        // Check if stock is properly listed
        (string memory name, uint256 pricingFactor, uint256 currentSupply, bool isSupported) = 
            vault.stockList(address(appleStock));
        
        assertEq(name, "Apple Inc");
        assertTrue(isSupported);
        assertEq(currentSupply, INITIAL_STOCK_SUPPLY * 10**18);
        assertGt(pricingFactor, 0);
        
        // Check initial price
        uint256 price = vault.getPrice(address(appleStock));
        assertEq(price, INITIAL_PRICE * 10**6); // $1 in PYUSD decimals
    }
    
    function testCannotListSameStockTwice() public {
        vault.listAndDepositInitialStock(
            address(appleStock),
            "Apple Inc",
            INITIAL_STOCK_SUPPLY,
            INITIAL_PRICE
        );
        
        // Should revert when trying to list again
        vm.expectRevert("Stock already supported");
        vault.listAndDepositInitialStock(
            address(appleStock),
            "Apple Inc",
            INITIAL_STOCK_SUPPLY,
            INITIAL_PRICE
        );
    }
    
    function testOnlyOwnerCanListStocks() public {
        vm.prank(user1);
        vm.expectRevert();
        vault.listAndDepositInitialStock(
            address(appleStock),
            "Apple Inc",
            INITIAL_STOCK_SUPPLY,
            INITIAL_PRICE
        );
    }
    
    function testBuyStock() public {
        // List Apple stock first
        vault.listAndDepositInitialStock(
            address(appleStock),
            "Apple Inc",
            INITIAL_STOCK_SUPPLY,
            INITIAL_PRICE
        );
        
        uint256 buyAmount = 100; // Buy 100 stocks
        uint256 expectedCost = buyAmount * INITIAL_PRICE * 10**6; // $100 in PYUSD
        
        // User1 approves PYUSD spending
        vm.startPrank(user1);
        pyusd.approve(address(vault), expectedCost);
        
        uint256 userPyusdBefore = pyusd.balanceOf(user1);
        uint256 userStockBefore = appleStock.balanceOf(user1);
        
        // Buy stocks
        vault.buyStock(address(appleStock), buyAmount);
        
        // Check balances
        assertEq(pyusd.balanceOf(user1), userPyusdBefore - expectedCost);
        assertEq(appleStock.balanceOf(user1), userStockBefore + (buyAmount * 10**18));
        
        // Check user stock balance in vault tracking
        assertEq(vault.userStockBalances(address(appleStock), user1), buyAmount * 10**18);
        
        vm.stopPrank();
    }
    
    function testPriceIncreasesAfterBuying() public {
        // List Apple stock
        vault.listAndDepositInitialStock(
            address(appleStock),
            "Apple Inc",
            INITIAL_STOCK_SUPPLY,
            INITIAL_PRICE
        );
        
        uint256 initialPrice = vault.getPrice(address(appleStock));
        
        // User1 buys stocks
        vm.startPrank(user1);
        pyusd.approve(address(vault), 1000 * 10**6);
        vault.buyStock(address(appleStock), 1000); // Buy 1000 stocks
        vm.stopPrank();
        
        uint256 newPrice = vault.getPrice(address(appleStock));
        
        // Price should increase after buying (supply decreased)
        assertGt(newPrice, initialPrice);
    }
    
    function testSellStock() public {
        // Setup: List stock and user buys some
        vault.listAndDepositInitialStock(
            address(appleStock),
            "Apple Inc",
            INITIAL_STOCK_SUPPLY,
            INITIAL_PRICE
        );
        
        vm.startPrank(user1);
        pyusd.approve(address(vault), 1000 * 10**6);
        vault.buyStock(address(appleStock), 1000);
        
        // Now sell back 500 stocks
        uint256 sellAmount = 500;
        uint256 currentPrice = vault.getPrice(address(appleStock));
        uint256 expectedPayout = sellAmount * currentPrice;
        
        appleStock.approve(address(vault), sellAmount * 10**18);
        
        uint256 userPyusdBefore = pyusd.balanceOf(user1);
        uint256 userStockBefore = appleStock.balanceOf(user1);
        
        vault.sellStock(address(appleStock), sellAmount);
        
        // Check balances
        assertEq(pyusd.balanceOf(user1), userPyusdBefore + expectedPayout);
        assertEq(appleStock.balanceOf(user1), userStockBefore - (sellAmount * 10**18));
        
        vm.stopPrank();
    }
    
    function testPriceDecreasesAfterSelling() public {
        // Setup: List stock and user buys some
        vault.listAndDepositInitialStock(
            address(appleStock),
            "Apple Inc",
            INITIAL_STOCK_SUPPLY,
            INITIAL_PRICE
        );
        
        vm.startPrank(user1);
        pyusd.approve(address(vault), 1000 * 10**6);
        vault.buyStock(address(appleStock), 1000);
        
        uint256 priceAfterBuying = vault.getPrice(address(appleStock));
        
        // Sell back some stocks
        appleStock.approve(address(vault), 500 * 10**18);
        vault.sellStock(address(appleStock), 500);
        
        uint256 priceAfterSelling = vault.getPrice(address(appleStock));
        
        // Price should decrease after selling (supply increased)
        assertLt(priceAfterSelling, priceAfterBuying);
        
        vm.stopPrank();
    }
    
    function testCannotBuyUnsupportedStock() public {
        vm.startPrank(user1);
        pyusd.approve(address(vault), 1000 * 10**6);
        
        vm.expectRevert("Stock not supported");
        vault.buyStock(address(appleStock), 100);
        
        vm.stopPrank();
    }
    
    function testCannotBuyMoreThanAvailable() public {
        vault.listAndDepositInitialStock(
            address(appleStock),
            "Apple Inc",
            1000, // Only 1000 stocks available
            INITIAL_PRICE
        );
        
        vm.startPrank(user1);
        pyusd.approve(address(vault), 2000 * 10**6);
        
        vm.expectRevert("Insufficient stock in vault");
        vault.buyStock(address(appleStock), 1001); // Try to buy more than available
        
        vm.stopPrank();
    }
    
    function testMultipleStocks() public {
        // List both Apple and Google stocks
        vault.listAndDepositInitialStock(
            address(appleStock),
            "Apple Inc",
            INITIAL_STOCK_SUPPLY,
            INITIAL_PRICE
        );
        
        vault.listAndDepositInitialStock(
            address(googleStock),
            "Google Inc",
            50000, // Different supply
            2 // Different price
        );
        
        // Check both stocks are listed with different prices
        uint256 applePrice = vault.getPrice(address(appleStock));
        uint256 googlePrice = vault.getPrice(address(googleStock));
        
        assertEq(applePrice, 1 * 10**6); // $1
        assertEq(googlePrice, 2 * 10**6); // $2
        
        // User can buy from both stocks
        vm.startPrank(user1);
        pyusd.approve(address(vault), 10000 * 10**6);
        
        vault.buyStock(address(appleStock), 100);
        vault.buyStock(address(googleStock), 50);
        
        assertEq(appleStock.balanceOf(user1), 100 * 10**18);
        assertEq(googleStock.balanceOf(user1), 50 * 10**18);
        
        vm.stopPrank();
    }
    
    function testGetPriceFailsWhenNoSupply() public {
        vault.listAndDepositInitialStock(
            address(appleStock),
            "Apple Inc",
            100, // Small supply
            INITIAL_PRICE
        );
        
        // Buy all available stocks
        vm.startPrank(user1);
        pyusd.approve(address(vault), 1000 * 10**6);
        vault.buyStock(address(appleStock), 100);
        vm.stopPrank();
        
        // Now getPrice should revert since supply is 0
        vm.expectRevert("No stock available for pricing");
        vault.getPrice(address(appleStock));
    }
    
    function testCompleteWorkflow() public {
        // Complete workflow test: List -> Buy -> Price increases -> Sell -> Price decreases
        vault.listAndDepositInitialStock(
            address(appleStock),
            "Apple Inc",
            INITIAL_STOCK_SUPPLY,
            INITIAL_PRICE
        );
        
        uint256 initialPrice = vault.getPrice(address(appleStock));
        assertEq(initialPrice, 1 * 10**6); // $1
        
        // User1 buys 1000 stocks
        vm.startPrank(user1);
        pyusd.approve(address(vault), 10000 * 10**6);
        vault.buyStock(address(appleStock), 1000);
        
        uint256 priceAfterBuy = vault.getPrice(address(appleStock));
        assertGt(priceAfterBuy, initialPrice); // Price increased
        
        // User1 sells 500 stocks back
        appleStock.approve(address(vault), 500 * 10**18);
        vault.sellStock(address(appleStock), 500);
        
        uint256 priceAfterSell = vault.getPrice(address(appleStock));
        assertLt(priceAfterSell, priceAfterBuy); // Price decreased
        assertGt(priceAfterSell, initialPrice); // But still higher than initial
        
        vm.stopPrank();
    }
}
