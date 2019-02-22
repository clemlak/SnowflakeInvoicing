const common = require('./common.js')
const { sign, verifyIdentity } = require('./utilities')

const Invoicing = artifacts.require('./resolvers/Invoicing.sol')

let instances
let user
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
    })
  })
})
