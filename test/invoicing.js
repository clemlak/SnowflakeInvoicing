const common = require('./common.js')
const { sign, verifyIdentity } = require('./utilities')

const Invoicing = artifacts.require('./resolvers/Invoicing.sol')

const Status = {
  Draft: 0,
  Unpaid: 1,
  PartiallyPaid: 2,
  Paid: 3,
  PartiallyRefunded: 4,
  Refunded: 5,
  Canceled: 6,
  Disputed: 7
};

const Terms = {
  DueOnReceipt: 0,
  DueOnDate: 1,
  NoDueDate: 2,
  NetD: 3,
};

let instances
let merchant
let merchantEin;
let customer;
let customerEin;

const invoice = {
  customers: [5, 6],
  amount: web3.utils.toWei('500'),
  allowPartialPayment: true,
  minimumAmountDue: web3.utils.toWei('10'),
  paymentTerm: 0,
  term: 0,
};

contract('Testing Invoicing', function (accounts) {
  const owner = {
    public: accounts[0]
  }

  const users = [{
      hydroID: 'abc',
      address: accounts[1],
      recoveryAddress: accounts[1],
      private: '0x6bf410ff825d07346c110c5836b33ec76e7d1ee051283937392180b732aa3aff'
    }, {
      hydroID: 'def',
      address: accounts[2],
      recoveryAddress: accounts[2],
      private: '0xccc3c84f02b038a5d60d93977ab11eb57005f368b5f62dad29486edeb4566954'
    },
  ];

  it('common contracts deployed', async () => {
    instances = await common.initialize(owner.public, [])
  })

  it('Identity can be created (merchant)', async function () {
    merchant = users[0]
    const timestamp = Math.round(new Date() / 1000) - 1
    const permissionString = web3.utils.soliditySha3(
      '0x19', '0x00', instances.IdentityRegistry.address,
      'I authorize the creation of an Identity on my behalf.',
      merchant.recoveryAddress,
      merchant.address,
      { t: 'address[]', v: [instances.Snowflake.address] },
      { t: 'address[]', v: [] },
      timestamp
    )

    const permission = await sign(permissionString, merchant.address, merchant.private)

    await instances.Snowflake.createIdentityDelegated(
      merchant.recoveryAddress, merchant.address, [], merchant.hydroID, permission.v, permission.r, permission.s, timestamp
    )

    merchant.identity = web3.utils.toBN(1)

    await verifyIdentity(merchant.identity, instances.IdentityRegistry, {
      recoveryAddress:     merchant.recoveryAddress,
      associatedAddresses: [merchant.address],
      providers:           [instances.Snowflake.address],
      resolvers:           [instances.ClientRaindrop.address]
    })
  })

  it('can deposit HYDRO (merchant)', async () => {
    const depositAmount = web3.utils.toBN(1e18).mul(web3.utils.toBN(1000))
    await instances.HydroToken.approveAndCall(
      instances.Snowflake.address, depositAmount, web3.eth.abi.encodeParameter('uint256', merchant.identity.toString()),
      { from: accounts[0] }
    )

    const snowflakeBalance = await instances.Snowflake.deposits(merchant.identity)
    assert.isTrue(snowflakeBalance.eq(depositAmount), 'Incorrect balance')
  })

  it('Identity can be created (customer)', async function () {
    customer = users[1]
    const timestamp = Math.round(new Date() / 1000) - 1
    const permissionString = web3.utils.soliditySha3(
      '0x19', '0x00', instances.IdentityRegistry.address,
      'I authorize the creation of an Identity on my behalf.',
      customer.recoveryAddress,
      customer.address,
      { t: 'address[]', v: [instances.Snowflake.address] },
      { t: 'address[]', v: [] },
      timestamp
    )

    const permission = await sign(permissionString, customer.address, customer.private)

    await instances.Snowflake.createIdentityDelegated(
      customer.recoveryAddress, customer.address, [], customer.hydroID, permission.v, permission.r, permission.s, timestamp
    )

    customer.identity = web3.utils.toBN(2)

    await verifyIdentity(customer.identity, instances.IdentityRegistry, {
      recoveryAddress:     customer.recoveryAddress,
      associatedAddresses: [customer.address],
      providers:           [instances.Snowflake.address],
      resolvers:           [instances.ClientRaindrop.address]
    })
  })

  it('can deposit HYDRO (customer)', async () => {
    const depositAmount = web3.utils.toBN(1e18).mul(web3.utils.toBN(1000))
    await instances.HydroToken.approveAndCall(
      instances.Snowflake.address, depositAmount, web3.eth.abi.encodeParameter('uint256', customer.identity.toString()),
      { from: accounts[0] }
    )

    const snowflakeBalance = await instances.Snowflake.deposits(customer.identity)
    assert.isTrue(snowflakeBalance.eq(depositAmount), 'Incorrect balance')
  })

  describe('Checking Resolver Functionality', async () => {
    it('deploy Invoicing', async () => {
      instances.Invoicing = await Invoicing.new(instances.Snowflake.address)
    });

    it('Should add Invoicing as a new resolver', async () => {
      const allowance = web3.utils.toWei('1000');

      await instances.Snowflake.addResolver(
        instances.Invoicing.address, true, allowance, '0x00', {
          from: merchant.address,
        },
      );
    });

    it('Should add Invoicing as a new resolver (customer)', async () => {
      const allowance = web3.utils.toWei('1000');

      await instances.Snowflake.addResolver(
        instances.Invoicing.address, true, allowance, '0x00', {
          from: customer.address,
        },
      );
    });

    it('Should get the ein of the merchant', () => instances.IdentityRegistry.getEIN(merchant.address)
      .then((res) => {
        merchantEin = res;
      }));

    it('Should get the ein of the customer', () => instances.IdentityRegistry.getEIN(customer.address)
      .then((res) => {
        customerEin = res;
      }));

    it('Should get the deposit of merchant', () => instances.Snowflake.deposits(merchantEin)
      .then((deposit) => {
        assert.equal(deposit.toString(), web3.utils.toWei('1000'), 'Merchant deposit is wrong');
      }));

    it('Should get the deposit of customer', () => instances.Snowflake.deposits(customerEin)
      .then((deposit) => {
        assert.equal(deposit.toString(), web3.utils.toWei('1000'), 'Customer deposit is wrong');
      }));

    it('Should create a draft invoice', () => instances.Invoicing.createDraftInvoice(
      invoice.customers,
      invoice.amount,
      invoice.allowPartialPayment,
      invoice.minimumAmountDue,
      invoice.paymentTerm,
      invoice.term, {
        from: merchant.address,
      },
    ));

    it('Should get the invoices created by the merchant', () => instances.Invoicing.getInvoicesFromMerchant(merchantEin)
      .then((invoices) => {
        assert.equal(invoices.length, 1, "Invoices total is wrong");
      }));

    it('Should get the info of invoice 0', () => instances.Invoicing.getInvoiceInfo(0)
      .then((info) => {
        assert.containsAllKeys(info, ['status', 'date', 'merchant', 'customers'], 'Invoice info is wrong');
        assert.equal(info.status.toNumber(), Status.Draft, 'Info status is wrong');
        assert.isString(info.date.toString(), 'Info date is wrong');
        assert.equal(info.merchant.toString(), merchantEin.toString(), 'Info merchant is wrong');
        assert.equal(info.customers[0].toString(), '5', 'Info customers is wrong');
        assert.equal(info.customers[1].toString(), '6', 'Info customers is wrong');
      }));

    it('Should get the details of invoice 0', () => instances.Invoicing.getInvoiceDetails(0)
      .then((details) => {
        assert.containsAllKeys(details, ['amount', 'paidAmount', 'refundedAmount', 'allowPartialPayment', 'minimumAmountDue', 'paymentTerm', 'term'], 'Invoice details are wrong');
        assert.equal(details.amount.toString(), invoice.amount.toString(), 'Invoice amount is wrong');
        assert.equal(details.paidAmount.toString(), '0', 'Invoice paid amount is wrong');
        assert.equal(details.refundedAmount.toString(), '0', 'Invoice refunded amount is wrong');
        assert.equal(details.allowPartialPayment, invoice.allowPartialPayment, 'Invoice partial payment allowance is wrong');
        assert.equal(details.minimumAmountDue.toString(), invoice.minimumAmountDue.toString(), 'Invoice minimum amount due is wrong');
        assert.equal(details.paymentTerm.toString(), invoice.paymentTerm.toString(), 'Invoice payment term is wrong');
        assert.equal(details.term.toString(), invoice.term.toString(), 'Invoice term is wrong');
      }));

    it('Should get the additional details of invoice 0', () => instances.Invoicing.getInvoicesAdditionalDetails(0)
      .then((additionalDetails) => {
        assert.containsAllKeys(additionalDetails, ['additionalTerms', 'note'], 'Invoice additional details are wrong');
        assert.equal(additionalDetails.additionalTerms, '', 'Invoice additional terms are wrong');
        assert.equal(additionalDetails.note, '', 'Invoice note is wrong');
      }));

    it('Should update the customers of invoice 0', () => instances.Invoicing.updateInvoiceCustomers(
      0,
      [2], {
        from: merchant.address,
      },
    ));

    it('Should update the payment data of invoice 0', () => instances.Invoicing.updateInvoicePayment(
      0,
      web3.utils.toWei('1000'),
      true,
      web3.utils.toWei('100'),
      3,
      90,
      'Pay asap',
      'Hello', {
        from: merchant.address,
      },
    ));

    it('Should get the updated info of invoice 0', () => instances.Invoicing.getInvoiceInfo(0)
      .then((info) => {
        assert.equal(info.customers[0].toString(), '2', 'Info customers is wrong');
      }));

    it('Should get the updated details of invoice 0', () => instances.Invoicing.getInvoiceDetails(0)
      .then((details) => {
        assert.equal(details.amount.toString(), web3.utils.toWei('1000'), 'Invoice amount is wrong');
        assert.equal(details.allowPartialPayment, true, 'Invoice partial payment allowance is wrong');
        assert.equal(details.minimumAmountDue.toString(), web3.utils.toWei('100'), 'Invoice minimum amount due is wrong');
        assert.equal(details.paymentTerm.toString(), '3', 'Invoice payment term is wrong');
        assert.equal(details.term.toString(), '90', 'Invoice term is wrong');
      }));

    it('Should get the additional details of invoice 0', () => instances.Invoicing.getInvoicesAdditionalDetails(0)
      .then((additionalDetails) => {
        assert.equal(additionalDetails.additionalTerms, 'Pay asap', 'Invoice additional terms are wrong');
        assert.equal(additionalDetails.note, 'Hello', 'Invoice note is wrong');
      }));

    it('Should validate invoice 0', () => instances.Invoicing.validateInvoice(0, {
      from: merchant.address,
    }));

    it('Should get the updated info of invoice 0', () => instances.Invoicing.getInvoiceInfo(0)
      .then((info) => {
        assert.equal(info.status.toNumber(), Status.Unpaid, 'Info status is wrong');
      }));

    it('Should pay a part of invoice 0', () => instances.Invoicing.payInvoice(
      0,
      web3.utils.toWei('100'), {
      from: customer.address,
    }));

    it('Should get the new status of invoice 0', () => instances.Invoicing.getInvoiceInfo(0)
      .then((info) => {
        assert.equal(info.status.toNumber(), Status.PartiallyPaid, 'Info status is wrong');
      }));

    it('Should get the new details of invoice 0', () => instances.Invoicing.getInvoiceDetails(0)
      .then((details) => {
        assert.equal(details.paidAmount.toString(), web3.utils.toWei('100'), 'Invoice paid amount is wrong');
      }));

    it('Should pay the rest of invoice 0', () => instances.Invoicing.payInvoice(
      0,
      web3.utils.toWei('900'), {
      from: customer.address,
    }));

    it('Should get the new status of invoice 0', () => instances.Invoicing.getInvoiceInfo(0)
      .then((info) => {
        assert.equal(info.status.toNumber(), Status.Paid, 'Info status is wrong');
      }));

    it('Should get the new details of invoice 0', () => instances.Invoicing.getInvoiceDetails(0)
      .then((details) => {
        assert.equal(details.paidAmount.toString(), web3.utils.toWei('1000'), 'Invoice paid amount is wrong');
      }));

    it('Should get the deposit of merchant', () => instances.Snowflake.deposits(merchantEin)
      .then((deposit) => {
        assert.equal(deposit.toString(), web3.utils.toWei('2000'), 'Merchant deposit is wrong');
      }));

    it('Should get the deposit of customer', () => instances.Snowflake.deposits(customerEin)
      .then((deposit) => {
        assert.equal(deposit.toString(), web3.utils.toWei('0'), 'Merchant deposit is wrong');
      }));

    it('Should refund a part of the amount to the customer', () => instances.Invoicing.refundCustomer(
      0,
      customerEin,
      web3.utils.toWei('100'), {
        from: merchant.address,
      },
    ));

    it('Should get the new status of invoice 0', () => instances.Invoicing.getInvoiceInfo(0)
      .then((info) => {
        assert.equal(info.status.toNumber(), Status.PartiallyRefunded, 'Info status is wrong');
      }));

    it('Should get the new details of invoice 0', () => instances.Invoicing.getInvoiceDetails(0)
      .then((details) => {
        assert.equal(details.refundedAmount.toString(), web3.utils.toWei('100'), 'Invoice refunded amount is wrong');
      }));

    it('Should refund the rest of the amount to the customer', () => instances.Invoicing.refundCustomer(
      0,
      customerEin,
      web3.utils.toWei('900'), {
        from: merchant.address,
      },
    ));

    it('Should get the new status of invoice 0', () => instances.Invoicing.getInvoiceInfo(0)
      .then((info) => {
        assert.equal(info.status.toNumber(), Status.Refunded, 'Info status is wrong');
      }));

    it('Should get the new details of invoice 0', () => instances.Invoicing.getInvoiceDetails(0)
      .then((details) => {
        assert.equal(details.refundedAmount.toString(), web3.utils.toWei('1000'), 'Invoice refunded amount is wrong');
      }));
  })
})
