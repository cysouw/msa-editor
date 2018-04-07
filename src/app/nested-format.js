export var nestedFormat = function() {

  function splitLine(line, with_id) {
    let result = [];
    let parts = line.split('\t');
    if (with_id) {
      result.push(parts.shift());
    }
    result.push(parts.shift());
    let alignment = parts[0].split(' ');
    return result.concat(alignment);
  }

  return {
    splitLine: splitLine,
    secondary_separator : ' ',
  };
}();
