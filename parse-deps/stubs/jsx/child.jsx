const { label } = require("./label.js");

module.exports = function Child() {
	return <span>{label}</span>;
};
