const common = require('./common.js')
const { sign, verifyIdentity } = require('./utilities')

const Invoicing = artifacts.require('./resolvers/Invoicing.sol')

let instances
let user
let ein;

const invoice = {
  customers: [1, 2],
  amount: 1000,
  allowPartialPayment: true,
  minimumAmountDue: 10,
  paymentTerm: 0,
  term: 0,
};

const invoiceInfo = {
  status: 0,
  date: 0,
  merchant: 0,
  customers: [],
};

const invoiceDetails = {
  amount: 0,
  paidAmount: 0,
  refundedAmount: 0,
  allowPartialPayment: false,
  minimumAmountDue: 0,
  paymentTerm: 0,
  term: 0,
};

const invoiceAdditionalDetails = {
  additionalTerms: '',
  note: '',
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

    it('Should get the invoices create by the user', () => instances.Invoicing.getInvoicesFromMerchant(ein)
      .then((invoices) => {
        assert.equal(invoices.length, 1, "Invoices total is wrong");
      }));

    it('Should get the info of the invoice', () => instances.Invoicing.getInvoiceInfo(0)
      .then((info) => {
        assert.containsAllKeys(info, invoiceInfo, 'Invoice info is wrong');
      }));

    it('Should get the details of the invoice', () => instances.Invoicing.getInvoiceDetails(0)
      .then((details) => {
        assert.containsAllKeys(details, invoiceDetails, 'Invoice details are wrong');
      }));

    it('Should get the additional details of the invoice', () => instances.Invoicing.getInvoicesAdditionalDetails(0)
      .then((additionalDetails) => {
        assert.containsAllKeys(additionalDetails, invoiceAdditionalDetails, 'Invoice additional details are wrong');
      }));
  })
})
