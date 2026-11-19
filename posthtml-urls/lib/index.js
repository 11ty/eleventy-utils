import { DEFAULT_OPTIONS } from "./defaultOptions.js";
import { parseSrcset, stringifySrcset } from "srcset";

const CONTENT_ATTR = "content";
const PING_ATTR = "ping";
const SRCSET_ATTR = "srcset";

const EMPTY_TAG_GROUP = Object.freeze({});
const FUNCTION_TYPE = "function";
const PRETTY_DELIMITER = ", ";

const PATTERN = /^\s*(\d+)(?:\s*;(?:\s*url\s*=)?\s*(?:["']\s*(.*?)\s*['"]|(.*?)))?\s*$/i;

/**
 * Vendored from
 * https://github.com/stevenvachon/http-equiv-refresh
 */
function parseMetaRefresh(content) {
	let matched = PATTERN.exec(content);

	if (matched !== null) {
    return {
      timeout: Number.parseInt(matched[1], 10),
      url: matched[2] || matched[3] || null // first matching group
    };
	}

	return { timeout: null, url: null };
}

/**
 * Vendored from
 * https://github.com/JedWatson/list-to-array
 * The MIT License (MIT)
 * Copyright (c) 2015 Jed Watson
 */
function list2Array (str) {
	if (Array.isArray(str)) {
		return str;
	}
	if (!str || typeof str !== 'string') {
		return [];
	}
	return str.split(',').map(s => s.trim()).filter(Boolean);
}

const evaluateValue = (value, ...args) =>
{
	if (typeof value === "function")
	{
		return value(...args);
	}
	return value;
};


const plugin = options =>
{
	const {eachURL, filter} = Object.assign({}, DEFAULT_OPTIONS, options);

	if (typeof eachURL !== FUNCTION_TYPE)
	{
		throw new TypeError("eachURL option must be a function");
	}

	// const tagMatchers = Object.keys(filter).map(tagName => ({ tag: tagName }));

	// Called by PostHTML
	return tree =>
	{
		const promises = [];

		tree.walk(node =>
		// tree.match(tagMatchers, (node) =>
		{
			if (node.attrs === undefined) {
				return node;
			}

			const tagGroup = filter[node.tag] || EMPTY_TAG_GROUP;

			Object.keys(node.attrs).forEach(attrName =>
			{
				const isAcceptedTagAttr = attrName in tagGroup && evaluateValue(tagGroup[attrName], node, attrName);

				if (isAcceptedTagAttr)
				{
					switch (attrName)
					{
						case CONTENT_ATTR:
						{
							promises.push( transformMetaRefresh(node, attrName, eachURL) );
							break;
						}
						case PING_ATTR:
						{
							promises.push( transformCommaSeparated(node, attrName, eachURL) );
							break;
						}
						case SRCSET_ATTR:
						{
							promises.push( transformSrcset(node, attrName, eachURL) );
							break;
						}
						default:
						{
							promises.push( transformDefault(node, attrName, eachURL) );
						}
					}
				}
			});

			return node;
		});

		return Promise.all(promises).then(() => tree);
	};
};



const transformCommaSeparated = (node, attrName, transformer) =>
{
	const {attrs, tag} = node;
	const urls = list2Array( attrs[attrName] );

	if (urls.length > 0)
	{
		const promises = urls.map(value => Promise.resolve( transformer(value, attrName, tag, node) ));

		return Promise.all(promises).then(newUrls => attrs[attrName] = newUrls.join(PRETTY_DELIMITER));
	}
};



const transformDefault = (node, attrName, transformer) =>
{
	const {attrs, tag} = node;
	return Promise.resolve( transformer( attrs[attrName], attrName, tag, node ) )
	.then(newUrl => attrs[attrName] = newUrl);
};



const transformMetaRefresh = (node, attrName, transformer) =>
{
	const {attrs, tag} = node;
	const {timeout, url} = parseMetaRefresh( attrs[attrName] );

	if (timeout !== null)
	{
		return Promise.resolve( transformer(url || "", attrName, tag, node) )
		.then(newUrl => attrs[attrName] = `${timeout}; url=${newUrl}`);
	}
};



const transformSrcset = (node, attrName, transformer) =>
{
	const {attrs, tag} = node;
	const values = parseSrcset( attrs[attrName] );

	if (values.length > 0)
	{
		const promises = values.map((srcset) => Promise.resolve( transformer(srcset.url, attrName, tag, node) )
		.then(
    /** @returns {import('srcset').SrcSetDefinition} */
    newUrl =>
		{
      
			return { ...srcset, url: newUrl };
		}));

		return Promise.all(promises).then(newValues => attrs[attrName] = stringifySrcset(newValues));
	}
};


export default plugin;
