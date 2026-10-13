function lazy() {
	return require("../simple2");
}
require("../parent/parent");
require("./data.json");
require("node:path");
require("fs");
