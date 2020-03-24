// Hayley Corson-Dosch javascript script

// *************************************************** //
// Define global variables
// SVG dimension variables
var w = 900, h = 500;

// ************************************************ //
// Execute script when window is loaded
window.onload = function(){
  // block for main svg container
  // Get the <body> element from the DOM
  var container = d3.select("body")
    // append the <svg> container to the body
    .append("svg")
    // add svg dimension variables
    .attr("width", w) // assign width
    .attr("height", h) // assign height
    // assign class for styling and future selection
    .attr("class", "container")
    // style the svg so it is visible
    .style("background-color", "rgba(0,0,0,0.2)"); // semi-colon ends the block

  // block for inner rectangle
  // put a new rectangle WITHIN the svg
  var innerRect = container.append("rect")
    // set single value as datum
    .datum(400)
    // set width as a function of the datum
    .attr("width", function(d){
      return d*2; //400*2 = 800
    })
    // set height as a function of the datum
    .attr("height", function(d){
      return d; //400
    })
    // set class name
    .attr("class", "innerRect")
    // set position from left on horizontal (x) axis
    .attr("x", 50)
    // set position from top on the vertical (y) axis
    .attr("y", 50)
    // set fill color
    .style("fill", "#FFFFFF");

  // Create an array
  var dataArray = [10, 20, 30, 40, 50];

  var cityPop = [
      {
          city: 'Madison',
          population: 233209
      },
      {
          city: 'Milwaukee',
          population: 594833
      },
      {
          city: 'Green Bay',
          population: 104057
      },
      {
          city: 'Superior',
          population: 27244
      }
  ];

  // Set a scale for x
  var x = d3.scaleLinear()
    // output min and max (based on rectangle width)
    .range([90, 750])
    // input min and max (based on indices in array)
    .domain([0, 3]);

  // set a scale for y
  // find minimum value in array
  var minPop = d3.min(cityPop, function(d){
    return d.population;
  });
  // find maximum value in array
  var maxPop = d3.max(cityPop, function(d){
    return d.population;
  });
  // scale for circle center y coordinate
  var y = d3.scaleLinear()
    // output min and max
    // based on height of rectangle, starting with TOP value
    // so that higher values are associated with "up" since
    // [0, 0] coordinate of svg is upper-left corner
    .range([450, 50]) // was 440, 95adjusted so that scale bar fits rectangle
    // input min and max (based on min and max population)
    .domain([0, 700000]); // was minPop, maxPop

  // set a color scale generator
  var color = d3.scaleLinear()
    // set an unclassed color scheme for output values
    .range([
      "#FDBE85",
      "#D94701"
    ])
    // input min and max (based on min and max population)
    .domain([
      minPop,
      maxPop
    ]);

  // Create a set of circles
  var circles = container.selectAll(".circles") // make an empty selection
    .data(cityPop) // feed in the data
    .enter()
    .append("circle") // add a circle for each datum in the array
    .attr("class", "circles") // apply a class name to all circles
    // set circle ids
    .attr("id", function(d){
      return d.city;
    })
    // set circle radii as function of city population
    .attr("r", function(d){
      var area = d.population * 0.01;
      return Math.sqrt(area/Math.PI);
    })
    // set x coord of circle center as function of INDEX of each datum in array
    .attr("cx", function(d, i){
      // use the scale generator with the index to place each circle horizontally
      return x(i);
    })
    // set y coord of circle center as function of DATUM in array
    .attr("cy", function(d){
      // use the scale generator with the population value
      // to place each circle vertically
      return y(d.population);
    })
    // add a fill based on the color scale generator
    .style("fill", function(d, i){
      return color(d.population);
    })
    // add a black stroke
    .style("stroke", "#000");

  // Create a y axis generator
  var yAxis = d3.axisLeft(y);

  // Create a y axis
  var axis = container.append("g")
    .attr("class", "axis")
    .attr("transform", "translate(50, 0)")
    // call axis generator
    .call(yAxis);

  // Add a title
  var title = container.append("text")
  .attr("class", "title")
  .attr("text-anchor", "middle")
  .attr("x", 450)
  .attr("y", 30)
  .text("City Populations");

  // create format generator for labels
  var format = d3.format(",");

  // create circle labels
  var labels = container.selectAll(".labels") // empty selection
    .data(cityPop)
    .enter()
    .append("text")
    .attr("class", "labels")
    .attr("text-anchor", "left")
    .attr("y", function(d){
      // vertical position centered on each circle
      return y(d.population) - 3;
    })

  // first line of label
  var nameLine = labels.append("tspan")
    .attr("class", "nameLine")
    .attr("x", function(d, i){
      // horzontal position to the right of each circle
      return x(i) + Math.sqrt(d.population * 0.01 / Math.PI) + 5;
    })
    .text(function(d){
      return d.city;
    });

  // second line of label
  var popLine = labels.append("tspan")
    .attr("class", "popLine")
    .attr("x", function(d,i){
      // horzontal position to the right of each circle
      return x(i) + Math.sqrt(d.population * 0.01 / Math.PI) + 5;
    })
    // offset second line
    .attr("dy", "15")
    .text(function(d){
      // use format generator to format numbers
      return "Pop. " + format(d.population);
    });
}
