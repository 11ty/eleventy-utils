type prop = "Value3d" | undefined;

interface IndexData {
  prop: prop;
};

export default class {
  data() : IndexData {
    return {
      prop: "Value3d"
    };
  }

  render(data: IndexData) {
    return data.prop;
  }
}