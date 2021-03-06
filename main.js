import * as d3 from 'd3';
import * as slider from 'd3-simple-slider';

// var dataUrl = "https://raw.githubusercontent.com/j2kun/harmonic-phase-space/master/phase_space_0.5_2_0.25_0_1_0.2.csv";
var dataUrl = "https://media.githubusercontent.com/media/j2kun/harmonic-phase-space/master/phase_space_0.5_2_0.03_0_1_0.02.csv";
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
var graphWidth = 300;
var graphHeight = 300;
var graphAxisPadding = 20;


let svg = d3.select("#plot").append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform",
        "translate(" + margin.left + "," + margin.top + ")");

var graphContainer = d3.select("body").append("div")
    .attr("class", "graphContainer")
    .attr("width", graphWidth + 2 * graphAxisPadding)
    .attr("height", graphHeight);

var graph = graphContainer.append("svg")
    .attr("id", "graph")
    .attr("width", graphWidth + 2 * graphAxisPadding)
    .attr("height", graphHeight);

var xAxis;
var yAxis;
var color;
var graphXAxis;
var graphYAxis;

let plotLine = d3.line()
    .x(function(d) {
        return graphXAxis(d.x);
    })
    .y(function(d) {
        return graphYAxis(d.y);
    });


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
        .on("mouseover", mousemove);

    rects.exit().remove();
}

function setupGraph() {
    graphXAxis = d3.scaleLinear().domain([0, 1]).range([0, graphWidth]);
    graphYAxis = d3.scaleLinear().domain([-3, 3]).range([graphHeight, 0]);

    let chart = d3.select("svg#graph")
        .attr("width", graphWidth + 2 * graphAxisPadding)
        .attr("height", graphHeight);

    chart.append("g")
        .attr("transform",
            "translate(" +
            2 * graphAxisPadding +
            "," +
            graphHeight / 2 +
            ")")
        .call(d3.axisBottom(graphXAxis));

    chart.append("g")
        .attr("transform", "translate(" + 2 * graphAxisPadding + ",0)")
        .call(d3.axisLeft(graphYAxis));

    chart.append("path")
        .attr("id", "line")
        .attr("transform", "translate(" + 2 * graphAxisPadding + ",0)");

    chart.append("path")
        .attr("id", "curve1")
        .attr("class", "singleCurve")
        .attr("transform", "translate(" + 2 * graphAxisPadding + ",0)");
    chart.append("path")
        .attr("id", "curve2")
        .attr("class", "singleCurve")
        .attr("transform", "translate(" + 2 * graphAxisPadding + ",0)");
    chart.append("path")
        .attr("id", "curve3")
        .attr("class", "singleCurve")
        .attr("transform", "translate(" + 2 * graphAxisPadding + ",0)");
}

function updateCurve(amplitude, shift, harmonic, name) {
    let singleSine = function(x) {
        return amplitude * Math.sin(harmonic * 2 * Math.PI * (x + shift));
    };

    let points = graphXAxis.ticks(100).map(function(xi) {
        return {
            x: xi,
            y: singleSine(xi)
        };
    });

    d3.selectAll("path#" + name)
        .each(function(d, i) {
            if (i === 0) {
                // put all your operations on the second element, e.g.
                d3.select(this).datum(points).attr("d", plotLine);
            }
        });
}

function rerenderGraph(params) {
    let A2 = params.A2;
    let A3 = params.A3;
    let p2 = params.p2;
    let p3 = params.p3;

    // Recompute graph
    let summedSine = function(x) {
        // A_k * sin(k 2pi t + p_k)
        // where A_1 = 1, p_1 = 0
        return (
            Math.sin(1 * 2 * Math.PI * x) +
            A2 * Math.sin(2 * 2 * Math.PI * (x + p2)) +
            A3 * Math.sin(3 * 2 * Math.PI * (x + p3))
        );
    };

    let points = graphXAxis.ticks(100).map(function(xi) {
        return {
            x: xi,
            y: summedSine(xi)
        };
    });

    d3.selectAll("path#line")
        .each(function(d, i) {
            if (i === 0) {
                // put all your operations on the second element, e.g.
                d3.select(this).datum(points).attr("d", plotLine);
            }
        });

    updateCurve(1, 0, 1, "curve1");
    updateCurve(A2, p2, 2, "curve2");
    updateCurve(A3, p3, 3, "curve3");
}

// where the graph previosly contained an image
function mousemove() {
    let rect = d3.select(this);
    rerenderGraph(rect.node().__data__);
}

if (/^file:\/\/\//.test(location.href)) {
    let path = './';
    let orig = fetch;
    window.fetch = (resource) => ((/^[^/:]*:/.test(resource)) ?
        orig(resource) :
        new Promise(function(resolve, reject) {
            let request = new XMLHttpRequest();

            let fail = (error) => {
                reject(error)
            };
            ['error', 'abort'].forEach((event) => {
                request.addEventListener(event, fail);
            });

            let pull = (expected) => (new Promise((resolve, reject) => {
                if (
                    request.responseType == expected ||
                    (expected == 'text' && !request.responseType)
                )
                    resolve(request.response);
                else
                    reject(request.responseType);
            }));

            request.addEventListener('load', () => (resolve({
                arrayBuffer: () => (pull('arraybuffer')),
                blob: () => (pull('blob')),
                text: () => (pull('text')),
                json: () => (pull('json')),
                ok: true,
                status: 200,
                statusText: 'ok'
            })));
            request.open('GET', resource.replace(/^\//, path));
            request.send();
        })
    );
}

d3.csv('./phase_space_0.5_2_0.03_0_1_0.02.csv', function(record) {
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
        let domains = {};
        domainNames.forEach(
            name => {
                domains[name] = computeDomain(data, name);
            });

        // Initial parameters are the min of all parameters
        // "max" will be ignored anyway later so it's fine.
        chosenParameters = {
            A2: 0.5,
            A3: 0.5,
            p2: 0,
            p3: 0
        };

        console.log('Done processing data');
        setupAxes(domains["p2"]);
        setupSliders(domains, ["A2", "A3"]);
        setupGraph();
        render();
    })
    .catch(err => console.error(err));
