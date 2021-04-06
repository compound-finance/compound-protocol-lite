//SPDX-License-Identifier: GPL-3.0

pragma solidity ^0.8.2;

struct Observation {
    uint timestamp;
    uint acc;
}

abstract contract IUniswapAnchoredView {
    /// @notice The Open Oracle Price Data contract
    function priceData() external virtual pure returns (address);

    /// @notice The number of wei in 1 ETH
    function ethBaseUnit() external virtual pure returns (uint);

    /// @notice A common scaling factor to maintain precision
    function expScale() external virtual pure returns (uint);

    /// @notice The Open Oracle Reporter
    function reporter() external virtual pure returns (address);

    /// @notice The highest ratio of the new price to the anchor price that will still trigger the price to be updated
    function upperBoundAnchorRatio() external virtual pure returns (uint);

    /// @notice The lowest ratio of the new price to the anchor price that will still trigger the price to be updated
    function lowerBoundAnchorRatio() external virtual pure returns (uint);

    /// @notice The minimum amount of time in seconds required for the old uniswap price accumulator to be replaced
    function anchorPeriod() external virtual pure returns (uint);

    /// @notice Official prices by symbol hash
    mapping(bytes32 => uint) public prices;

    /// @notice Circuit breaker for using anchor price oracle directly, ignoring reporter
    bool public reporterInvalidated;

    /// @notice The old observation for each symbolHash
    mapping(bytes32 => Observation) public oldObservations;

    /// @notice The new observation for each symbolHash
    mapping(bytes32 => Observation) public newObservations;

    /// @notice The event emitted when new prices are posted but the stored price is not updated due to the anchor
    event PriceGuarded(string symbol, uint reporter, uint anchor);

    /// @notice The event emitted when the stored price is updated
    event PriceUpdated(string symbol, uint price);

    /// @notice The event emitted when anchor price is updated
    event AnchorPriceUpdated(string symbol, uint anchorPrice, uint oldTimestamp, uint newTimestamp);

    /// @notice The event emitted when the uniswap window changes
    event UniswapWindowUpdated(bytes32 indexed symbolHash, uint oldTimestamp, uint newTimestamp, uint oldPrice, uint newPrice);

    /// @notice The event emitted when reporter invalidates itself
    event ReporterInvalidated(address reporter);

    bytes32 constant ethHash = keccak256(abi.encodePacked("ETH"));
    bytes32 constant rotateHash = keccak256(abi.encodePacked("rotate"));

    /**
     * @notice Get the official price for a symbol
     * @param symbol The symbol to fetch the price of
     * @return Price denominated in USD, with 6 decimals
     */
    function price(string memory symbol) external virtual view returns (uint);

    /**
     * @notice Get the underlying price of a cToken
     * @dev Implements the PriceOracle interface for Compound v2.
     * @param cToken The cToken address for price retrieval
     * @return Price denominated in USD, with 18 decimals, for the given cToken address
     */
    function getUnderlyingPrice(address cToken) external virtual view returns (uint);

    /**
     * @notice Post open oracle reporter prices, and recalculate stored price by comparing to anchor
     * @dev We let anyone pay to post anything, but only prices from configured reporter will be stored in the view.
     * @param messages The messages to post to the oracle
     * @param signatures The signatures for the corresponding messages
     * @param symbols The symbols to compare to anchor for authoritative reading
     */
    function postPrices(bytes[] calldata messages, bytes[] calldata signatures, string[] calldata symbols) external virtual;

    /**
     * @notice Invalidate the reporter, and fall back to using anchor directly in all cases
     * @dev Only the reporter may sign a message which allows it to invalidate itself.
     *  To be used in cases of emergency, if the reporter thinks their key may be compromised.
     * @param message The data that was presumably signed
     * @param signature The fingerprint of the data + private key
     */
    function invalidateReporter(bytes memory message, bytes memory signature) external virtual;

    /**
     * @notice Recovers the source address which signed a message
     * @dev Comparing to a claimed address would add nothing,
     *  as the caller could simply perform the recover and claim that address.
     * @param message The data that was presumably signed
     * @param signature The fingerprint of the data + private key
     * @return The source address which signed the message, presumably
     */
    function source(bytes memory message, bytes memory signature) external virtual pure returns (address);
}