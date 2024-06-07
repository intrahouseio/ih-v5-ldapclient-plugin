/**
 * 
 */

const util = require('util');

exports.getErrStrWoTrace = getErrStrWoTrace;

function getErrStrWoTrace(e) {
  let str = util.inspect(e);

  if (str && str.indexOf('\n')) {
    const lines = str.split('\n');
    str = '';
    for (let line of lines) {
      line = line.trim();
      if (line && line.startsWith('at')) return str;
      str += line + '\n';
    }
  }
  return str;
}