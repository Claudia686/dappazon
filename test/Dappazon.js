const {
  expect
} = require("chai")

const tokens = (n) => {
  return ethers.utils.parseUnits(n.toString(), 'ether')
}

const ID = 1
const NAME = "Shoes"
const CATEGORY = "Clothing"
const IMAGE = "https://ipfs.io/ipfs/QmTYEboq8raiBs7GTUg2yLXB3PMz6HuBNgNfSZBx5Msztg/shoes.jpg"
const COST = tokens(1)
const RATING = 4
const STOCK = 5

describe("Dappazon", () => {
  let dappazon
  let deployer, buyer, hacker

  beforeEach(async () => {
    [deployer, buyer, hacker] = await ethers.getSigners()

    const Dappazon = await ethers.getContractFactory("Dappazon")
    dappazon = await Dappazon.deploy()
  })

  describe("Deployment", () => {
    it("Sets the owner", async () => {
      expect(await dappazon.owner()).to.equal(deployer.address)
    })
  })

  describe("Listing", () => {
    describe("Success", async () => {
      let transaction

      beforeEach(async () => {
        transaction = await dappazon.connect(deployer).list(ID, NAME, CATEGORY, IMAGE, COST, RATING, STOCK)
        await transaction.wait()
      })

      it("Returns item attributes", async () => {
        const item = await dappazon.items(ID)

        expect(item.id).to.equal(ID)
        expect(item.name).to.equal(NAME)
        expect(item.category).to.equal(CATEGORY)
        expect(item.image).to.equal(IMAGE)
        expect(item.cost).to.equal(COST)
        expect(item.rating).to.equal(RATING)
        expect(item.stock).to.equal(STOCK)
      })

      it("Emits List event", () => {
        expect(transaction).to.emit(dappazon, "List")
      })
    })

    describe("Failure", async () => {
      it("Reverts non-owner fron listing", async () => {
        await expect(dappazon.connect(hacker).list(ID, NAME, CATEGORY, IMAGE, COST, RATING, STOCK)).to.be.reverted
      })
    })
  })
  
  describe("Buying", () => {
    describe("Success", async () => {
      let transaction

      beforeEach(async () => {
        transaction = await dappazon.connect(deployer).list(ID, NAME, CATEGORY, IMAGE, COST, RATING, STOCK)
        await transaction.wait()

        transaction = await dappazon.connect(buyer).buy(ID, {
          value: COST
        })
        await transaction.wait()
      })

      it("Updates buyer's order count", async () => {
        const result = await dappazon.orderCount(buyer.address)
        expect(result).to.equal(1)
      })

      it("Adds the order", async () => {
        const order = await dappazon.orders(buyer.address, 1)

        expect(order.time).to.be.greaterThan(0)
        expect(order.item.name).to.equal(NAME)
      })

      it("Updates the contract balance", async () => {
        const result = await ethers.provider.getBalance(dappazon.address)
        expect(result).to.equal(COST)
      })

      it("Emits Buy event", () => {
        expect(transaction).to.emit(dappazon, "Buy")
      })
    })
    describe("Failure", async () => {
      it('Should fail if buyer sends insufficient funds', async () => {
        const itemId = 1
        const item = dappazon.items(itemId)

        const insufficientFunds = item.cost - 1
        await expect(dappazon.connect(buyer).buy(itemId, {
          value: insufficientFunds
        })).to.be.reverted
      })
       it('Should fail if item is out of stock', async () => {
        const itemId = 2
        const stockId = 0
        await expect(dappazon.connect(buyer).buy(itemId, {
          value: stockId
        })).to.be.reverted
      })
    })
  })

  describe("Withdrawing", () => {
    describe("Success", async () => {
      let balanceBefore

      beforeEach(async () => {
        let transaction = await dappazon.connect(deployer).list(ID, NAME, CATEGORY, IMAGE, COST, RATING, STOCK)
        await transaction.wait()

        transaction = await dappazon.connect(buyer).buy(ID, {
          value: COST
        })
        await transaction.wait()

        balanceBefore = await ethers.provider.getBalance(deployer.address)

        transaction = await dappazon.connect(deployer).withdraw()
        await transaction.wait()
      })

      it('Updates the owner balance', async () => {
        const balanceAfter = await ethers.provider.getBalance(deployer.address)
        expect(balanceAfter).to.be.greaterThan(balanceBefore)
      })

      it('Updates the contract balance', async () => {
        const result = await ethers.provider.getBalance(dappazon.address)
        expect(result).to.equal(0)
      })
    })
    describe("Failure", async () => {
      it('Rejects non-owner from Withdrawing', async () => {
        await expect(dappazon.connect(hacker).withdraw()).to.be.reverted
      })
    })
  })

})