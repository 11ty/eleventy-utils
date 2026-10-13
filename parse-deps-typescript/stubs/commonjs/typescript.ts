require("./simple2.js");
require("./empty.ts");

type prop = "Value3d" | undefined;

interface IndexData {
  prop: prop;
};

module.exports = class {
  data() : IndexData {
    return {
      prop: "Value3d"
    };
  }

  render(data: IndexData) {
    return data.prop;
  }
}