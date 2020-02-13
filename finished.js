'use strict';

(function() {

  let data = "no data";
  let svgContainer = ""; // keep SVG reference in global scope

  // load data and make scatter plot after window loads
  window.onload = function() {
    svgContainer = d3.select('body')
      .append('svg')
      .attr('width', 1000)
      .attr('height', 600);
    // d3.csv is basically fetch but it can be be passed a csv file as a parameter
    d3.csv("gapminder.csv")
      .then((data) => makeScatterPlot(data));
  }

  // make scatter plot with trend line
  function makeScatterPlot(csvData) {
    data = csvData // assign data as global variable

    // select data from 1980
    let filteredData = data.filter(function (datapoint) {
      return datapoint["year"] == 1980;
    });

    // get arrays of fertility rate data and life Expectancy data
    let fertility_rate_data = filteredData.map((row) => parseFloat(row["fertility"]));
    let life_expectancy_data = filteredData.map((row) => parseFloat(row["life_expectancy"]));

    // find filteredData limits
    let axesLimits = findMinMax(fertility_rate_data, life_expectancy_data);

    // draw axes and return scaling + mapping functions
    let mapFunctions = drawAxes(axesLimits, "fertility", "life_expectancy");

    // plot data as points and add tooltip functionality
    plotData(filteredData, mapFunctions);

    // draw title and axes labels
    makeLabels();

  }

  // make title and axes labels
  function makeLabels() {
    svgContainer.append('text')
      .attr('x', 100)
      .attr('y', 30)
      .style('font-size', '14pt')
      .text("Countries by Life Expectancy and Fertility Rate");

    svgContainer.append('text')
      .attr('x', 420)
      .attr('y', 590)
      .style('font-size', '10pt')
      .text('Fertility Rates (Avg Children per Woman)');

    svgContainer.append('text')
      .attr('transform', 'translate(15, 350)rotate(-90)')
      .style('font-size', '10pt')
      .text('Life Expectancy (years)');
  }

  // plot all the data points on the SVG
  // and add tooltip functionality
  function plotData(filteredData, map) {
    // get population data as array
    let pop_data = filteredData.map((row) => +row["population"]);
    let pop_limits = d3.extent(pop_data);
    // make size scaling function for population
    let pop_map_func = d3.scaleLinear()
      .domain([pop_limits[0], pop_limits[1]])
      .range([3, 20]);

    // mapping functions
    let xMap = map.x;
    let yMap = map.y;

    // make tooltip
    let div = d3.select("body").append("div")
    .attr("class", "tooltip")
    .style("opacity", 0);


    svgContainer.selectAll("circle").remove();

    // append data to SVG and plot as points
    var circle = svgContainer.selectAll('.dot')
      .data(filteredData)
      .enter()
      .append('circle')
        .attr('cx', xMap)
        .attr('cy', yMap)
        .attr('r', (d) => pop_map_func(d["population"]))
        .style('stroke', "#4286f4")
        .style("fill", "#4286f4aa")
        .on("mouseover", (d) => {
          // filter to the selected country's data
          let countryData = data.filter(function (datapoint) {
            return datapoint["country"] == d.country;
          });

          // remove 2016 from the dataset to avoid errors
          countryData = countryData.filter(function (datapoint) {
            return datapoint["year"] != 2016;
          });

          // get arrays of population data and year data based on the selected country 
          let population_data = countryData.map((row) => parseFloat(row["population"]));
          let year_data = countryData.map((row) => parseFloat(row["year"]));

          let limits = findMinMax(year_data, population_data);
          div.transition()
            .duration(200)
            .style("opacity", .9);
          
          div.html(d.country + "<br/>")
            .style("left", (d3.event.pageX) + "px")
            .style("top", (d3.event.pageY - 28) + "px")
            .append('svg')
            .attr('class', 'line-graph')
            .attr('width', 300)
            .attr('height', 275)

          let mapFunctions = drawLineAxes(limits, "year", "population");
          plotLineGraph(countryData, mapFunctions);
  
        })
        .on("mouseout", (d) => {
          div.transition()
            .duration(500)
            .style("opacity", 0);
        });
        
    // only add label to population greater than 100 million people
    filteredData = filteredData.filter(function (datapoint) {
      return datapoint["population"] > 100000000;
    });
    
    d3.select("body")
      .selectAll("div.label") 
      .data(filteredData)
      .enter()
      .append("div")
      .html((d) =>(d.country))
      .style("left", (d) => parseInt(xMap(d),10) - 53 + "px")
      .style("top", (d) => parseInt(yMap(d),10) + 2 + "px")
      .attr("class", "label");
  }


  function plotLineGraph(filteredData, map) {
    let lineContainer = d3.select('svg.line-graph')

    // get population data as array
    let pop_data = filteredData.map((row) => +row["population"]);
    let pop_limits = d3.extent(pop_data);
    // make size scaling function for population
    let pop_map_func = d3.scaleLinear()
      .domain([pop_limits[0], pop_limits[1]])
      .range([3, 20]);

    // mapping functions
    let xMap = map.x;
    let yMap = map.y;    
    
    let valueline = d3.line()
      .x(function(d) { return xMap(d);})
      .y(function(d) { return yMap(d); });

    lineContainer.append("path")
      .data([filteredData])
      .attr("d", valueline)
      .style("stroke", "black")
      .style("stroke-width", "1px");

    lineContainer.append('text')
      .attr('x', 120)
      .attr('y', 25)
      .style('font-size', '10pt')
      .text('Year');

    lineContainer.append('text')
      .attr('transform', 'translate(15, 160)rotate(-90)')
      .style('font-size', '10pt')
      .text('Population');
  }



  // draw the axes and ticks
  function drawLineAxes(limits, x, y) {
    // return x value from a row of data
    let lineContainer = d3.select('svg.line-graph')

    lineContainer.selectAll("g").remove()

    let xValue = function(d) { return +d[x]; }

    // function to scale x value
    let xScale = d3.scaleLinear()
      .domain([limits.xMin - 0.5, limits.xMax + 0.5]) // give domain buffer room
      .range([50, 225])
      

    // xMap returns a scaled x value from a row of data
    let xMap = function(d) { return xScale(xValue(d)); };

    // plot x-axis at bottom of SVG
    let xAxis = d3.axisBottom().scale(xScale);
    lineContainer.append("g")
      .attr('transform', 'translate(0, 250)')
      .call(xAxis.ticks(5));
      

    // return y value from a row of data
    let yValue = function(d) { return +d[y]}

    // function to scale y
    let yScale = d3.scaleLinear()
      .domain([limits.yMax + 1, limits.yMin - 1]) // give domain buffer
      .range([25, 250]);

    // yMap returns a scaled y value from a row of data
    let yMap = function (d) { return yScale(yValue(d)); };

    // plot y-axis at the left of SVG
    let yAxis = d3.axisLeft().scale(yScale);
    lineContainer.append('g')
      .attr('transform', 'translate(50, 0)')
      .call(yAxis.ticks(5).tickFormat(d3.formatPrefix(".1", 1e6)));

    // return mapping and scaling functions
    return {
      x: xMap,
      y: yMap,
      xScale: xScale,
      yScale: yScale
    };
  }


  // draw the axes and ticks
  function drawAxes(limits, x, y) {
    // return x value from a row of data
    svgContainer.selectAll("g").remove()

    let xValue = function(d) { return +d[x]; }

    // function to scale x value
    let xScale = d3.scaleLinear()
      .domain([limits.xMin - 0.5, limits.xMax + 0.5]) // give domain buffer room
      .range([50, 950]);

    // xMap returns a scaled x value from a row of data
    let xMap = function(d) { return xScale(xValue(d)); };

    // plot x-axis at bottom of SVG
    let xAxis = d3.axisBottom().scale(xScale);
    svgContainer.append("g")
      .attr('transform', 'translate(0, 550)')
      .call(xAxis);

    // return y value from a row of data
    let yValue = function(d) { return +d[y]}

    // function to scale y
    let yScale = d3.scaleLinear()
      .domain([limits.yMax + 5, limits.yMin - 5]) // give domain buffer
      .range([50, 550]);

    // yMap returns a scaled y value from a row of data
    let yMap = function (d) { return yScale(yValue(d)); };

    // plot y-axis at the left of SVG
    let yAxis = d3.axisLeft().scale(yScale);
    svgContainer.append('g')
      .attr('transform', 'translate(50, 0)')
      .call(yAxis);

    // return mapping and scaling functions
    return {
      x: xMap,
      y: yMap,
      xScale: xScale,
      yScale: yScale
    };
  }

  // find min and max for arrays of x and y
  function findMinMax(x, y) {

    // get min/max x values
    let xMin = d3.min(x);
    let xMax = d3.max(x);

    // get min/max y values
    let yMin = d3.min(y);
    let yMax = d3.max(y);

    // return formatted min/max data as an object
    return {
      xMin : xMin,
      xMax : xMax,
      yMin : yMin,
      yMax : yMax
    }
  }

  // format numbers
  function numberWithCommas(x) {
    return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  }

})();
