import { label } from "./label.ts";
import Child from "./child.tsx";

export default function Component(): JSX.Element {
	return <div><Child />{label}</div>;
}
