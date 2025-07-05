export default function() {
	return {
		layout: null,
		permalink: "/robots.txt",
		eleventyComputed: {
			/**
			 * @param {any} ctx
			 * @returns {string}
			 */
			sitemap(ctx) {
				return new URL("/sitemap.xml", ctx.domain).href
			},
		},
	}
}
