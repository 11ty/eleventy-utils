import { test as it } from "node:test";
import assert from "node:assert/strict";
import {DEFAULT_OPTIONS} from "../lib/defaultOptions.js";
import plugin from "../lib/index.js";
import posthtml from "@11ty/posthtml";

import tags, { voidHtmlTags as voidTags } from "html-tags";

const { filter } = DEFAULT_OPTIONS;

const fixturesWithAttributes = Object.entries(filter).reduce((result, [tagName, attrs]) =>
{
	Object.keys(attrs).forEach(attrName =>
	{
		if (tagName === "*")
		{
			result.push(...tags.map(_tagName =>
			({
				attrName,
				isVoid: voidTags.includes(_tagName),
				tagName: _tagName
			})));
		}
		else
		{
			result.push(
			{
				attrName,
				isVoid: voidTags.includes(tagName),
				tagName
			});
		}
	});

	return result;
}, []);



const filteredFixturesWithAttributes = fixturesWithAttributes.filter(({attrName}) =>
{
	if (attrName==="content" || attrName==="ping" || attrName==="srcset")
	{
		// Specific tests instead
		return false;
	}
	else
	{
		return true;
	}
});



const fixturesWithoutAttributes = tags.map(tagName =>
({
	isVoid: voidTags.includes(tagName),
	tagName
}));



const wrapper = (input, options) => posthtml().use( plugin(options) ).process(input).then(({html}) => html);



fixturesWithoutAttributes.forEach(({isVoid, tagName}) => it(`supports <${tagName}>`, () =>
{
	let input = `<${tagName}>`;

	if (!isVoid)
	{
		input = `${input}</${tagName}>`;
	}

	const options =
	{
		eachURL: () => {}
	};

	return wrapper(input, options).then(result => assert.equal(result, input));
}));



fixturesWithAttributes.forEach(({attrName, isVoid, tagName}) =>
{
	const isMetaRefresh = tagName==="meta" && attrName==="content";
	const attrs = isMetaRefresh ? `http-equiv="refresh" ${attrName}=""` : `${attrName}=""`;

	it(`supports <${tagName} ${attrs}>`, () =>
	{
		let input = `<${tagName} ${attrs}>`;

		if (!isVoid)
		{
			input = `${input}</${tagName}>`;
		}

		const options =
		{
			eachURL: url => url
		};

		return wrapper(input, options).then(result => assert.equal(result, input));
	});
});



filteredFixturesWithAttributes.forEach(({attrName, isVoid, tagName}) => it(`supports <${tagName} ${attrName}="…">`, () =>
{
	let input  = `<${tagName} class="ignored" ${attrName}="resource.html">`;
	let output = `<${tagName} class="ignored" ${attrName}="http://domain.com/resource.html">`;

	if (!isVoid)
	{
		input  = `${input}</${tagName}>`;
		output = `${output}</${tagName}>`;
	}

	const options =
	{
		eachURL: (url, attribute, element) =>
		{
			assert.equal(attribute, attrName);
			assert.equal(element, tagName);

			return `http://domain.com/${url}`;
		}
	};

	return wrapper(input, options).then(result => assert.equal(result, output));
}));



["a", "area"].forEach(tagName => it(`supports <${tagName} ping="…">`, () =>
{
	let input  = `<${tagName} ping="ping1.html, ping2.html">`;
	let output = `<${tagName} ping="http://domain.com/ping1.html, http://domain.com/ping2.html">`;

	if (tagName === "a")
	{
		input  = `${input}text</${tagName}>`;
		output = `${output}text</${tagName}>`;
	}

	const options =
	{
		eachURL: (url, attribute, element) =>
		{
			assert.equal(attribute, "ping");
			assert.equal(element, tagName);

			return `http://domain.com/${url}`;
		}
	};

	return wrapper(input, options).then(result => assert.equal(result, output));
}));



["img", "source"].forEach(tagName => it(`supports <${tagName} src srcset="…">`, () =>
{
	const input  = `<${tagName} src="image1.png" srcset="image1a.png 2x, image1b.png 100w, image1c.png">`;
	const output = `<${tagName} src="http://domain.com/image1.png" srcset="http://domain.com/image1a.png 2x, http://domain.com/image1b.png 100w, http://domain.com/image1c.png">`;

	const options =
	{
		eachURL: (url, attribute, element) =>
		{
			assert.ok(["src", "srcset"].includes(attribute));
			assert.equal(element, tagName);

			return `http://domain.com/${url}`;
		}
	};

	return wrapper(input, options).then(result => assert.equal(result, output));
}));



it(`supports <meta http-equiv="refresh" content="…">`, () =>
{
	const input  = `<meta name="viewport" content="width=device-width"> <meta http-equiv="refresh" content="5; url=redirect.html">`;
	const output = `<meta name="viewport" content="width=device-width"> <meta http-equiv="refresh" content="5; url=http://domain.com/redirect.html">`;

	const options =
	{
		eachURL: (url, attribute, element) =>
		{
			assert.equal(attribute, "content");
			assert.equal(element, "meta");

			return `http://domain.com/${url}`;
		}
	};

	return wrapper(input, options).then(result => assert.equal(result, output));
});



it(`supports <meta http-equiv="refresh" content="…"> with no URL`, () =>
{
	const input  = `<meta name="viewport" content="width=device-width"> <meta http-equiv="refresh" content="5">`;
	const output = `<meta name="viewport" content="width=device-width"> <meta http-equiv="refresh" content="5; url=">`;

	const options =
	{
		eachURL: (url, attribute, element) =>
		{
			assert.equal(attribute, "content");
			assert.equal(element, "meta");

			return url === "" ? url : `http://domain.com/${url}`;
		}
	};

	return wrapper(input, options).then(result => assert.equal(result, output));
});



it("must have eachURL option defined", () =>
{
	const handleError = error =>
	{
		assert.ok(error instanceof TypeError);
		errorsThrown++;
	};

	const input = `<a href="link.html">text</a>`;
	let errorsThrown = 0;

	try
	{
		wrapper(input, {});
	}
	catch (error)
	{
		handleError(error);
	}

	try
	{
		wrapper(input);
	}
	catch (error)
	{
		handleError(error);
	}

	assert.equal(errorsThrown, 2);
});
