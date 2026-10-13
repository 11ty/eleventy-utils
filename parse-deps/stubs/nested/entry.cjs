const a = require("./a.cjs");
if(process.env.DEV) {
	require("./b.cjs");
}
module.exports = {
	c: require("./c.cjs"),
	later() {
		return require("./lazy-method.cjs");
	},
};
function lazy() {
	require("./lazy-function.cjs");
}
const arrow = () => import("./lazy-arrow.mjs");
