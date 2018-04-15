export var flatFormat = function() {

  function splitLine(line) { //, with_id
    return line.split('\t');
  }

  return {
    splitLine: splitLine,
    secondary_separator: '\t'
  };
}();
