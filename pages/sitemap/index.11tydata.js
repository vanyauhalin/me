/**
 * @typedef {object} SitemapItem
 * @property {string} loc
 * @property {string} lastmod
 */

export default function() {
	return {
		layout: null,
		permalink: "/sitemap.xml",
		eleventyComputed: {
			/**
			 * @param {any} ctx
			 * @returns {SitemapItem[]}
			 */
			sitemapItems(ctx) {
				/** @type {SitemapItem[]} */
				let items = []

				for (let p of ctx.collections.all) {
					/** @type {SitemapItem} */
					let t = {
						loc: new URL(p.url, ctx.domain).href,
						lastmod: p.date.toISOString(),
					}
					items.push(t)
				}

				return items
			},
		},
	}
}
