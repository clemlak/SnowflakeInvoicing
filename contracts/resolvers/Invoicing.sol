/* solhint-disable no-empty-blocks */

pragma solidity 0.5.0;

import "../SnowflakeResolver.sol";
import "../interfaces/IdentityRegistryInterface.sol";
import "../interfaces/HydroInterface.sol";
import "../interfaces/SnowflakeInterface.sol";


/**
 * @title Invoicing
 * @notice Create invoices through Snowflake
 * @dev This contract is the base of the dapp
 */
contract Invoicing is SnowflakeResolver {
    /* Invoices can have several status, but only one at a time */
    enum Status { Draft, Unpaid, PartiallyPaid, Paid, PartiallyRefunded, Refunded, Canceled, Disputed }

    /* These are our payment terms */
    enum Terms { DueOnReceipt, DueOnDate, NoDueDate, NetD }

    /* This defines the invoices */
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

    /* We link the merchants to their invoices */
    mapping (uint256 => uint256[]) public merchantsToInvoices;

    /* We link the customers to their invoices */
    mapping (uint256 => uint256[]) public customersToInvoices;

    /* We keep track of the payments here (invoiceId => ein => amount) */
    mapping (uint256 => mapping (uint256 => uint256)) public payments;

    /* We keep track of the refunds here (invoiceId => ein => amount) */
    mapping (uint256 => mapping (uint256 => uint256)) public refunds;

    /**
     * @dev Emitted when an invoice is created
     * @param invoiceId The id of the new invoice
     * @param merchant The ein of the merchant
     * @param customers the ein of the customers
     */
    event LogInvoiceCreated(uint256 invoiceId, uint256 indexed merchant, uint256[] customers);

    /**
     * @dev Emitted when a payment is made
     * @param invoiceId The id of the new invoice
     * @param customer The ein of the customer
     * @param amount The paid amount
     */
    event LogPayment(uint256 invoiceId, uint256 customer, uint256 amount);

    /**
     * @dev Emitted when a refund is made
     * @param invoiceId The id of the new invoice
     * @param customer The ein of the customer
     * @param amount The refunded amount
     */
    event LogRefund(uint256 invoiceId, uint256 customer, uint256 amount);

    constructor (address snowflakeAddress) public
        SnowflakeResolver("Invoicing", "Create invoices", snowflakeAddress, false, false) {}

    function onAddition(uint ein, uint, bytes memory) public senderIsSnowflake() returns (bool) {}

    function onRemoval(uint, bytes memory) public senderIsSnowflake() returns (bool) {}

    /**
     * @dev Creates a new draft invoice
     * @param customers The ein of the customers
     * @param amount The amount of the invoice
     * @param allowPartialPayment If partial payment is allowed
     * @param minimumAmountDue The minimum amount for a payment
     * @param paymentTerm The type of term of payment
     * @param term The term of payment, in days or a timestamp
     */
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

        emit LogInvoiceCreated(0, ein, customers);
    }

    /**
     * @dev Updates the customers of an invoice
     * @param invoiceId The id of the invoice
     * @param customers The updated customers list
     */
    function updateInvoiceCustomers(
        uint256 invoiceId,
        uint256[] memory customers
    ) public onlyMerchant() {
        require(
            invoices[invoiceId].status == Status.Draft,
            "This invoice is not a draft anymore"
        );

        invoices[invoiceId].customers = customers;
    }

    /**
     * @dev Updates the payment data of an invoice
     * @param invoiceId The id of the invoice
     * @param amount The amount of the invoice
     * @param allowPartialPayment If partial payment is allowed
     * @param minimumAmountDue The minimum amount for a payment
     * @param paymentTerm The type of term of payment
     * @param term The term of payment, in days or a timestamp
     * @param additionalTerms Additional terms (as a string)
     * @param note Additional note (as a string)
     */
    function updateInvoicePayment(
        uint256 invoiceId,
        uint256 amount,
        bool allowPartialPayment,
        uint256 minimumAmountDue,
        Terms paymentTerm,
        uint256 term,
        string memory additionalTerms,
        string memory note
    ) public onlyMerchant() {
        require(
            invoices[invoiceId].status == Status.Draft,
            "This invoice is not a draft anymore"
        );

        invoices[invoiceId].amount = amount;
        invoices[invoiceId].allowPartialPayment = allowPartialPayment;
        invoices[invoiceId].minimumAmountDue = minimumAmountDue;
        invoices[invoiceId].paymentTerm = paymentTerm;
        invoices[invoiceId].term = term;
        invoices[invoiceId].additionalTerms = additionalTerms;
        invoices[invoiceId].note = note;
    }

    /**
     * @dev Gets invoice info
     * @param invoiceId The id of the invoice
     * @return The status, date, merchant and customers of an invoice
     */
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

    /**
     * @dev Gets invoice details
     * @param invoiceId The id of the invoice
     * @return The amount, paidAmount, refundedAmount, allowPartialPayment, paymentTerm and term of the invoice
     */
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

    /**
     * @dev Gets invoice additional details
     * @param invoiceId The id of the invoice
     * @return The additionalTerms and note of the invoice
     */
    function getInvoicesAdditionalDetails(uint256 invoiceId) public view returns (
        string memory additionalTerms,
        string memory note
    ) {
        return (
            invoices[invoiceId].additionalTerms,
            invoices[invoiceId].note
        );
    }

    /**
     * @dev Returns the invoices of a merchant
     * @param ein The ein of the merechant
     * @return The id of the invoices
     */
    function getInvoicesFromMerchant(uint256 ein) public view returns (uint256[] memory) {
        return merchantsToInvoices[ein];
    }

    /**
     * @dev Returns the invoices of a customer
     * @param ein The ein of the customer
     * @return The id of the invoices
     */
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
