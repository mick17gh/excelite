import {
  classifyMenuItem,
  formatPercentDecimal,
  maskCustomerName,
  maskPhone,
  prepDurationMinutes,
  wowPercent,
} from "../lib/reports/formatters";

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg);
}

assert(wowPercent(110, 100) === 10, "wowPercent");
assert(formatPercentDecimal(1, 4) === 0.25, "formatPercentDecimal");
assert(maskPhone("0244123456").includes("****"), "maskPhone");
assert(maskCustomerName("John Doe") === "John D.", "maskCustomerName");
assert(classifyMenuItem(0.5, 100, 0.3, 50) === "Star", "classifyMenuItem star");
assert(prepDurationMinutes(new Date(0), new Date(15 * 60 * 1000)) === 15, "prepDuration");

console.log("report-formatters-smoke: ok");
