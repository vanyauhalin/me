/**
 * @typedef {object} NavItem
 * @property {string} label
 * @property {boolean} current
 * @property {string} url
 */

export default function() {
	return {
		layout: "base.njk",
		eleventyComputed: {
			/**
			 * @param {any} ctx
			 * @returns {string}
			 */
			canonical(ctx) {
				return new URL(ctx.page.url, ctx.domain).href
			},

			/**
			 * @param {any} ctx
			 * @returns {NavItem[]}
			 */
			navItems(ctx) {
				/** @type {NavItem[]} */
				let items = [
					{label: "Home", current: false, url: "/"},
					{label: "Posts", current: false, url: "/posts/"},
					{label: "Projects", current: false, url: "/projects/"},
					{label: "Experience", current: false, url: "/experience/"},
					{label: "Contacts", current: false, url: "/contacts/"},
				]

				for (let t of items) {
					if (ctx.page.url === t.url) {
						t.current = true
					}
				}

				return items
			},
		},
	}
}
