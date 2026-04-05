// Player state management
class Player {
  constructor (name) {
    this.name = name
    this.isOwner = true
    this.farmKey = null
    this.visitingFarm = null
  }

  setOwner (farmKey) {
    this.isOwner = true
    this.farmKey = farmKey
    this.visitingFarm = null
  }

  setVisitor (farmKey) {
    this.isOwner = false
    this.visitingFarm = farmKey
  }

  canPlant () { return this.isOwner }
  canHarvest () { return this.isOwner }
  canRemove () { return this.isOwner }
  canWater () { return true }
  canTrade () { return true }
}
