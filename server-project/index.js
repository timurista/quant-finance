const axios = require("axios");
const supportedPairs = require("./supportedPairs").supportedPairs;

async function rateFinder() {
  try {
    let count = 1000;
    var url =
      "https://www.freeforexapi.com/api/live?pairs=" +
      supportedPairs.slice(0, 4).join(",");
    let rates = {};

    while (count--) {
      let res = await axios.get(url);

      console.clear();
      for (let key in res.data.rates) {
        let val = res.data.rates[key];
        let diff = 0;

        if (rates[key])
          diff = Math.abs(val.rate - rates[key].rates[0]) * 1000000;
        console.log(
          `GOT VAL: ${key} = ${val.rate}, PIP DIFF: ${Math.floor(diff)}`
        );
        console.log();

        if (rates[key]) {
          let currentRate = rates[key];
          currentRate.rates.unshift(val.rate);
          let avg =
            currentRate.rates.reduce((a, b) => a + b) /
            currentRate.rates.length;
          if (avg > currentRate.avg) {
            currentRate.increase.unshift(
              Math.floor(Math.abs(avg - currentRate.avg) * 1000000)
            );
            rates[key].decrease = [];

            if (currentRate.increase.length > 10) {
              currentRate.increase.pop();
            }
          } else if (avg < currentRate.avg) {
            rates[key].increase = [];
            currentRate.decrease.unshift(
              Math.floor(Math.abs(avg - currentRate.avg) * 1000000)
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
            decrease: []
          };
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
      console.log("count " + count + "\n");
      // await sleep(100);
    }
  } catch (e) {
    console.log(e);
  }
}

let sleep = ms => new Promise(resolve => setTimeout(() => resolve(), ms));

module.exports = {
  rateFinder
};

rateFinder();
