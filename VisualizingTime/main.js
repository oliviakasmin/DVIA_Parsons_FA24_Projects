const pinkBackground = "#eab69f";

// palette for hour telling loom strings
const loomStringsPalette = [
	"#9FC131",
	"#E1D0CF",
	"#016329",
	"#60B6AF",
	"#3275B1",
	"#B79AAE",
	"#D6D58E",
	"#90B1BC",
	"#FB7E26",
	"#B5662A",
	"#6D6816",
	"#776D50",
];

//palette for horizontal minute strings
const yarnPalette = ["#005C53", "#679401"];

const body = d3.select("body");

const clock = body.append("div").attr("id", "clock");

const widthMarginLeft = 20;
const widthMarginTop = 20;

const canvasWidth = 600 + widthMarginLeft * 2;
const canvasHeight = 600 + widthMarginTop * 2;

const svg = clock
	.append("svg")
	.attr("viewBox", `0 0 ${canvasWidth} ${canvasHeight}`)
	.attr("width", canvasWidth)
	.attr("height", canvasHeight)
	.style("background-color", pinkBackground);

const getYarnColor = (minutes) => {
	let yarnColor = yarnPalette[0];
	if (minutes < 15 || (30 <= minutes && minutes < 45)) {
		yarnColor = yarnPalette[1];
	}
	return yarnColor;
};

const getLoomStringsColor = (hours, i) => {
	let loomStringsColor = "white";
	const hourColor = loomStringsPalette[hours % 12];

	if (hours < 12) {
		if (i < 15 || (30 <= i && i < 45)) {
			loomStringsColor = hourColor;
		} else {
			loomStringsColor = "white";
		}
	} else {
		if ((15 <= i && i < 30) || (45 <= i && i <= 60)) {
			loomStringsColor = hourColor;
		} else {
			loomStringsColor = "white";
		}
	}
	return loomStringsColor;
};

function loop() {
	const date = new Date();
	const hours = date.getHours();
	const minutes = date.getMinutes();
	const seconds = date.getSeconds();

	// vertical loom strings
	for (let i = 0; i <= 60; i++) {
		const xCoordinate = i * 10 + widthMarginLeft;
		const loomStringColor = getLoomStringsColor(hours, i);

		svg
			.append("line")
			.style("stroke", loomStringColor)
			.style("stroke-width", 1)
			.attr("x1", xCoordinate)
			.attr("y1", 0)
			.attr("x2", xCoordinate)
			.attr("y2", canvasHeight);
	}

	// weaving for minutes already passed
	for (let i = 0; i < minutes; i++) {
		const yarnColor = getYarnColor(i);

		for (let j = 0; j < 60; j++) {
			let y1;
			let y2;
			let centerYSecondsLine = i * 10 + widthMarginTop;
			if (j % 2 === 0) {
				y1 = centerYSecondsLine + 2;
				y2 = centerYSecondsLine - 2;
			} else {
				y1 = centerYSecondsLine - 2;
				y2 = centerYSecondsLine + 2;
			}

			let x2Weave;
			x2Weave = 10 + widthMarginLeft;
			x2Weave += j * 10;
			let x1Weave = x2Weave - 10;

			svg
				.append("line")
				.style("stroke", yarnColor)
				.style("stroke-width", 1)
				.attr("x1", x1Weave)
				.attr("y1", y1)
				.attr("x2", x2Weave)
				.attr("y2", y2);
		}
	}

	// weaving for current minute
	// weave across loom 1 second per string
	let x1Weave;
	let x2Weave;
	if (minutes % 2 === 0) {
		x2Weave = 10 + widthMarginLeft;
		x2Weave += seconds * 10;
		x1Weave = x2Weave - 10;
	} else {
		x1Weave = canvasWidth - widthMarginLeft - 10;
		x1Weave -= seconds * 10;
		x2Weave = x1Weave + 10;
	}

	// if even second, weave "up", otherwise weave "down"
	let y1;
	let y2;
	let centerYSecondsLine = minutes * 10 + widthMarginTop;
	if (minutes % 2 === 0) {
		if (seconds % 2 === 0) {
			y1 = centerYSecondsLine + 2;
			y2 = centerYSecondsLine - 2;
		} else {
			y1 = centerYSecondsLine - 2;
			y2 = centerYSecondsLine + 2;
		}
	} else {
		if (seconds % 2 !== 0) {
			y1 = centerYSecondsLine + 2;
			y2 = centerYSecondsLine - 2;
		} else {
			y1 = centerYSecondsLine - 2;
			y2 = centerYSecondsLine + 2;
		}
	}

	const yarnColor = getYarnColor(minutes);

	svg
		.append("line")
		.style("stroke", yarnColor)
		.style("stroke-width", 1)
		.attr("x1", x1Weave)
		.attr("y1", y1)
		.attr("x2", x2Weave)
		.attr("y2", y2);

	window.requestAnimationFrame(loop);
}

loop();
