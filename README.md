# Snowflake Invoicing

## Introduction
Snowflake Invoicing allows a business to invoice another business or consumer for a specific amount, on a specified date, and in a certain amount of Hydro.
This Ethereum smart contract is built on top of [Hydro Snowflake](https://medium.com/hydrogen-api/examining-erc-1484-hydro-snowflake-cc3753a5ff52) as defined [here](https://github.com/HydroBlockchain/hcdp/issues/254).

## Usage
The resolver is located at `contracts/resolvers/Invoicing.sol`.

### Create a draft invoice

Creates a new draft invoice.

```javascript
function createDraftInvoice(
    string memory id,
    uint256[] memory customers,
    uint256 amount,
    bool allowPartialPayment,
    uint256 minimumAmountDue,
    Terms paymentTerm,
    uint256 term
)
```

#### Parameters
| Name | Type | Description
|---|:---:|---|
| id | string | A custom id for the invoice |
| customers | uint256[] | The ein of the customers (in an array) |
| amount | uint256 | The amount of the invoice (in HYDRO) |
| allowPartialPayment | bool | If partial payment is allowed |
| minimumAmountDue | string | The minimum amount for a payment |
| paymentTerm | Terms (uint8) | The type of term of payment (DueOnReceipt, DueOnDate, NoDueDate, NetD) |
| term | uint256 | The term of payment (in days or a timestamp) |

### Update invoice customers

Updates the payment data of an invoice (only if the invoice is still a draft).

```javascript
function updateInvoiceCustomers(
    uint256 invoiceId,
    uint256[] memory customers
)
```

#### Parameters
| Name | Type | Description
|---|:---:|---|
| invoiceId | uint256 | The id of the invoice |
| customers | uint256[] | The ein of the new customers (in an array) |

### Update invoice payment data

Updates the payment data of an invoice (only if the invoice is still a draft).

```javascript
function updateInvoicePayment(
    uint256 invoiceId,
    uint256 amount,
    bool allowPartialPayment,
    uint256 minimumAmountDue,
    Terms paymentTerm,
    uint256 term,
    string memory additionalTerms,
    string memory note
)
```

#### Parameters
| Name | Type | Description
|---|:---:|---|
| invoiceId | uint256 | The id of the invoice |
| amount | uint256 | The amount of the invoice |
| allowPartialPayment | bool | If partial payment is allowed |
| minimumAmountDue | uint256 | The minimum amount for a payment |
| paymentTerm | Terms | The type of term of payment |
| term | uint256 | The term of payment, in days or a timestamp |
| additionalTerms | string | Additional terms (as a string) |
| note | string | Additional note (as a string) |

### Validate an invoice

Validates an invoice (only if the invoice is still a draft).

```javascript
function validateInvoice(uint256 invoiceId) public
```

#### Parameters
| Name | Type | Description
|---|:---:|---|
| invoiceId | uint256 | The id of the invoice |

### Pay an invoice

Pays an invoice.

```javascript
function payInvoice(uint256 invoiceId, uint256 amount) public
```

#### Parameters
| Name | Type | Description
|---|:---:|---|
| invoiceId | uint256 | The id of the invoice |
| amount | uint256 | The amount used to pay |

### Refund a customer

Refunds a customer.

```javascript
function refundCustomer(
    uint256 invoiceId,
    uint256 customer,
    uint256 amount)
public
```

#### Parameters
| Name | Type | Description
|---|:---:|---|
| invoiceId | uint256 | The id of the invoice |
| customer | uint256 | The ein of the customer |
| amount | uint256 | The amount to refund |

### Cancel an invoice

Cancels an invoice.

```javascript
function cancelInvoice(uint256 invoiceId) public
```

#### Parameters
| Name | Type | Description
|---|:---:|---|
| invoiceId | uint256 | The id of the invoice |

### Open a dispute

Opens a dispute.

```javascript
function openDispute(uint256 invoiceId, string memory details)
```

#### Parameters
| Name | Type | Description
|---|:---:|---|
| invoiceId | uint256 | The id of the invoice |
| details | string | The details of the dispute |

### Close a dispute

Closes a dispute.

```javascript
function closeDispute(uint256 invoiceId) public
```

#### Parameters
| Name | Type | Description
|---|:---:|---|
| invoiceId | uint256 | The id of the invoice |

### Get invoice info

Returns the info of an invoice.

```javascript
function getInvoiceInfo(uint256 invoiceId) public
```

#### Parameters
| Name | Type | Description
|---|:---:|---|
| invoiceId | uint256 | The id of the invoice |

#### Return
| Name | Type | Description
|---|:---:|---|
| id | string | The custom id of the invoice |
| status | Status | The status of the invoice |
| date | uint256 | The date of the creation of the invoice |
| merchant | uint256 | The ein of the merchant |
| customers | uint256[] | The ein of the customers (in an array) |

### Get invoice details

Returns the details of the invoice.

```javascript
function getInvoiceDetails(uint256 invoiceId) public
```

#### Parameters
| Name | Type | Description
|---|:---:|---|
| invoiceId | uint256 | The id of the invoice |

#### Return
| Name | Type | Description
|---|:---:|---|
| amount | uint256 | The amount of the invoice |
| paidAmount | uint256 | The paid amount |
| refundedAmount | uint256 | The refunded amount |
| allowPartialPayment | bool | If partial payment is allowed |
| minimumAmountDue | uint256 | The minimum amount for a payment |
| paymentTerm | Terms | The type of term of payment |
| term | uint256 | The term of payment, in days or a timestamp |

### Get additional invoice details

Returns the additional details of the invoice.

```javascript
function getInvoicesAdditionalDetails(uint256 invoiceId) public
```

#### Parameters
| Name | Type | Description
|---|:---:|---|
| invoiceId | uint256 | The id of the invoice |

#### Return
| Name | Type | Description
|---|:---:|---|
| additionalTerms | string | The additional terms of the invoice |
| note | string | The note of the invoice |

### Get the invoices of a merchant

Returns the id of all the invoices created by a merchant.

```javascript
function getInvoicesFromMerchant(uint256 ein) public
```

#### Parameters
| Name | Type | Description
|---|:---:|---|
| ein | uint256 | The ein of the merchant |

#### Return
| Name | Type | Description
|---|:---:|---|
| invoices | uint256[] | The id of all the invoices |

### Get the invoices of a customer

Returns the id of all the invoices linked to a customer.

```javascript
function getInvoicesFromCustomer(uint256 ein) public
```

#### Parameters
| Name | Type | Description
|---|:---:|---|
| ein | uint256 | The ein of the customer |

#### Return
| Name | Type | Description
|---|:---:|---|
| invoices | uint256[] | The id of all the invoices |

## Testing With Truffle
- This folder has a suite of tests created through [Truffle](https://github.com/trufflesuite/truffle).
- To run these tests:
  - Clone this repo
  - Run `npm install`
  - Build dependencies with `npm run build`
  - Spin up a development blockchain: `npm run chain`
  - Run the tests with `npm run test-invoicing`

## Copyright & License
Copyright 2018 The Hydrogen Technology Corporation under the GNU General Public License v3.0.
