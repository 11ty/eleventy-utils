export function walk(tree, cb) {
	return traverse(tree, cb);
}

export function match(tree, expression, cb) {
	let expressions = Array.isArray(expression) ? expression : [expression];
	return traverse(tree, (node) => {
		for (let exp of expressions) {
			if (compare(exp, node)) return cb(node);
		}
		return node;
	});
}

function traverse(tree, cb) {
	if (Array.isArray(tree)) {
		for (let i = 0; i < tree.length; i++) {
			tree[i] = traverse(cb(tree[i]), cb);
		}
	} else if (tree && typeof tree === "object" && Object.hasOwn(tree, "content")) {
		traverse(tree.content, cb);
	}

	return tree;
}

function compare(expected, actual) {
	if (expected instanceof RegExp) {
		if (typeof actual === "object") return false;
		if (typeof actual === "string") return expected.test(actual);
	}

	if (typeof expected !== typeof actual) return false;
	if (typeof expected !== "object" || expected === null) {
		return expected === actual;
	}

	if (Array.isArray(expected)) {
		return expected.every((exp) => Array.prototype.some.call(actual, (act) => compare(exp, act)));
	}

	return Object.keys(expected).every((key) => {
		let ao = actual[key];
		let eo = expected[key];

		if (typeof eo === "object" && eo !== null && ao !== null) {
			return compare(eo, ao);
		}
		if (typeof eo === "boolean") {
			return eo !== (ao == null);
		}

		return ao === eo;
	});
}
