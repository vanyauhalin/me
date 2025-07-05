export default function() {
	return {
		title: "Experience",
		description: "My professional experience.",
		present: since("June 2023"),
	}
}

/**
 * @param {string} v
 * @returns {string}
 */
function since(v) {
	let s = new Date(v)
	let e = new Date()

	let y = e.getUTCFullYear() - s.getUTCFullYear()
	let m = e.getUTCMonth() - s.getUTCMonth()

	if (m < 0) {
		y -= 1
		m += 12
	}

	let p = ""

	if (y > 0) {
		if (y === 1) {
			p += "1 yr"
		} else {
			p += `${y} yrs`
		}
	}

	if (m > 0) {
		if (p) {
			p += " "
		}
		if (m === 1) {
			p += "1 mo"
		} else {
			p += `${m} mos`
		}
	}

	return p
}
