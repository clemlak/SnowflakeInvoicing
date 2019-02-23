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
        uint256 merchant;
        uint256[] customers;
        uint256 amount;
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

    mapping (uint256 => uint256[]) public merchantsToInvoices;
    mapping (uint256 => uint256[]) public customersToInvoices;

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
        SnowflakeResolver("Invoicing", "Create invoices", snowflakeAddress, false, false) public
    {}

    // implement signup function
    function onAddition(uint ein, uint, bytes memory) public senderIsSnowflake() returns (bool) {
    }

    function onRemoval(uint, bytes memory) public senderIsSnowflake() returns (bool) {}

    function createDraftInvoice(
        uint256[] memory customers,
        uint256 amount,
        bool allowPartialPayment,
        uint256 minimumAmountDue,
        Terms paymentTerm,
        uint256 term
    ) public {
        SnowflakeInterface snowflake = SnowflakeInterface(snowflakeAddress);
        IdentityRegistryInterface identityRegistry = IdentityRegistryInterface(snowflake.identityRegistryAddress());

        uint256 ein = identityRegistry.getEIN(msg.sender);
        require(identityRegistry.isResolverFor(ein, address(this)), "The EIN has not set this resolver.");

        uint256 invoiceId = invoices.push(
            Invoice({
                status: Status.Draft,
                date: now,
                merchant: ein,
                customers: customers,
                amount: amount,
                paidAmount: 0,
                refundedAmount: 0,
                allowPartialPayment: allowPartialPayment,
                minimumAmountDue: minimumAmountDue,
                paymentTerm: paymentTerm,
                term: term,
                additionalTerms: "",
                note: ""
            })
        ) - 1;

        merchantsToInvoices[ein].push(invoiceId);
    }

    function updateInvoiceAdditionalTerms(
        uint256 invoiceId,
        string memory additionalTerms
    ) public onlyMerchant() {
        require(
            invoices[invoiceId].status == Status.Draft,
            "The invoice is not a draft anymore"
        );

        invoices[invoiceId].additionalTerms = additionalTerms;
    }

    function getInvoiceInfo(uint256 invoiceId) public view returns (
        Status status,
        uint256 date,
        uint256 merchant,
        uint256[] memory customers
    ) {
        return (
            invoices[invoiceId].status,
            invoices[invoiceId].date,
            invoices[invoiceId].merchant,
            invoices[invoiceId].customers
        );
    }

    function getInvoiceDetails(uint256 invoiceId) public view returns (
        uint256 amount,
        uint256 paidAmount,
        uint256 refundedAmount,
        bool allowPartialPayment,
        uint256 minimumAmountDue,
        Terms paymentTerm,
        uint256 term
    ) {
        return (
            invoices[invoiceId].amount,
            invoices[invoiceId].paidAmount,
            invoices[invoiceId].refundedAmount,
            invoices[invoiceId].allowPartialPayment,
            invoices[invoiceId].minimumAmountDue,
            invoices[invoiceId].paymentTerm,
            invoices[invoiceId].term
        );
    }

    function getInvoicesAdditionalDetails(uint256 invoiceId) public view returns (
        string memory additionalTerms,
        string memory note
    ) {
        return (
            invoices[invoiceId].additionalTerms,
            invoices[invoiceId].note
        );
    }

    function getInvoicesFromMerchant(uint256 ein) public view returns (uint256[] memory) {
        return merchantsToInvoices[ein];
    }

    function getInvoicesFromCustomer(uint256 ein) public view returns (uint256[] memory) {
        return customersToInvoices[ein];
    }

    modifier onlyMerchant() {
        SnowflakeInterface snowflake = SnowflakeInterface(snowflakeAddress);
        IdentityRegistryInterface identityRegistry = IdentityRegistryInterface(snowflake.identityRegistryAddress());

        uint256 ein = identityRegistry.getEIN(msg.sender);
        require(identityRegistry.isResolverFor(ein, address(this)), "The EIN has not set this resolver.");

        _;
    }
}
