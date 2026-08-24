const vm = require('vm');
const safeEval = () => { return 'executed' };
const safeEvalWrapper = function(val) { return safeEval(val) };
Object.setPrototypeOf(safeEvalWrapper, null);
Object.setPrototypeOf(safeEvalWrapper.prototype, null);

const sandbox = Object.create(null);
sandbox.safeEval = safeEvalWrapper;
sandbox.orderLinesData = 'safeEval.constructor("return process")()';
vm.createContext(sandbox);

try {
  let res = vm.runInContext('safeEval.constructor("return process")()', sandbox);
  console.log('Result1:', res);
} catch(e) { console.log('Err1:', e.message) }

try {
  let res = vm.runInContext('safeEval.prototype.constructor.constructor("return process")()', sandbox);
  console.log('Result2:', res);
} catch(e) { console.log('Err2:', e.message) }
