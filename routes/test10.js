const vm = require('vm');
const sandbox = Object.create(null);
const safeEvalWrapper = function(data) { return 'executed'; };
Object.setPrototypeOf(safeEvalWrapper, null);
sandbox.safeEval = safeEvalWrapper;
sandbox.orderLinesData = 'safeEval.constructor("return process")()';
vm.createContext(sandbox);
try {
  let res = vm.runInContext('safeEval.constructor("return process")()', sandbox, { timeout: 2000 });
  console.log('Vulnerable?', res.version);
} catch (e) {
  console.log('Error:', e.message);
}
