const axios = require("axios");
const { distanceInWordsStrict } = require("date-fns");
const numbers = require("numbers");
const supportedPairs = require("./supportedPairs").supportedPairs;
const { OANDA_API_KEY, ACCOUNT_ID } = require("./.secrets/secrets");

function start() {
  let watcher = new ForexWatcher();
  watcher.main();
}

class ForexWatcher {
  constructor() {
    this.lastAction = "BUY";
    this.moneySpent = 0;
    this.margin = 100;
  }

  buy(item, key) {
    // asking price
  }

  sell(item) {
    // selling price
  }

  changeRandom(price) {
    return (
      parseFloat(price) +
      Math.floor(Math.random() * 10 + 100) / 1000
    ).toFixed(5);
  }

  figureOutBuy(name, startAsk, asks) {
    let diffChange = 0;
    if (asks.length >= 2) {
      diffChange = (startAsk.price - asks[0].price) / 0.0001;
    }
    console.log(`   ${name} ask change: ${diffChange.toFixed(2)}`);
  }

  figureOutSell(name, startBid, bids) {
    let diffChange = 0;
    if (bids.length >= 2) {
      diffChange = (startBid.price - bids[0].price) / 0.0001;
    }
    console.log(`   ${name} bid change: ${diffChange.toFixed(2)}`);
  }

  getAcceleration(items) {
    let prices = items.map(c => parseFloat(c.price));
    let mean = numbers.statistic.mean(prices);
    // console.log("PRICES", prices, mean, prices.map(c => (c - mean) / 0.0001));
    return prices.map(c => (c - mean) / 0.0001);
  }

  async main() {
    let rootUrl = "https://api-fxpractice.oanda.com";
    let url = `${rootUrl}/v3/accounts/${ACCOUNT_ID}/pricing`;
    let accountUrl = `${rootUrl}/v3/accounts/${ACCOUNT_ID}/summary`;
    let Authorization = `Bearer ${OANDA_API_KEY}`;
    let startTime = new Date();

    // try and guess here while we calc this
    const accountRes = await axios.get(accountUrl, {
      headers: { Authorization }
    });
    this.balance = accountRes.data.account.balance;

    const pairs = supportedPairs
      .slice(0, 6)
      .map(p => p.substring(0, 3) + "_" + p.substring(3))
      .join(",");
    try {
      let count = 1000;
      let currentRates = {};
      while (count--) {
        const res = await axios.get(url, {
          params: { instruments: pairs },
          headers: { Authorization }
        });

        let rates = res.data.prices.map(r => ({
          ...r,
          time: r.time,
          asks: r.asks.map(c => ({ ...c, c: c.price })),
          bids: r.bids.map(c => ({ ...c, c: c.price })),
          name: r.instrument
        }));
        console.clear();
        for (let r of rates) {
          if (currentRates[r.name]) {
            let rate = currentRates[r.name];
            rate.asks.unshift(r.asks[0]);
            rate.bids.unshift(r.bids[0]);

            if (rate.asks.length > 5) {
              rate.asks.pop();
            }
            if (rate.bids.length > 5) {
              rate.bids.pop();
            }

            rate.askAcc = this.getAcceleration(rate.asks).map(c =>
              c.toFixed(2)
            );
            rate.bidAcc = this.getAcceleration(rate.bids).map(c =>
              c.toFixed(2)
            );
          } else {
            currentRates[r.name] = {
              name: r.name,
              asks: r.asks,
              bids: r.bids,
              startAsk: r.asks[0],
              startBid: r.bids[0]
            };
          }
        }

        for (let key of Object.keys(currentRates)) {
          const r = currentRates[key];
          console.log(
            `${r.name}, last ask: ${r.asks[0].price}, last bid: ${
              r.bids[0].price
            }`
          );
          if (r.askAcc && r.bidAcc)
            console.log(
              `  ask acc ${r.askAcc.slice(0, 3)}, bid acc ${r.bidAcc.slice(
                0,
                3
              )}`
            );

          this.figureOutBuy(r.name, r.startAsk, r.asks);
          this.figureOutSell(r.name, r.startBid, r.bids);
        }
        console.log("Balance", this.balance);
        // console.time("refreshing");
        await sleep(50);
        // console.timeEnd("refreshing");
        console.log(
          "ELAPSED TIME",
          distanceInWordsStrict(new Date(), startTime)
        );
      }
    } catch (e) {
      console.log(e);
    }
  }
}

let sleep = ms => new Promise(resolve => setTimeout(() => resolve(), ms));

module.exports = {
  start
};

start();
