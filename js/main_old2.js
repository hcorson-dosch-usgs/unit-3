// Hayley Corson-Dosch javascript script

// Define pseudo-global variables
(function(){
  // *************************************************** //
  // pseudo-global variables
  // variables for data join
  var attrArray = ["TotalPop_K", "TotalWU_mgald", "Per_Municipal", "Per_Industrial", "Per_Mining", "Per_Livestock", "Per_Aquaculture", "Per_Irrigation", "Per_Irrig_Crops", "Per_Irrig_Golf", "Per_Thermo"];
  // initial attribute
  var expressed = attrArray[0];

  // begin script when window loads
  window.onload = setMap();

  // *************************************************** //
  // set up choropleth map
  function setMap(){
    // MAP, PROJECTION, PATH, and QUEUE BLOCKS
    // map frame dimensions
    var width = 960,
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

      // add enumeration units to the map
      setEnumerationUnits(caCounties, caState, unitedStates, map, path);
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
  function setEnumerationUnits(caCounties, caState, unitedStates, map, path){
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
      .attr("d", path);

    // add California to map
    var cali = map.append("path")
      // bind to the element to be created
      .datum(caState)
      // assign class for styling
      .attr("class", "state")
      // project California
      .attr("d", path);
  };

})();
