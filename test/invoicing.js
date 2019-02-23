const common = require('./common.js')
const { sign, verifyIdentity } = require('./utilities')

const Invoicing = artifacts.require('./resolvers/Invoicing.sol')

let instances
let user
let ein;

const invoice = {
  customers: [2],
  amount: 1000,
  allowPartialPayment: true,
  minimumAmountDue: 10,
  paymentTerm: 0,
  term: 0,
};

contract('Testing Invoicing', function (accounts) {
  const owner = {
    public: accounts[0]
  }

  const users = [
    {
      hydroID: 'abc',
      address: accounts[1],
      recoveryAddress: accounts[1],
      private: '0x6bf410ff825d07346c110c5836b33ec76e7d1ee051283937392180b732aa3aff'
    }
  ]

  it('common contracts deployed', async () => {
    instances = await common.initialize(owner.public, [])
  })

  it('Identity can be created', async function () {
    user = users[0]
    const timestamp = Math.round(new Date() / 1000) - 1
    const permissionString = web3.utils.soliditySha3(
      '0x19', '0x00', instances.IdentityRegistry.address,
      'I authorize the creation of an Identity on my behalf.',
      user.recoveryAddress,
      user.address,
      { t: 'address[]', v: [instances.Snowflake.address] },
      { t: 'address[]', v: [] },
      timestamp
    )

    const permission = await sign(permissionString, user.address, user.private)

    await instances.Snowflake.createIdentityDelegated(
      user.recoveryAddress, user.address, [], user.hydroID, permission.v, permission.r, permission.s, timestamp
    )

    user.identity = web3.utils.toBN(1)

    await verifyIdentity(user.identity, instances.IdentityRegistry, {
      recoveryAddress:     user.recoveryAddress,
      associatedAddresses: [user.address],
      providers:           [instances.Snowflake.address],
      resolvers:           [instances.ClientRaindrop.address]
    })
  })

  it('can deposit HYDRO', async () => {
    const depositAmount = web3.utils.toBN(1e18).mul(web3.utils.toBN(2))
    await instances.HydroToken.approveAndCall(
      instances.Snowflake.address, depositAmount, web3.eth.abi.encodeParameter('uint256', user.identity.toString()),
      { from: accounts[0] }
    )

    const snowflakeBalance = await instances.Snowflake.deposits(user.identity)
    assert.isTrue(snowflakeBalance.eq(depositAmount), 'Incorrect balance')
  })

  describe('Checking Resolver Functionality', async () => {
    it('deploy Invoicing', async () => {
      instances.Invoicing = await Invoicing.new(instances.Snowflake.address)
    });

    it('Should add Invoicing as a new resolver', async () => {
      const allowance = web3.utils.toBN(1e18);

      await instances.Snowflake.addResolver(
        instances.Invoicing.address, true, allowance, '0x00', {
          from: user.address,
        },
      );
    });

    it('Should create a draft invoice', () => instances.Invoicing.createDraftInvoice(
      invoice.customers,
      invoice.amount,
      invoice.allowPartialPayment,
      invoice.minimumAmountDue,
      invoice.paymentTerm,
      invoice.term, {
        from: user.address,
      },
    ));

    it('Should get the ein of the user', () => instances.IdentityRegistry.getEIN(user.address)
      .then((res) => {
        ein = res;
      }));

    it('Should get the invoices created by the user', () => instances.Invoicing.getInvoicesFromMerchant(ein)
      .then((invoices) => {
        assert.equal(invoices.length, 1, "Invoices total is wrong");
      }));

    it('Should get the info of invoice 0', () => instances.Invoicing.getInvoiceInfo(0)
      .then((info) => {
        assert.containsAllKeys(info, ['status', 'date', 'merchant', 'customers'], 'Invoice info is wrong');
        assert.equal(info.status, 0, 'Info status is wrong');
        assert.isString(info.date.toString(), 'Info date is wrong');
        assert.equal(info.merchant.toString(), '1', 'Info merchant is wrong');
        assert.equal(info.customers[0].toString(), '2', 'Info customers is wrong');
      }));

    it('Should get the details of invoice 0', () => instances.Invoicing.getInvoiceDetails(0)
      .then((details) => {
        assert.containsAllKeys(details, ['amount', 'paidAmount', 'refundedAmount', 'allowPartialPayment', 'minimumAmountDue', 'paymentTerm', 'term'], 'Invoice details are wrong');
        assert.equal(details.amount.toString(), '1000', 'Invoice amount is wrong');
        assert.equal(details.paidAmount.toString(), '0', 'Invoice paid amount is wrong');
        assert.equal(details.refundedAmount.toString(), '0', 'Invoice refunded amount is wrong');
        assert.equal(details.allowPartialPayment, true, 'Invoice partial payment allowance is wrong');
        assert.equal(details.minimumAmountDue.toString(), '10', 'Invoice minimum amount due is wrong');
        assert.equal(details.paymentTerm.toString(), '0', 'Invoice payment term is wrong');
        assert.equal(details.term.toString(), '0', 'Invoice term is wrong');
      }));

    it('Should get the additional details of invoice 0', () => instances.Invoicing.getInvoicesAdditionalDetails(0)
      .then((additionalDetails) => {
        assert.containsAllKeys(additionalDetails, ['additionalTerms', 'note'], 'Invoice additional details are wrong');
        assert.equal(additionalDetails.additionalTerms, '', 'Invoice additional terms are wrong');
        assert.equal(additionalDetails.note, '', 'Invoice note is wrong');
      }));

    it('Should update the customers of invoice 0', () => instances.Invoicing.updateInvoiceCustomers(
      0,
      [5, 6], {
        from: user.address,
      },
    ));

    it('Should update the payment data of invoice 0', () => instances.Invoicing.updateInvoicePayment(
      0,
      1000,
      true,
      100,
      0,
      0,
      'Pay asap',
      'Hello', {
        from: user.address,
      },
    ));
  })
})
