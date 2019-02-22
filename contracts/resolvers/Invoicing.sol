pragma solidity ^0.5.0;

import "../SnowflakeResolver.sol";
import "../interfaces/IdentityRegistryInterface.sol";
import "../interfaces/HydroInterface.sol";
import "../interfaces/SnowflakeInterface.sol";


contract Invoicing is SnowflakeResolver {
    enum Status { Draft, Unpaid, PartiallyPaid, Paid, PartiallyRefunded, Refunded, Canceled, Disputed }
    enum Terms { DueOnReceipt, DueOnDate, NoDueDate, NetD }

    struct Invoice {
        Status status;
        uint256 date;
        address merchant;
        address[] customers;
        uint256 amount;
        string currency;
        uint256 paidAmount;
        uint256 refundedAmount;
        bool allowPartialPayment;
        uint256 minimumAmountDue;
        Terms paymentTerm;
        uint256 term;
        string additionalTerms;
        string note;
    }

    Invoice[] private invoices;
    /**
     * @dev We keep track of the payments here
     * The struct is invoiceId => ein => amount
     */
    mapping (uint256 => mapping (uint256 => uint256)) public payments;

    /**
     * @dev We keep track of the refunds here
     * The struct is invoiceId => ein => amount
     */
    mapping (uint256 => mapping (uint256 => uint256)) public refunds;

    event LogInvoiceCreated(uint256 invoiceId, address indexed merchant, address[] customers);

    event LogPayment(uint256 invoiceId, address customer, uint256 amount);

    event LogRefund(uint256 invoiceId, address customer, uint256 amount);

    constructor (address snowflakeAddress)
        SnowflakeResolver("Status", "Set your status.", snowflakeAddress, false, false) public
    {}

    // implement signup function
    function onAddition(uint ein, uint, bytes memory) public senderIsSnowflake() returns (bool) {
    }

    function onRemoval(uint, bytes memory) public senderIsSnowflake() returns (bool) {}
}
