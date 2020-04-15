// Hayley Corson-Dosch javascript script

// Define pseudo-global variables
(function(){
  // *************************************************** //
  // pseudo-global variables
  // variables for data join
  var attrArray = ["Per_Municipal", "Per_Industrial", "Per_Mining", "Per_Livestock", "Per_Aquaculture", "Per_Irrigation (total)", "Per_Crop Irrigation", "Per_Golf Course Irrigation", "Per_Thermoelectric"];
  // initial attribute
  var expressed = attrArray[0];

  // chart frame dimensions
  var chartWidth = window.innerWidth * 0.54, // was 0.425 then 0.525
      chartHeight = 340,
      leftPadding = 28,
      rightPadding = 2,
      topBottomPadding = 35,
      chartInnerWidth = chartWidth - leftPadding - rightPadding,
      chartInnerHeight = chartHeight - topBottomPadding * 2, // was 2
      translate = "translate(" + leftPadding + "," + topBottomPadding + ")";

  // create a scale to size bars proportionaly to frame
  var yScale = d3.scaleLinear()
    // set range of possible output values
    .range([270, 0])
    // define range of input values
    .domain([0, 100]);

  // begin script when window loads
  window.onload = setMap();

  // *************************************************** //
  // set up choropleth map
  function setMap(){
    // MAP, PROJECTION, PATH, and QUEUE BLOCKS
    // map frame dimensions
    var width = window.innerWidth * 0.385, // was 0.5
        height = 680;

    // create new svg container for the map
    var map = d3.select("body")
      .append("svg")
      .attr("class", "map")
      .attr("width", width)
      .attr("height", height);

    // create Albers equal area conic projection centered on california
    var projection = d3.geoAlbers()
      .center([0, 37.31667])
      .rotate([119.09, 0, 0])
      .parallels([35.66, 38.83])
      .scale(4000)
      .translate([width / 2, height / 2]);

    var path = d3.geoPath()
      .projection(projection);

    // Use Promise.all to parallelize asynchronous data loading
    var promises = [d3.csv("data/CA_wateruse_2015_v2.csv"),
                    d3.json("data/CA_Counties_TIGER2016.topojson.json"),
                    d3.json("data/CA_State_TIGER2016.topojson.json"),
                    d3.json("data/US_states.topojson.json")
                  ];
    Promise.all(promises).then(callback);

    // *************************************************** //
    // Place callback function within setMap to make
    // use of local variables
    function callback(data) {
      csvData = data[0];
      counties = data[1];
      california = data[2];
      united_states = data[3];
      console.log(csvData);
      console.log(counties);
      console.log(california);
      console.log(united_states);

      // place graticule on the map
      setGraticule(map, path);

      // translate counties TopoJSON
      var caCounties = topojson.feature(counties, counties.objects.CA_Counties_TIGER2016).features;
      // translate state TopoJSON
      var caState = topojson.feature(california, california.objects.CA_State_TIGER2016);
      // Translate United States TopoJSON
      var unitedStates = topojson.feature(united_states, united_states.objects.US_states);

      // check the results
      console.log(caCounties);
      console.log(caState);
      console.log(unitedStates);

      // join csv data to geojson enumeration units
      caCounties = joinData(caCounties, csvData);

      // color scale
      var colorScale = makeColorScale(csvData);

      // add enumeration units to the map
      setEnumerationUnits(caCounties, caState, unitedStates, map, path, colorScale);

      // Add coordinated visualization to the map
      setChart(csvData, colorScale);

      // create dropdown
      createDropdown(csvData);

      // create parallel coordinates chart
      createParallelChart(csvData);

      // add in metadata
      addMetadata()

    };
  }; //end of setMap()

  // *************************************************** //
  function setGraticule(map, path){
    // create graticule generator
    var graticule = d3.geoGraticule()
      // Place graticule lines every 5 degrees of longtitude and latitude
      .step([5, 5]);

    // create graticule background
    var gratBackground = map.append("path")
      // bind gradicule background
      .datum(graticule.outline())
      // assign class for styling
      .attr("class", "gratBackground")
      // project graticule
      .attr("d", path)

    // create graticule lines
    // Select graticlue elements that will be created
    var gratLines = map.selectAll(".gratLines")
      // bind graticule lines to each element to be created
      .data(graticule.lines())
      // create an element for each datum
      .enter()
      // append each element to the svg as a path element
      .append("path")
      // assign class for styling
      .attr("class", "gratLines")
      // project graticule lines
      .attr("d", path);
  };

  // *************************************************** //
  function joinData(caCounties, csvData){
    // loop through csv to assign each set of csv attribute values to a geojson region
    for (var i=0; i<csvData.length; i++){
      // define the current region
      var csvRegion = csvData[i];
      // define the csv attribute field to use as the key
      var csvKey = csvRegion.NAMELSAD;

      // Loop through the geojson regions
      for (var a=0; a<caCounties.length; a++){
        // Pull the properties for the current geojson region
        var geojsonProps = caCounties[a].properties;
        // set the geojson properties field to use as the key
        var geojsonKey = geojsonProps.NAMELSAD;
        // where primary keys match, transfer csv data to geojson properties object
        if (geojsonKey == csvKey){
          // assign all attributes and values
          attrArray.forEach(function(attr){
            // get csv attribute value, converting it to float
            var val = parseFloat(csvRegion[attr]);
            // assign attribute and value to geojson properties
            geojsonProps[attr] = val;
          });
        };
      };
    };
    return caCounties;
  };

  // *************************************************** //
  // function to create color scale generator
  function makeColorScale(data){
    var colorClasses = [
      "#fce4bb",
      "#fdcc8a",
      "#fc8d59",
      "#e34a33",
      "#bd0d0d" // previously "#b30000"
    ];

    // create color scale generator for natural breaks classification
    var colorScale = d3.scaleThreshold()
      .range(colorClasses);

    // build array of all values of the expressed attribute
    var domainArray = [];
    for (var i=0; i<data.length; i++){
      var val = parseFloat(data[i][expressed]);
      domainArray.push(val);
    };

    // cluster data using ckmeans clustering algorithm to create natural breaks
    var clusters = ss.ckmeans(domainArray, 5);
    console.log(clusters);
    // reset domain array to cluster minimums
    domainArray = clusters.map(function(d){
      return d3.min(d);
    });
    // remove first value from domain array to create class breakpoints
    domainArray.shift();

    // assign array of last 4 cluster minimums as domain
    colorScale.domain(domainArray);

    return colorScale;
  };

  // *************************************************** //
  function setEnumerationUnits(caCounties, caState, unitedStates, map, path, colorScale){
    // add us states to map
    var us = map.append("path")
      .datum(unitedStates)
      .attr("class", "nation")
      .attr("d", path);

    // add caCounties to map
    // select county elements that will be generated
    var cali_Counties = map.selectAll(".counties")
      // bind counties to each element to be created
      .data(caCounties)
      // create an element for each datum
      .enter()
      // append each element to the svg as a path element
      .append("path")
      // assign class for styling
      .attr("class", function(d){
        // return "counties " + d.properties.NAMELSAD;
        // return d.properties.NAMELSAD;
        return "counties " + d.properties.NAMELSAD.replace(/\s+/g,'');
      })
      // project counties
      .attr("d", path)
      // add color fill based on colorScale function
      .style("fill", function(d){
        var value = d.properties[expressed];
        if(value){
          return colorScale(value);
        } else {
          return "#ccc";
        };
      })
      // add mouseover functionality to highlight
      // use anonymous function so that can pass properties object
      // without passing the entire GeoJSON feature
      .on("mouseover", function(d){
        highlight(d.properties);
      })
      // add mouse off functionality to dehighlight
      .on("mouseout", function(d){
        dehighlight(d.properties)
      })
      // add labels on mouse move
      .on("mousemove", moveLabel);

    // add style descriptor to each path
    var desc = cali_Counties.append("desc")
      .text('{"stroke": "#FFFFFF", "stroke-width": "0.5px"}')

  };

  // *************************************************** //
  function setChart(csvData, colorScale){
    // create a second svg element to hold the bar chart
    var chart = d3.select("body")
      .append("svg")
      .attr("width", chartWidth)
      .attr("height", chartHeight)
      .attr("class", "chart");

    // create a rectangle for chart background fill
    var chartBackground = chart.append("rect")
      .attr("class", "chartBackground")
      .attr("width", chartInnerWidth)
      .attr("height", chartInnerHeight)
      .attr("transform", translate);

    // set bars for each province
    var bars = chart.selectAll(".bar") // make an empty selection
      // bind data to elements
      .data(csvData)
      // create each element
      .enter()
      // append a rectangle for each element
      .append("rect")
      // sort the data from smallest to largest
      .sort(function(a, b){
        return b[expressed]-a[expressed];
      })
      // assign a class to each element for styling
      .attr("class", function(d){
        // return "bar " + d.NAMELSAD;
        // return d.NAMELSAD;
        return "bar " + d.NAMELSAD.replace(/\s+/g, '');
      })
      // set width based on number of rows in csv
      // subtract 1 pixel to ensure gap between bars
      .attr("width", chartInnerWidth / csvData.length - 1)
      // add mouseover functionality for highlighting
      // here, okay to pass the name of the function as a parameter, because
      // this block uses the csvData, and thus the datum is already equivalent
      // to the properties object within the GeoJSON feature
      .on("mouseover", highlight)
      // add mouse off functionality to dehighlight
      .on("mouseout", dehighlight)
      // add labels on mouse move
      .on("mousemove", moveLabel);

    // add style descriptor to each rect
    var desc = bars.append("desc")
      .text('{"stroke": "none", "stroke-width": "0px"}');

    // Create a text element for the chart title
    var chartTitle = chart.append("text")
      .attr("x", 427.5)
      .attr("y", 30)
      .style("text-anchor", "middle")
      .attr("class", "chartTitle");

    // Create vertical axis generator
    var yAxis = d3.axisLeft()
      .scale(yScale);
      // .ticks(chartInnerHeight/40, "%"); // attempt to add percent sign to tick mark labels

    // Place axis
    var axis = chart.append("g")
      .attr("class", "axis")
      .attr("transform", translate)
      .call(yAxis);

    // Create frame for chart border
    var chartFrame = chart.append("rect")
      .attr("class", "chartFrame")
      .attr("width", chartInnerWidth)
      .attr("height", chartInnerHeight)
      .attr("transform", translate);

    // set bar positions, heights, and colors
    updateChart(bars, csvData.length, colorScale);

  };

  // *************************************************** //
  // fuction to create a dropdown menu for attribute selection
  function createDropdown(csvData){
    // add select element
    var dropdown = d3.select("body")
      // append the select element to the body
      .append("select")
      // add class for styling
      .attr("class", "dropdown")
      // add event listener
      .on("change", function(){
        // call listener handler function
        changeAttribute(this.value, csvData)
      });

    // add initial option
    var titleOption = dropdown.append("option")
      // create a title option element with no value attribute
      .attr("class", "titleOption")
      // ensure that users cannot select it
      .attr("disabled", "true")
      // add an affordance to let users know they can interact with the dropdown menu
      .text("Select Water Use Type");

    // add attribute name options
    var attrOptions = dropdown.selectAll("attrOptions")
      // bind data to the elements to be created
      .data(attrArray)
      // create an element for each datum
      .enter()
      // append to the option
      .append("option")
      // set value of attributes
      .attr("value", function(d){ return d })
      // set text element
      .text(function(d){ return d.substr(4,d.length) });
  };

  // *************************************************** //
  // dropdown change listener handler
  function changeAttribute(attribute, csvData){
    // change the expressed attribute
    expressed = attribute;

    // recreate the color scale
    var colorScale = makeColorScale(csvData);

    // recolor enumeration units
    // select all enumeration units
    var cali_Counties = d3.selectAll(".counties")
      // add in transition before any parameters are assigned
      .transition()
      // specify a duration (1000 milliseconds = 1 second)
      .duration(1000)
      // recolor based on the expressed attribute
      .style("fill", function(d){
        var value = d.properties[expressed];
        if(value) {
          return colorScale(value);
        } else {
          return "#ccc";
        }
      });

    // re-sort, re-size, and re-color bars
    // select all the bars
    var bars = d3.selectAll(".bar")
      // re-sort the bars
      .sort(function(a, b){
        return b[expressed]-a[expressed];
      })
      // add transition animation
      .transition()
      // add delay so that it appears bars are
      // consciously rearranging themselves
      .delay(function(d, i){
        return i * 20
      })
      // give each bar 1/2 second to complete transition
      .duration(500);

    // re-set bar positions, heights, and colors
    // note that transition is passed with the bars selection
    updateChart(bars, csvData.length, colorScale);

  };

  // *************************************************** //
  // function to position, size, and color bars in chart
  function updateChart(bars, n, colorScale) {
    // set/reset x position based on number of rows in csv
    bars.attr("x", function(d, i){
          return i * (chartInnerWidth / n) + leftPadding;
        })
        // set/reset height attribute
        .attr("height", function(d, i){
          return 270 - yScale(parseFloat(d[expressed]));
        })
        // set/reset y position of each bar
        .attr("y", function(d, i){
          return yScale(parseFloat(d[expressed])) + topBottomPadding;
        })
        // color/recolor bars
        .style("fill", function(d){
          var value = d[expressed];
          if(value) {
            return colorScale(value);
          } else {
            return "#ccc";
          }
        });

    // set/reset text of chart title
    var chartTitle = d3.select(".chartTitle")
      .text("Percent of total water use by county: " + expressed.substr(4,expressed.length)); //.toLowerCase()
  };

  // *************************************************** //
  // function to highlight enumeration units and bars
  // function highlight(class_name){
  function highlight(props){
    // change stroke
    // select all elements with county-specific classes (enumeration units and bars)
    var selected = d3.selectAll("." + props.NAMELSAD.replace(/\s+/g,''))
      // bring selected element to front
      .raise()
      // change stroke and stroke-width
      .style("stroke", "black")
      .style("stroke-width", "2");

    // trigger label
    setLabel(props);

    // trigger PC label
    setLabelPC(props);
  };

  // *************************************************** //
  function dehighlight(props){
    // select all elements with county-specific classes (enumeration units and bars)
    var selected = d3.selectAll("." + props.NAMELSAD.replace(/\s+/g,''))
      // restyle the stroke (i.e. unhighlight)
      .style("stroke", function(){
        // pass current element in DOM to the getStyle function
        return getStyle(this, "stroke")
      })
      // restyle the strike width (i.e. unhighlight)
      .style("stroke-width", function(){
        // pass current element in DOM to the getStyle function
        return getStyle(this, "stroke-width")
      });

    // get the original style for the elements
    function getStyle(element, styleName){
      // retrieve the desc content
      var styleText = d3.select(element)
        // select desc element
        .select("desc")
        // return the text content
        .text();

      // parse the retrieved string to create a json object
      var styleObject = JSON.parse(styleText);

      // return the value of the correct style property
      return styleObject[styleName];
    };

    // clear label
    d3.select(".infolabel")
      .remove();

    // clear PC label
    d3.select(".infolabelPC")
      .remove();

    // bring PC axes back to front
    d3.select(".axisPC")
      .raise()
  };

  // *************************************************** //
  // function to create dynamic label
  function setLabel(props){
    // label content
    var labelAttribute = "<h1>" + (Math.round(props[expressed]*10) / 10) + "%</h1>";

    // create info label div
    var infolabel = d3.select("body")
      // append the div to the body
      .append("div")
      // add a class for styling
      .attr("class", "infolabel")
      // add a county-specific id
      .attr("id", props.NAMELSAD + "_label")
      // feed in the attribute string
      .html(labelAttribute);

    // append percentage
    var placeName = infolabel.append("div")
      .attr("class", "placeName")
      .html(props.NAMELSAD);

  };

  // *************************************************** //
  // function to move info label with mouse
  function moveLabel(){
    // get width of label
    // select the label
    var labelWidth = d3.select(".infolabel")
      // get its DOM node
      .node()
      // return an object the size of the label
      .getBoundingClientRect()
      // access its width
      .width;

    // retrieve coordinates of the mousemove event
    // adjust to set label above and to the right of the mouse
    var x1 = d3.event.clientX + 5, // was 10
        y1 = d3.event.clientY - 48; // was 75
        // set backup x coordinate (to shift to left when label approaches right side of page)
        x2 = d3.event.clientX - labelWidth - 5,
        // set backup y coordinate (to shift down when label approached top of page)
        y2 = d3.event.clientY + 48;

    // horizontal label coordinate, testing for overflow
    var x = d3.event.clientX > window.innerWidth - labelWidth - 20 ? x2: x1;

    // vertical label coordinate, testing for overflow
    var y = d3.event.clientY < 75 ? y2: y1;

    // use adjusted coordinates to set label coordinates
    d3.select(".infolabel")
      .style("left", x + "px")
      .style("top", y + "px");
  };

  // *************************************************** //
  function createParallelChart(csvData) {
    // append the svg object to the body of the page
    var pChart = d3.select("body")
      .append("svg")
        .attr("width", chartWidth + 15)
        .attr("height", chartHeight)
        .attr("class", "parallelChart")
      .append("g")
        .attr("transform", translate);

    // extract the list of dimensions for the plot
    dimensions = d3.keys(csvData[0]).filter(function(d) { return d != "NAMELSAD" });
    // check dimensions
    console.log(dimensions);

    // for each dimension, build a linear scale and store in a yPC object
    var yPC = {}
    for (i in dimensions) {
      name = dimensions[i]
      yPC[name] = d3.scaleLinear()
        .domain( d3.extent(csvData, function(d) { return +d[name]; }))
        .range([chartInnerHeight, 0])
    }

    // build the X scale and find the best position for each y axis
    xPC = d3.scalePoint()
      .range([0, chartInnerWidth + 15])
      .padding(0.35)
      .domain(dimensions);

    // the path function takes a row of the csv as input,
    // and returns x and y coordinates of the line to draw for this row
    function path(d) {
      return d3.line()(dimensions.map(function(p) { return [xPC(p), yPC[p](d[p])]; }));
    }

    // draw the lines
    var lines = pChart.selectAll("myPath")
      .data(csvData)
      .enter()
      .append("path")
        // assign class based on county name associated with element data
        .attr("class", function(d) { return "line " + d.NAMELSAD.replace(/\s+/g,'') })
        .attr("d", path)
        .style("fill", "none")
        .style("stroke", "#c2c2c2")
        .style("stroke-width", 0.5)
        .style("opacity", 1)
        // highlight on mouseover
        .on("mouseover", highlight)
        // de-hightlight on mouse off
        .on("mouseout", dehighlight)
        // add labels on mouse move
        .on("mousemove", moveLabelPC);

    // add style descriptor to each path (for dehighlighting)
    var desc = lines.append("desc")
      .text('{"stroke": "#c2c2c2", "stroke-width": "0.5px"}')

    // draw the axes
    pChart.selectAll("myAxis")
      // for each dimension of the dataset add a 'g' element:
      .data(dimensions).enter()
      .append("g")
      .attr("class", "axisPC")
      // translate this element to its right position on the x axis
      .attr("transform", function(d) { return "translate(" + xPC(d) + ")"; })
      // build the axis with the call function
      .each(function(d) { d3.select(this).call(d3.axisLeft().scale(yPC[d])); })
      // Add axis title
      .append("text")
        .style("text-anchor", "middle")
        .attr("y", -9)
        .text(function(d) { return d.substr(4,d.length); })
        .style("fill", "black");

  };

  // *************************************************** //
  // function to create dynamic label
  function setLabelPC(props){
    // label content
    var labelAttribute = "<h1>" + (Math.round(props[expressed]*10) / 10) + "%</h1>";

    // create info label div
    var infolabelPC = d3.select("body")
      // append the div to the body
      .append("div")
      // add a class for styling
      .attr("class", "infolabelPC")
      // add a county-specific id
      .attr("id", props.NAMELSAD + "_label")
      // feed in the attribute string
      .html(props.NAMELSAD);

  };

  // *************************************************** //
  // function to move info label with mouse
  function moveLabelPC(){
    // get width of label
    // select the label
    var labelWidth = d3.select(".infolabelPC")
      // get its DOM node
      .node()
      // return an object the size of the label
      .getBoundingClientRect()
      // access its width
      .width;

    // retrieve coordinates of the mousemove event
    // adjust to set label above and to the right of the mouse
    var x1 = d3.event.clientX + 3, // was 10
        y1 = d3.event.clientY - 18; // was 75
        // set backup x coordinate (to shift to left when label approaches right side of page)
        x2 = d3.event.clientX - labelWidth - 3,
        // set backup y coordinate (to shift down when label approached top of page)
        y2 = d3.event.clientY + 18;

    // horizontal label coordinate, testing for overflow
    var x = d3.event.clientX > window.innerWidth - labelWidth - 20 ? x2: x1;

    // vertical label coordinate, testing for overflow
    var y = d3.event.clientY < 75 ? y2: y1;

    // use adjusted coordinates to set label coordinates
    d3.select(".infolabelPC")
      .style("left", x + "px")
      .style("top", y + "px");
  };

  // *************************************************** //
  function addMetadata(){
    // write text
    // Add sources
    var sources_text = '<h6 id = "Sources">'
    sources_text += '<br><br><b>Data source:</b>'
    sources_text += '<br>USGS: <a target="_blank" href = "https://waterdata.usgs.gov/ca/nwis/water_use/">Water Use Data for California</a>'
    sources_text += '<br><i>Note: Percentages for each county were calculated from the total water use for each county. Data were not available for the following uses: commercial, hydroelectric power, and wastewater treatment.</i></a>'
    sources_text += '</h6>'

    // append div with metadata
    var dataSpace = d3.select("body")
      .append("div")
      .attr("x", 30)
      .attr("height", 30)
      .attr("width", chartWidth + 15)
      .attr("height", 30)
      .attr("class", "metadataBox")
      .append("html")
        .html(sources_text);

  };


})();
