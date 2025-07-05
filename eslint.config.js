import config from "@vanyauhalin/eslint-config"

export default [
	...config,
	{
		files: ["package.json"],
		rules: {
			"package-json/require-author": "off",
			"package-json/require-keywords": "off",
			"package-json/require-version": "off",
			"package-json/valid-package-definition": "off",
		},
	},
	{
		rules: {
			"func-names": "off",
			"import-x/no-default-export": "off",
			"no-restricted-syntax": ["error", "ImportSpecifier"],
			"unicorn/import-style": "off",
			"unicorn/no-anonymous-default-export": "off",
		},
	},
]
