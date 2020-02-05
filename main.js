import * as d3 from 'd3';
import * as slider from 'd3-simple-slider';

// var dataUrl = "https://raw.githubusercontent.com/j2kun/harmonic-phase-space/master/phase_space_0.5_2_0.25_0_1_0.2.csv";
var dataUrl = "https://raw.githubusercontent.com/j2kun/harmonic-phase-space/master/phase_space_0.5_2_0.1_0_1_0.05.csv";
var chosenParameters = {};

// This is the global state that will be loaded once and persist for the life
// of the program
var groupedPlotData = null;

var margin = {
    top: 10,
    right: 30,
    bottom: 30,
    left: 40
};
var width = 660 - margin.left - margin.right;
var height = 600 - margin.top - margin.bottom;

let svg = d3.select("#plot").append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform",
        "translate(" + margin.left + "," + margin.top + ")");

var xAxis;
var yAxis;
var color;

var tooltip = d3.select("body").append("div")
    .attr("class", "tooltip")
    .style("opacity", 1e-6);

function setupAxes(domain, range) {
    // domain is a discrete set of possible points (assumed linear scale)
    // range is a length-two array of the min and max range value
    xAxis = d3.scaleBand()
        .domain(domain)
        .range([margin.left, width - margin.right]);
    svg.append("g")
        .attr("transform", "translate(0," + height + ")")
        .call(d3.axisBottom(xAxis));

    yAxis = d3.scaleBand()
        .domain(domain)
        .range([height - margin.bottom, margin.top]);
    svg.append("g")
        .call(d3.axisLeft(yAxis));
}

function setupSlider(data, variableName) {
    let rangeMin = Math.min(...data);
    let rangeMax = Math.max(...data);

    // Step
    let sliderStep = slider
        .sliderBottom()
        .min(rangeMin)
        .max(rangeMax)
        .width(500)
        .tickFormat(d3.format('.2f'))
        .tickValues(data)
        .marks(data)
        .default(data[0])
        .on('onchange', val => {
            chosenParameters[variableName] = val;
            render();
        });

    let sliderId = "slider-" + variableName;
    let gStep = d3
        .select('div#sliders')
        .append('div')
        .attr('id', sliderId)
        .append('svg')
        .attr('width', 600)
        .attr('height', 80)
        .append('g')
        .attr('transform', 'translate(30,30)');

    gStep.call(sliderStep);
    d3.select('div#' + sliderId)
        .insert("p", ":first-child")
        .attr("class", "sliderName")
        .text(variableName);
}

function setupSliders(domains, variableNames) {
    // Domains is a dict {str: [float]}
    for (let name of variableNames) {
        setupSlider(domains[name], name);
    }
}

function groupData(data) {
    // First group into a dictionary (A2, A3) -> [(p2, p3, max)]
    // Treat each entry of the dict as a single function of (p2, p3)
    let groupedPlotData = {};
    for (let d of data) {
        let A2 = d.A2;
        let A3 = d.A3;
        let key = [d.A2, d.A3];
        if (!(key in groupedPlotData)) {
            groupedPlotData[key] = [];
        }

        // we want to retain the keys of the entire original entry
        groupedPlotData[key].push(d);
    }
    return groupedPlotData;
}


function computeDomain(data, dimensionLabel) {
    return [...new Set(data.map(x => x[dimensionLabel]))]
}


function render() {
    // select the parameters to display from the sliders
    let A2 = chosenParameters["A2"];
    let A3 = chosenParameters["A3"];

    // index the right slice
    // Samples are the original rows of the CSV parsed as objects
    let samples = groupedPlotData[[A2, A3]];
    let range = computeDomain(samples, "max");
    let rangeMin = Math.min(...range);
    let rangeMax = Math.max(...range);

    // Prepare a color palette
    color = d3.scaleLinear()
        .domain([rangeMin, rangeMax])
        .range(["blue", "red"]);

    // plot samples as rectangles
    let rects = svg.selectAll("rect")
        .data(samples);

    rects.enter()
        .append("rect")
        .merge(rects)
        .attr("x", function(d) {
            return xAxis(d.p2);
        }).attr("y", function(d) {
            return yAxis(d.p3);
        }).attr("width", xAxis.bandwidth())
        .attr("height", yAxis.bandwidth())
        .style("fill", function(d) {
            return color(d.max);
        })
        .on("mouseover", mouseover)
        .on("mousemove", mousemove)
        .on("mouseout", mouseout);

    rects.exit().remove();
}

/* Display the tooltip graph */
function mouseover() {
  tooltip.style("opacity", 1);
}

// where the tooltip previosly contained an image
function mousemove() {
  tooltip
   .html("wat")
      .style("left", (d3.event.pageX + 20) + "px")
      .style("top", (d3.event.pageY + 20) + "px");
}

function mouseout() {
  tooltip.style("opacity", 1e-6);
}

d3.csv(dataUrl, function(record) {
    // Convert the values to numeric
    return {
        A2: +record.A2,
        A3: +record.A3,
        p2: +record.p2,
        p3: +record.p3,
        max: +record.max
    }
}).then(function(data) {
    console.log('Done loading data');
    groupedPlotData = groupData(data);
    let domainNames = ["A2", "A3", "p2", "p3", "max"];
    let domains = domainNames.reduce(
        (map, name) => {
            map[name] = computeDomain(data, name);
            return map;
        }, {});

    // Initial parameters are the min of all parameters
    // "max" will be ignored anyway later so it's fine.
    chosenParameters = Object.keys(domains).reduce(
        (map, name) => {
            map[name] = Math.min(...domains[name]);
            return map;
        }, {});

    console.log('Done processing data');
    setupAxes(domains["p2"]);
    setupSliders(domains, ["A2", "A3"]);
    render();
});
