// Hayley Corson-Dosch javascript script

// Define pseudo-global variables
(function(){
  // *************************************************** //
  // pseudo-global variables
  // variables for data join
  var attrArray = ["Per_Municipal", "Per_Industrial", "Per_Mining", "Per_Livestock", "Per_Aquaculture", "Per_Irrigation", "Per_Irrig_Crops", "Per_Irrig_Golf", "Per_Thermo", "TotalPop_K", "TotalWU_mgald"];
  // initial attribute
  var expressed = attrArray[0];

  // begin script when window loads
  window.onload = setMap();

  // *************************************************** //
  // set up choropleth map
  function setMap(){
    // MAP, PROJECTION, PATH, and QUEUE BLOCKS
    // map frame dimensions
    var width = window.innerWidth * 0.5,
        height = 730;

    // create new svg container for the map
    var map = d3.select("body")
      .append("svg")
      .attr("class", "map")
      .attr("width", width)
      .attr("height", height);

    // create Albers equal area conic projection centered on california
    var projection = d3.geoAlbers()
      .center([0, 37.24667])
      .rotate([119.276, 0, 0])
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
      var csvKey = csvRegion.County_name;

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
      "#b30000"
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
        return "counties " + d.properties.NAMELSAD;
      })
      // project counties
      .attr("d", path)
      // add color fill based on colorScale function
      .style("fill", function(d){
        var value = d.properties[expressed];
        if(value){
          return colorScale(d.properties[expressed]);
        } else {
          return "#ccc";
      }
    });

    // add California to map
    var cali = map.append("path")
      // bind to the element to be created
      .datum(caState)
      // assign class for styling
      .attr("class", "state")
      // project California
      .attr("d", path);
  };

  // *************************************************** //
  function setChart(csvData, colorScale){
    //chart frame dimensions
    var chartWidth = window.innerWidth * 0.425,
        chartHeight = 460;

    // create a second svg element to hold the bar chart
    var chart = d3.select("body")
      .append("svg")
      .attr("width", chartWidth)
      .attr("height", chartHeight)
      .attr("y", 270)
      .attr("class", "chart");

    // create a scale to size bars proportionaly to frame
    var yScale = d3.scaleLinear()
      // set range of possible output values
      .range([0, chartHeight])
      // define range of input values
      .domain([0, 100]);

    // set bars for each province
    var bars = chart.selectAll(".bars") // make an empty selection
      // bind data to elements
      .data(csvData)
      // create each element
      .enter()
      // append a rectangle for each element
      .append("rect")
      // sort the data from smallest to largest
      .sort(function(a, b){
        return b[expressed]-a[expressed]
      })
      // assign a class to each element for styling
      .attr("class", function(d){
        return "bars " + d.County_name;
      })
      // set width based on number of rows in csv
      // subtract 1 pixel to ensure gap between bars
      .attr("width", chartWidth / csvData.length - 1)
      // set x position based on number of rows in csv
      .attr("x", function(d, i){
        return i * (chartWidth / csvData.length)
      })
      // set height attribute
      .attr("height", function(d){
        return yScale(parseFloat(d[expressed]));
      })
      // set y position of each bar
      .attr("y", function(d){
        return chartHeight - yScale(parseFloat(d[expressed]));
      })
      .style("fill", function(d){
        return colorScale(d[expressed]);
      });

    // annotate bars with attribute value text
    var numbers = chart.selectAll(".numbers")
      // bind the data to the elements
      .data(csvData)
      // create each element
      .enter()
      // append text for each element
      .append("text")
      // sort the attribute data from largest to smallest
      .sort(function(a, b){
        return b[expressed]-a[expressed]
      })
      // set the class for each element, for styling
      .attr("class", function(d){
        return "numbers " + d.County_name;
      })
      // set an anchor for the text
      .attr("text-anchor", "middle")
      // set the x position of the text
      .attr("x", function(d, i){
        var fraction = chartWidth / csvData.length;
        return i * fraction + (fraction - 1) / 2;
      })
      // set the y position of each text element
      .attr("y", function(d){
        if (Math.round(parseFloat(d[expressed])) < 3){
          return chartHeight - yScale(parseFloat(d[expressed])) - 5;
        } else if (Math.round(parseFloat(d[expressed])) >= 3) {
          return chartHeight - yScale(parseFloat(d[expressed])) + 10;
        }
      })
      // set contents of text strings
      .text(function(d){
        return Math.round(d[expressed]);
      });

    // Create a text element for the chart title
    var chartTitle = chart.append("text")
      .attr("x", 70)
      .attr("y", 40)
      .attr("class", "chartTitle")
      .text("Percent of " + expressed.substr(4,expressed.length).toLowerCase() + " water use in each county");

  };

})();
