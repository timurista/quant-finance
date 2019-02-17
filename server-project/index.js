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
    this.lastAction = `BUY ${key} at ${item.rates[0]}`;
    return 0;
  }

  sell(item) {
    let total = item.rates[0] - item.startVal;
    item.startVal = item.rates[0];
    this.lastAction = `SELL ${key} at ${item.rates[0]} for ${total}`;
    return total;
  }

  changeRandom(price) {
    return (
      parseFloat(price) +
      Math.floor(Math.random() * 10 + 100) / 1000
    ).toFixed(5);
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
      while (count--) {
        const res = await axios.get(url, {
          params: { instruments: pairs },
          headers: { Authorization }
        });

        let rates = res.data.prices.map(r => ({
          time: r.time,
          asks: r.asks,
          bids: r.bids,
          name: r.instrument
        }));

        console.clear();
        for (let r of rates) {
          console.log(
            `${r.name}, last ask: ${this.changeRandom(
              r.asks[0].price
            )}, last bid: ${this.changeRandom(r.bids[0].price)}`
          );
        }
        console.log("Balance", balance);
        // console.time("refreshing");
        await sleep(20);
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

  async legacy() {
    try {
      let count = 1000;
      var url =
        "https://www.freeforexapi.com/api/live?pairs=" +
        supportedPairs.slice(0, 3).join(",");
      let rates = {};
      let PIPS = 1000000;
      let total = 0;

      while (count--) {
        let res = await axios.get(url);

        console.clear();
        console.log(`LAST ACTION: ${this.lastAction}`);
        for (let key in res.data.rates) {
          let val = res.data.rates[key];
          let diff = 0;

          if (rates[key])
            diff = Math.abs(val.rate - rates[key].rates[0]) * PIPS;
          console.log(
            `GOT VAL: ${key} = ${val.rate}, PIP DIFF: ${Math.floor(diff)}`
          );
          let shouldBuy = 0;
          let shouldSell = 0;

          if (rates[key]) {
            let currentRate = rates[key];
            currentRate.rates.unshift(val.rate);

            if (currentRate.rates[0] > currentRate.rates[1] + 0.001) {
              shouldSell++;
              if (shouldSell > 0) {
                total += this.sell(currentRate, key);
                shouldSell = 0;
              }
            } else if (currentRate.rates[0] < currentRate.rates[1] - 0.001) {
              shouldBuy++;
              if (shouldBuy > 0) {
                total += this.buy(currentRate, key);
                shouldBuy = 0;
              }
            }

            let avg =
              currentRate.rates.reduce((a, b) => a + b) /
              currentRate.rates.length;
            if (avg > currentRate.avg) {
              currentRate.increase.unshift(
                Math.floor(Math.abs(avg - currentRate.avg) * PIPS)
              );
              rates[key].decrease = [];
              if (currentRate.increase.length > 3) {
                currentRate.increase.pop();
              }
            } else if (avg < currentRate.avg - 0.001) {
              rates[key].increase = [];
              currentRate.decrease.unshift(
                Math.floor(Math.abs(avg - currentRate.avg) * PIPS)
              );

              if (currentRate.decrease.length > 10) {
                currentRate.decrease.pop();
              }
            } else {
              currentRate.increase = [];
              currentRate.decrease = [];
            }
            currentRate.avg = avg;
            if (rates[key].rates.length > 10) {
              rates[key].rates.pop();
            }
          } else {
            rates[key] = {
              avg: val.rate,
              rates: [val.rate],
              increase: [],
              decrease: [],
              startVal: val.rate
            };
            // kick off initial buy
            total += this.buy(rates[key], key);
          }
        }

        for (let key of Object.keys(rates)) {
          let val = rates[key];
          console.log(
            `${key}: avg: ${val.avg.toFixed(6)}, increase: ${val.increase
              .slice(0, 5)
              .join(", ")}, decrease: ${val.decrease.slice(0, 5).join(", ")}`
          );
          console.log(
            `   pip: ${val.rates
              .slice(0, 3)
              .map(m => (m % 1).toFixed(6))
              .join(", ")}`
          );
          if (val.rates[10])
            console.log(
              `   diff pip: ${val.rates[0] * 1000000 - val.rates[4] * 1000000}`
            );
        }
        console.log(
          `count: ${count}, total: ${total}, money spent: ${this.moneySpent}`
        );
        // await sleep(100);
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
