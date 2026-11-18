const parseSelector = require("./src/parseSelector.js");

// Drop-in for the default export of `posthtml-match-helper`.
module.exports = function matchSelector(matcher) {
  if(typeof matcher === "string") {
    let matchers = parseSelector(matcher);
    return matchers.length === 1 ? matchers[0] : matchers;
  }
  if(Array.isArray(matcher)) {
    return matcher.flatMap(entry => typeof entry === "string" ? parseSelector(entry) : [entry]);
  }
  return matcher;
};
