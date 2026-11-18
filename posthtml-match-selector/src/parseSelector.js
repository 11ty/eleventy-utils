const IDENT = /^(?:[\w-]|[^\x00-\x7F]|\\[^\n0-9a-fA-F])+/;
const TAG = /^[a-zA-Z][\w-]*/;
const ATTR_NAME = /^[^\s"'~|^$*!=\]\[]+/;
// Unquoted values are lenient (like posthtml-match-helper) so `[data-x=a.b]` works.
const UNQUOTED_VALUE = /^(?:[^\s"'\]\\]|\\.)+/;
const OPERATORS = ["~=", "|=", "^=", "$=", "*=", "!=", "="];

const WHITESPACE = /\s+/;

function unescapeIdent(str) {
  return str.replace(/\\(.)/g, "$1");
}

// posthtml only calls `.test()` on `instanceof RegExp` matchers, so this subclass swaps in string comparisons.
class AttrMatcher extends RegExp {
  #test;

  constructor(test) {
    super();
    this.#test = test;
  }

  test(value) {
    return this.#test(String(value));
  }

  // The underlying empty pattern matches everything, so block use as a real RegExp (`String#match`, `replace`, `split`, etc.).
  exec() {
    throw new Error("posthtml-match-selector matchers only support `test()`.");
  }
}

function tokens(value) {
  return value.split(WHITESPACE);
}

function attrMatcher(v, operator) {
  switch(operator) {
    case "~=": return new AttrMatcher(value => tokens(value).includes(v));
    case "|=": return new AttrMatcher(value => value === v || value.startsWith(`${v}-`));
    case "^=": return new AttrMatcher(value => value.startsWith(v));
    case "$=": return new AttrMatcher(value => value.endsWith(v));
    case "*=": return new AttrMatcher(value => value.includes(v));
    // Matches values that do not contain `v`, same as posthtml-match-helper.
    case "!=": return new AttrMatcher(value => !value.includes(v));
  }
}

function classMatcher(classes) {
  return new AttrMatcher(value => {
    let list = new Set(tokens(value));
    return classes.every(c => list.has(c));
  });
}

class Parser {
  constructor(selector) {
    this.selector = selector;
    this.rest = selector;
  }

  fail(reason) {
    let at = this.rest ? ` at "${this.rest}"` : "";
    throw new Error(`Unsupported selector "${this.selector}": ${reason}${at}.`);
  }

  skipWhitespace() {
    this.rest = this.rest.trimStart();
  }

  consume(regex) {
    let match = this.rest.match(regex);
    if(match) {
      this.rest = this.rest.slice(match[0].length);
      return match[0];
    }
  }

  ident(label) {
    let ident = this.consume(IDENT);
    if(!ident) {
      this.fail(`expected ${label}`);
    }
    return unescapeIdent(ident);
  }

  unquoted() {
    let value = this.consume(UNQUOTED_VALUE);
    if(!value) {
      this.fail("expected attribute value");
    }
    return unescapeIdent(value);
  }

  quoted() {
    let quote = this.rest[0];
    let end = 1;
    while(end < this.rest.length && this.rest[end] !== quote) {
      end += this.rest[end] === "\\" ? 2 : 1;
    }
    if(end >= this.rest.length) {
      this.fail("unterminated string");
    }
    let value = this.rest.slice(1, end);
    this.rest = this.rest.slice(end + 1);
    return unescapeIdent(value);
  }

  attribute(attrs) {
    this.rest = this.rest.slice(1);
    this.skipWhitespace();
    let name = this.consume(ATTR_NAME);
    if(!name) {
      this.fail("expected attribute name");
    }
    this.skipWhitespace();

    let value = true;
    let operator = OPERATORS.find(op => this.rest.startsWith(op));
    if(operator) {
      this.rest = this.rest.slice(operator.length);
      this.skipWhitespace();
      let raw = this.rest[0] === `"` || this.rest[0] === `'` ? this.quoted() : this.unquoted();
      value = operator === "=" ? raw : attrMatcher(raw, operator);
      this.skipWhitespace();
    }

    if(this.rest[0] !== "]") {
      this.fail("expected `]`");
    }
    this.rest = this.rest.slice(1);
    this.setAttr(attrs, name, value);
  }

  setAttr(attrs, name, value) {
    if(name in attrs) {
      this.fail(`more than one condition on attribute \`${name}\``);
    }
    attrs[name] = value;
  }

  // Parses one comma-free compound selector, leaving `rest` at the next comma or end.
  compound() {
    this.skipWhitespace();
    let matcher = {};
    let attrs = {};
    let classes = [];

    let tag = this.consume(TAG);
    if(tag) {
      matcher.tag = tag;
    }

    while(this.rest && this.rest[0] !== ",") {
      let char = this.rest[0];
      if(char === "#") {
        this.rest = this.rest.slice(1);
        this.setAttr(attrs, "id", this.ident("id"));
      } else if(char === ".") {
        this.rest = this.rest.slice(1);
        classes.push(this.ident("class name"));
      } else if(char === "[") {
        this.attribute(attrs);
      } else if(/\s/.test(char) && /^\s*(?:,|$)/.test(this.rest)) {
        this.skipWhitespace();
      } else {
        this.fail(char === "*" ? "`*` is not supported" : "only tag, #id, .class and [attr] are supported (no combinators or pseudo-classes)");
      }
    }

    if(classes.length > 0) {
      this.setAttr(attrs, "class", classMatcher(classes));
    }
    if(Object.keys(attrs).length > 0) {
      matcher.attrs = attrs;
    }
    if(Object.keys(matcher).length === 0) {
      this.fail("empty selector");
    }
    return matcher;
  }

  parse() {
    let matchers = [this.compound()];
    while(this.rest[0] === ",") {
      this.rest = this.rest.slice(1);
      matchers.push(this.compound());
    }
    return matchers;
  }
}

module.exports = function parseSelector(selector) {
  return new Parser(selector).parse();
};
