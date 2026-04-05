// Item trading system - stub for M4
class TradingSystem {
  constructor (network, farmState) {
    this.network = network
    this.farmState = farmState
    this.pendingTrades = []
  }

  offerTrade (item, qty, wantItem, wantQty) {
    console.log('Trade offer - not yet implemented')
  }

  acceptTrade (tradeId) {
    console.log('Trade accept - not yet implemented')
  }

  rejectTrade (tradeId) {
    console.log('Trade reject - not yet implemented')
  }
}
