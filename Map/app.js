// import d3 library
import * as d3 from "d3";
import "leaflet";
import "leaflet.markercluster";
import "leaflet.heat/dist/leaflet-heat.js";

const palette = [
	"#e69c53", // orange -  hawaii
	"#9dd183", // green - tonga
	"#7bbebb", // blue - mariana
	"#9a55e7", // purple - chevron
	"#f36a9f", // pink- heat
	"#c2dee5", // pastel blue - heat
	"#b8cb79", // green - heat
];

///////// Header /////////
let isHiddenHeader = false;
const headerButton = d3.select("#headerButton");
const headerButtonIcon = d3.select("#headerButtonIcon");
const titleDiv = d3.select("#title");
titleDiv.classed("hidden", isHiddenHeader);
const miniTitleDiv = d3.select("#mini-title");
miniTitleDiv.classed("hidden", !isHiddenHeader);

const toggleHeader = () => {
	isHiddenHeader = !isHiddenHeader;
	titleDiv.classed("hidden", isHiddenHeader);
	miniTitleDiv.classed("hidden", !isHiddenHeader);

	if (isHiddenHeader) {
		headerButtonIcon.classed("fas fa-chevron-up", false);
		headerButtonIcon.classed("fas fa-chevron-down", true);
	} else {
		headerButtonIcon.classed("fas fa-chevron-down", false);
		headerButtonIcon.classed("fas fa-chevron-up", true);
	}
};

headerButton.on("click", () => {
	toggleHeader();
});

///////// Map /////////

const minZoom = 2;
const maxZoom = 16;
const center = new L.LatLng(0, 18.984375000000004);
const centerZoom = minZoom;

const mapElement = d3.select("#map");

// create leaflet map
const map = L.map(mapElement.node()).setView([0, 0], 15);

map.on("zoomend", function () {
	console.log("Current zoom level:", map.getZoom());
});

map.on("click", function (ev) {
	var latlng = map.mouseEventToLatLng(ev.originalEvent);
	console.log(latlng.lat + ", " + latlng.lng);
});

const hawaiiStr = "Hawaii";
const tongaStr = "Tonga";
const marianaStr = "Northern Mariana Islands";

const hawaiiCoordinates = new L.LatLng(19.4103333, -155.2856667);
const tongaCoordinates = new L.LatLng(-20.546, -175.39);
const marianaCoordinates = new L.LatLng(15.498679138197133, 145.8586120605469);

const getDataDetails = async () => {
	const volcanoLayerGeoJson = await d3.json("/data/volcano.json");

	await Promise.all(
		volcanoLayerGeoJson.features.map(async (feature) => {
			const detailsResponse = await fetch(`${feature.properties.detail}`);
			const details = await detailsResponse.json();
			feature.properties["eventtime"] = new Date(
				details.properties.products.origin[0].properties.eventtime
			);
			feature.properties["depth"] =
				details.properties.products.origin[0].properties.depth;

			if (feature.properties.place.includes(hawaiiStr)) {
				feature.properties["placeCategory"] = `${hawaiiStr}`;
			} else if (feature.properties.place.includes(tongaStr)) {
				feature.properties["placeCategory"] = `${tongaStr}`;
			} else if (feature.properties.place.includes(marianaStr)) {
				feature.properties["placeCategory"] = `${marianaStr}`;
			}
		})
	);

	return volcanoLayerGeoJson;
};

const data = await getDataDetails();
const { features } = data;

const [minMag, maxMag] = d3.extent(features, (d) => d.properties.mag);

const normalize = (value) => (value - minMag) / (maxMag - minMag);

// Normalize the intensity values and create heat data
const heatData = features.map((feature) => {
	const { mag } = feature.properties;
	const normalizedIntensity = normalize(mag);
	return [
		feature.geometry.coordinates[1],
		feature.geometry.coordinates[0],
		normalizedIntensity,
	];
});

var heat = L.heatLayer(heatData, {
	radius: 50,
	gradient: { 0.4: palette[6], 0.65: palette[5], 1: palette[4] },
	minOpacity: 0.9,
});

const colorScale = d3
	.scaleOrdinal()
	.domain([hawaiiStr, tongaStr, marianaStr])
	.range([palette[0], palette[1], palette[2]]);

// Construct the radius scale.
const radius = d3.scaleSqrt(
	[0, d3.max(features, (d) => d.properties.mag)],
	[0, 5]
);

const tileLayer = L.tileLayer(
	"https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
	{
		minZoom,
		maxZoom,
		attribution:
			"Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community",
	}
);

var tileLayerDark = L.tileLayer(
	"https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
	{
		attribution:
			'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
		subdomains: "abcd",
		minZoom,
		maxZoom,
	}
);

const volcanoLayerMarkers = L.layerGroup();
for (const feature of features) {
	const marker = L.circleMarker(
		[feature.geometry.coordinates[1], feature.geometry.coordinates[0]],
		{
			radius: radius(feature.properties.mag) * 2,
			color: colorScale(feature.properties.placeCategory),
			weight: 1,
			opacity: 1,
			fillColor: colorScale(feature.properties.placeCategory),
			fillOpacity: 0.8,
		}
	);

	marker.bindPopup(
		`<h4>${
			feature.properties.place
		}</h4><p>${feature.properties.eventtime.toLocaleDateString()}</p><p>${
			feature.properties.mag
		} magnitude</p> <p><a href=${
			feature.properties.url
		} target="blank">More details</a></p>`
	);

	volcanoLayerMarkers.addLayer(marker);
}

const baseMaps = {
	"World Imagery": tileLayer,
	"Dark Mode": tileLayerDark,
};

const overlayMaps = {
	// "Volcano Layer": volcanoLayer,
	Markers: volcanoLayerMarkers,
	"Heat Map": heat,
};

L.control.layers(baseMaps, overlayMaps).addTo(map);

// add layers to map and set initial view
map.setView(center, centerZoom).addLayer(tileLayer).addLayer(heat);

// reset button control
L.Control.ResetButton = L.Control.extend({
	options: {
		position: "topleft",
	},
	onAdd: function (map) {
		const container = d3
			.create("div")
			.attr("class", "leaflet-bar leaflet-control");

		const button = container
			.append("a")
			.attr("class", "leaflet-control-button")
			.attr("role", "button")
			.style("cursor", "pointer");

		const icon = button
			.append("img")
			.attr("src", "/images/refresh-icon.svg")
			.style("transform", "scale(0.5)");

		button.on("click", (event) => {
			event.preventDefault();
			event.stopPropagation();
			map
				.setView(center, centerZoom)
				.removeLayer(volcanoLayerMarkers)
				.removeLayer(tileLayerDark)
				.addLayer(heat)
				.addLayer(tileLayer);
		});

		return container.node();
	},
	onRemove: function (map) {},
});
const resetButton = new L.Control.ResetButton();
resetButton.addTo(map);

const flyDuration = 3;

const onClickHawaii = () => {
	map.removeLayer(heat);
	map.removeLayer(volcanoLayerMarkers);
	map.flyTo(hawaiiCoordinates, 14, {
		animate: true,
		duration: flyDuration, // Duration in seconds
	});
	setTimeout(() => {
		map.addLayer(volcanoLayerMarkers);
	}, flyDuration * 1000);
	if (!isHiddenHeader) {
		toggleHeader();
	}
};

//zoom Hawaii button
L.Control.HawaiiButton = L.Control.extend({
	options: {
		position: "topright",
	},
	onAdd: function (map) {
		const container = d3
			.create("div")
			.attr("class", "leaflet-bar leaflet-control")
			.attr("class", "place-button-div hawaii");

		const button = container
			.append("a")
			.attr("class", "leaflet-control-button")
			.attr("class", "place-button")
			.attr("role", "button")
			.style("cursor", "pointer")
			.text(hawaiiStr);

		button.on("click", (event) => {
			event.preventDefault();
			event.stopPropagation();
			onClickHawaii();
		});

		return container.node();
	},
	onRemove: function (map) {},
});
const hawaiiButton = new L.Control.HawaiiButton();
hawaiiButton.addTo(map);

const onClickTonga = () => {
	map.removeLayer(heat);
	map.removeLayer(volcanoLayerMarkers);
	map.flyTo(tongaCoordinates, 13, {
		animate: true,
		duration: flyDuration, // Duration in seconds
	});
	setTimeout(() => {
		map.addLayer(volcanoLayerMarkers);
	}, flyDuration * 1000);
	if (!isHiddenHeader) {
		toggleHeader();
	}
};

//zoom Tonga button
L.Control.TongaButton = L.Control.extend({
	options: {
		position: "topright",
	},
	onAdd: function (map) {
		const container = d3
			.create("div")
			.attr("class", "leaflet-bar leaflet-control")
			.attr("class", "place-button-div tonga");

		const button = container
			.append("a")
			.attr("class", "leaflet-control-button")
			.attr("class", "place-button")
			.attr("role", "button")
			.style("cursor", "pointer")
			.text(tongaStr);

		button.on("click", (event) => {
			event.preventDefault();
			event.stopPropagation();
			onClickTonga();
		});

		return container.node();
	},
	onRemove: function (map) {},
});
const tongaButton = new L.Control.TongaButton();
tongaButton.addTo(map);

const onClickMariana = () => {
	map.removeLayer(heat);
	map.removeLayer(volcanoLayerMarkers);
	map.flyTo(marianaCoordinates, 10, {
		animate: true,
		duration: flyDuration, // Duration in seconds
	});
	setTimeout(() => {
		map.addLayer(volcanoLayerMarkers);
	}, flyDuration * 1000);
	if (!isHiddenHeader) {
		toggleHeader();
	}
};

//zoom Mariana button
L.Control.MarianaButton = L.Control.extend({
	options: {
		position: "topright",
	},
	onAdd: function (map) {
		const container = d3
			.create("div")
			.attr("class", "leaflet-bar leaflet-control")
			.attr("class", "place-button-div mariana");

		const button = container
			.append("a")
			.attr("class", "leaflet-control-button")
			.attr("class", "place-button")
			.attr("role", "button")
			.style("cursor", "pointer")
			.text(marianaStr);

		button.on("click", (event) => {
			event.preventDefault();
			event.stopPropagation();
			onClickMariana();
		});

		return container.node();
	},
	onRemove: function (map) {},
});
const marianaButton = new L.Control.MarianaButton();
marianaButton.addTo(map);

///////// Timeline /////////

const timelineDiv = d3.select("#timeline");

const svgWidth = 1280;
const svgHeight = 50;
const margin = { left: 20, right: 20, top: 20, bottom: 20 };

const timelineSvg = timelineDiv
	.append("svg")
	.attr("viewBox", `0 0 ${svgWidth} ${svgHeight}`)
	.attr("width", svgWidth)
	.attr("height", svgHeight)
	.attr("class", "total-average-svg");

// console.log(features[0].properties.eventtime);

const [minYear, maxYear] = d3.extent(features, (d) => d.properties.eventtime);
// Subtract 1 year from minYear for xScale
const adjustedMinYear = new Date(minYear);
adjustedMinYear.setFullYear(minYear.getFullYear() - 1);

// Add 1 year to maxYear for xScale
const adjustedMaxYear = new Date(maxYear);
adjustedMaxYear.setFullYear(maxYear.getFullYear() + 1);

const xScale = d3
	.scaleTime()
	.domain([adjustedMinYear, adjustedMaxYear])
	.range([margin.left, svgWidth - margin.right]);

// Append the axes
const axesLayer = timelineSvg.append("g").attr("class", "axes");
axesLayer
	.append("g")
	.attr("class", "x-axis")
	.attr("transform", `translate(0 ${svgHeight - margin.bottom})`)
	.call(d3.axisBottom(xScale).ticks(10))
	.selectAll("text")
	.attr("class", "x-axis-text");

// Add circles for each event
timelineSvg
	.selectAll(".date-circle")
	.data(features)
	.enter()
	.append("circle")
	.attr("class", "timeline-svg")
	.attr("cx", (d) => xScale(d.properties.eventtime))
	.attr("cy", (d) => svgHeight - margin.bottom - 10)
	.attr("r", (d) => radius(d.properties.mag) * 1.5)
	.attr("fill", (d) => colorScale(d.properties.placeCategory))
	.on("click", (event, d) => {
		event.preventDefault();
		event.stopPropagation();
		if (d.properties.placeCategory === hawaiiStr) {
			onClickHawaii();
		} else if (d.properties.placeCategory === tongaStr) {
			onClickTonga();
		} else if (d.properties.placeCategory === marianaStr) {
			onClickMariana();
		}
	})
	.on("mouseover", function (event, d) {
		d3.select(this)
			.transition()
			.duration(100)
			.attr("r", (d) => radius(d.properties.mag) * 2) // Increase radius on hover
			.attr("stroke", "white") // Add stroke on hover
			.attr("stroke-width", 4) // Set stroke width on hover
			.attr("cursor", "pointer");
	})
	.on("mouseout", function (event, d) {
		d3.select(this)
			.transition()
			.duration(100)
			.attr("r", (d) => radius(d.properties.mag) * 1.5) // Reset radius
			.attr("stroke", "none"); // Remove stroke
	});

let isHiddenTimeline = true;
timelineSvg.classed("hidden", isHiddenTimeline);
timelineDiv.classed("timeline-expanded", !isHiddenTimeline);
timelineDiv.classed("timeline-hidden", isHiddenTimeline);

const timelineButton = d3.select("#timelineButton");
const timelineButtonIcon = d3.select("#timelineButtonIcon");

timelineButton.on("click", () => {
	isHiddenTimeline = !isHiddenTimeline;
	timelineSvg.classed("hidden", isHiddenTimeline);
	timelineDiv.classed("timeline-expanded", !isHiddenTimeline);
	timelineDiv.classed("timeline-hidden", isHiddenTimeline);

	if (isHiddenTimeline) {
		timelineButtonIcon.classed("fas fa-chevron-down", false);
		timelineButtonIcon.classed("fas fa-chevron-up", true);
	} else {
		timelineButtonIcon.classed("fas fa-chevron-up", false);
		timelineButtonIcon.classed("fas fa-chevron-down", true);
	}
});
