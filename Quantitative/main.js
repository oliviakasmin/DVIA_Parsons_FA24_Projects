const body = d3.select("body");

body
	.append("h1")
	.text("Rat Trouble: Where 311 Rodent Complaints Are Piling Up in NYC");

const svgWidth = 1920 / 2;
const svgHeight = 1080 / 2;
const margin = { left: 50, right: 50, top: 50, bottom: 50 };

const svg = body
	.append("svg")
	.attr("viewBox", `0 0 ${svgWidth} ${svgHeight}`)
	.attr("width", svgWidth)
	.attr("height", svgHeight)
	.attr("class", "bar-chart-svg");

// json from API
const getData = async () => {
	const url = new URL(
		"https://data.cityofnewyork.us/resource/erm2-nwe9.json?complaint_type=Rodent"
	);
	const json = await d3.json(url);
	return json;
};

const rollupData = async () => {
	const data = await getData();
	return d3.rollup(
		data,
		(v) => v.length,
		(d) => d["borough"],
		(d) => d["descriptor"]
	);
};

const data = await rollupData();
const getComplaintTypes = () => {
	const complaints = Array.from(data.values());
	const complaintTypes = Array.from(complaints[0].keys());
	complaints.forEach((complaint) => {
		const keys = Array.from(complaint.keys());
		keys.forEach((key) => {
			if (!complaintTypes.includes(key)) {
				complaintTypes.push(key);
			}
		});
	});
	return complaintTypes;
};
const complaintTypes = getComplaintTypes();

const formatData = () => {
	const formatted = [];
	for (const [key, value] of data) {
		const formattedBorough = [];
		const borough = key;
		for (const [key, val] of value) {
			const obj = { borough, complaint: key, value: val };
			formattedBorough.push(obj);
		}
		formatted.push(formattedBorough);
	}
	return formatted;
};
const formattedData = formatData();

const getMaxY = () => {
	const boroughValues = data.values();
	const [min, max] = d3.extent(
		Array.from(boroughValues).flatMap((borough) => Array.from(borough.values()))
	);
	return max;
};
const maxY = getMaxY();

// the layers are determined by the order in which groups are appended to the svg
const axesLayer = svg.append("g").attr("class", "axes");
const barsLayer = svg.append("g").attr("class", "bars");

const xScale = d3
	.scaleBand()
	.domain(data.keys()) //grab boroughs
	.range([0 + margin.left, svgWidth - margin.right])
	.paddingInner(0.25) // between bars
	.paddingOuter(0.1); // between first and last bar and the edges of the svg

const xSecondScale = d3
	.scaleBand()
	.domain(complaintTypes)
	.range([0, xScale.bandwidth()])
	.padding(0.05);

const paletteOnBlack = [
	"#8F8994", //taupe grey
	"#8CA479", //asparagus
	"#CED6F3", // pastel blue
	"#FFFFFF", //white
];

const colorScale = d3
	.scaleOrdinal()
	.domain(complaintTypes)
	.range(paletteOnBlack);

const yScale = d3
	.scaleLinear()
	.domain([maxY, 0]) //reverse the domain so that the bars grow from the bottom up
	.range([margin.top, svgHeight - margin.bottom])
	.nice(); //nice() rounds the domain to make it look better

// Append the axes
axesLayer
	.append("g")
	.attr("transform", `translate(${margin.left} 0)`) //move the axis to the right by margin.left so it renders inside the svg canvas
	.call(d3.axisLeft(yScale));

axesLayer
	.append("g")
	.attr("transform", `translate(0 ${svgHeight - margin.bottom})`)
	.call(d3.axisBottom(xScale));

// Create a tooltip div and style it
const tooltip = d3.select("body").append("div").attr("class", "tooltip");

const complaintTypesColors = colorScale.domain();

// Create a legend group
const legend = svg
	.append("g")
	.attr(
		"transform",
		`translate(${svgWidth - margin.right - 170}, ${margin.top})`
	);

// Append legend items
complaintTypesColors.forEach((complaint, i) => {
	const legendRow = legend
		.append("g")
		.attr("class", "legend-row") // Add this line to add a class to the legend rows
		.attr("transform", `translate(0, ${i * 20})`)
		.on("mouseover", () => {
			d3.selectAll(".bar").style("opacity", (d) =>
				d.complaint === complaint ? 1 : 0.2
			);
			d3.select(legendRow.node())
				.select("rect")
				.style("stroke", colorScale(complaint))
				.style("stroke-width", 2);
		})
		.on("mouseout", () => {
			d3.selectAll(".bar").style("opacity", 1);
			d3.select(legendRow.node()).select("rect").style("stroke", "none");
		});

	legendRow
		.append("rect")
		.attr("width", 10)
		.attr("height", 10)
		.attr("fill", colorScale(complaint));

	legendRow
		.append("text")
		.attr("class", "legend-text")
		.attr("x", 20)
		.attr("y", 10)
		.attr("text-anchor", "start")
		.text(complaint);
});

// Add the bars
barsLayer
	.selectAll("g")
	.data(formattedData)
	.join("g")
	.attr("transform", (d) => {
		return `translate(${xScale(d[0].borough)} 0)`; //move the bars to the right by the width of the bar
	})
	.selectAll("rect")
	.data((d) => d)
	.join("rect")
	.attr("class", (d) =>
		d.complaint === "Rat Sighting" ? "bar rat-sighting" : "bar"
	) // Add specific class for "Rat Sighting" for animation
	.attr("fill", (d) => colorScale(d.complaint)) //color the bars based on the complaint type
	.attr("width", xSecondScale.bandwidth()) //set the width of the bars
	.attr("height", (d) => svgHeight - margin.bottom - yScale(d.value)) //set the height of the bars
	.attr("x", (d) => xSecondScale(d.complaint)) //position the bars based on the complaint type
	.attr("y", (d) => yScale(d.value)) //position the bars based on the value
	.on("mouseover", (event, d) => {
		tooltip
			.style("visibility", "visible")
			.text(`${d.complaint}: ${d.value}`)
			.style("font-size", "12px");
	})
	.on("mousemove", (event) => {
		tooltip
			.style("top", `${event.pageY - 10}px`)
			.style("left", `${event.pageX + 10}px`);
	})
	.on("mouseout", () => {
		tooltip.style("visibility", "hidden");
	});
