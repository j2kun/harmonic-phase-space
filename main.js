import * as d3 from 'd3';

// var data_url = "https://raw.githubusercontent.com/j2kun/harmonic-phase-space/master/phase_space_0.5_2_0.25_0_1_0.2.csv";
var data_url = "https://raw.githubusercontent.com/j2kun/harmonic-phase-space/master/phase_space_0.5_2_0.1_0_1_0.05.csv";

var margin = {
    top: 10,
    right: 30,
    bottom: 30,
    left: 40
};
var width = 660 - margin.left - margin.right;
var height = 600 - margin.top - margin.bottom;

let svg = d3.select(".centered").append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform",
        "translate(" + margin.left + "," + margin.top + ")");

var xAxis;
var yAxis;
var color;


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

function setupSliders() {

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


function render(groupedPlotData) {
    // select the parameters to display from the sliders
    let A2 = 0.5;
    let A3 = 1.9;

    // index the right slice
    // Samples are the original rows of the CSV parsed as objects
    let samples = groupedPlotData[[A2, A3]];
    let range = computeDomain(samples, "max");
    let rangeMin = Math.min(...range);
    let rangeMax = Math.max(...range);
    console.log("Range is: " + [rangeMin, rangeMax]);

    // Prepare a color palette
    color = d3.scaleLinear()
        .domain([rangeMin, rangeMax])
        .range(["blue", "red"]);

    // plot samples as rectangles
    svg.selectAll("rect")
        .data(samples)
        .enter()
        .append("rect")
        .attr("x", function(d) {
            return xAxis(d.p2);
        })
        .attr("y", function(d) {
            return yAxis(d.p3);
        })
        .attr("width", xAxis.bandwidth())
        .attr("height", yAxis.bandwidth())
        .style("fill", function(d) {
            return color(d.max);
        });
}


d3.csv(data_url, function(record) {
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
    setupSliders();
    console.log('Done setting up figure');
    let groupedPlotData = groupData(data);
    let domain = computeDomain(data, "p2");

    console.log("Domain is: " + domain);
    setupAxes(domain);
    render(groupedPlotData);
});
