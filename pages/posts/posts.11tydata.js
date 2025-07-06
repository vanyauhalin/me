export default function() {
	return {
		layout: "post.njk",
		eleventyComputed: {
			/**
			 * @param {any} ctx
			 * @returns {string}
			 */
			postDatetime(ctx) {
				return ctx.page.date.toLocaleDateString("en-CA", {
					timeZone: "UTC",
				})
			},

			/**
			 * @param {any} ctx
			 * @returns {string}
			 */
			postDisplayDate(ctx) {
				return ctx.page.date.toLocaleDateString("en-US", {
					year: "numeric",
					month: "short",
					day: "numeric",
					timeZone: "UTC",
				})
			},
		},
	}
}
