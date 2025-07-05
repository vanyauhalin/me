/**
 * @typedef {object} Post
 * @property {string} index
 * @property {string} title
 * @property {string} url
 */

export default function() {
	return {
		title: "Posts",
		description: "My blog posts.",
		layout: "base.njk",
		eleventyComputed: {
			/**
			 * @param {any} ctx
			 * @returns {Post[]}
			 */
			posts(ctx) {
				/** @type {Post[]} */
				let posts = []

				for (let [i, p] of ctx.collections.posts.entries()) {
					/** @type {Post} */
					let t = {
						index: "",
						title: p.data.title,
						url: p.data.page.url,
					}

					if (i < 10) {
						t.index = `0${i}`
					} else {
						t.index = `${i}`
					}

					posts.unshift(t)
				}

				return posts
			},
		},
	}
}
