document.addEventListener('DOMContentLoaded', function () {
  console.log("Script loaded and running.");

  // Initialize page
  showHome();

  fetch("data/climate_change_indicators.csv")
      .then(response => response.text())
      .then(text => {
          const data = d3.csvParse(text);
          populateCountrySelect(data);
      })
      .catch(error => {
          console.error("Error fetching the CSV file:", error);
          d3.select("#content").text("Error loading the data.").style("color", "red");
      });

  fetch("data/GlobalLandTemperaturesByMajorCity2.csv")
      .then(response => response.text())
      .then(text => {
          const data = d3.csvParse(text);
          populateCitySelect(data);
      })
      .catch(error => {
          console.error("Error fetching the CSV file:", error);
          d3.select("#content").text("Error loading the data.").style("color", "red");
      });

  // country selection
  document.getElementById('country-select').addEventListener('change', function () {
      const country = this.value;
      fetch("data/climate_change_indicators.csv")
          .then(response => response.text())
          .then(text => {
              const data = d3.csvParse(text);
              const filteredData = data.filter(d => d.Country === country);
              renderChart(filteredData);
          })
          .catch(error => {
              console.error("Error fetching the CSV file:", error);
              d3.select("#chart-container").text("Error loading the data.").style("color", "red");
          });
  });

  // city selection
  document.getElementById('city-select').addEventListener('change', function () {
      const city = this.value;
      fetch("data/GlobalLandTemperaturesByMajorCity2.csv")
          .then(response => response.text())
          .then(text => {
              const data = d3.csvParse(text);
              const filteredData = data.filter(d => d.City === city);
              renderCityChart(filteredData);
          })
          .catch(error => {
              console.error("Error fetching the CSV file:", error);
              d3.select("#city-chart-container").text("Error loading the data.").style("color", "red");
          });
  });
});

function showHome() {
  document.getElementById('home').style.display = 'block';
  document.getElementById('chart').style.display = 'none';
  document.getElementById('city-chart').style.display = 'none';
}

function showChart() {
  document.getElementById('home').style.display = 'none';
  document.getElementById('chart').style.display = 'block';
  document.getElementById('city-chart').style.display = 'none';
}

function showCityChart() {
  document.getElementById('home').style.display = 'none';
  document.getElementById('chart').style.display = 'none';
  document.getElementById('city-chart').style.display = 'block';
}

function populateCountrySelect(data) {
  const countries = Array.from(new Set(data.map(d => d.Country)));
  const select = document.getElementById('country-select');
  countries.forEach(country => {
      const option = document.createElement('option');
      option.value = country;
      option.textContent = country;
      select.appendChild(option);
  });
}

function populateCitySelect(data) {
  const cities = Array.from(new Set(data.map(d => d.City)));
  const select = document.getElementById('city-select');
  cities.forEach(city => {
      const option = document.createElement('option');
      option.value = city;
      option.textContent = city;
      select.appendChild(option);
  });
}

function renderChart(data) {
  d3.select("#chart-container").select("svg").remove();

  d3.select(".tooltip").remove();

  const formattedData = data.map(d => {
      return Object.keys(d).filter(key => key.startsWith('F')).map(year => {
          return {
              year: new Date(year.slice(1)),
              temperature: parseFloat(d[year])
          };
      });
  }).flat();

  const margin = { top: 20, right: 30, bottom: 50, left: 60 },
      width = 800 - margin.left - margin.right,
      height = 400 - margin.top - margin.bottom;

  const svg = d3.select("#chart-container")
      .append("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

  // X axis
  const x = d3.scaleTime()
      .domain(d3.extent(formattedData, d => d.year))
      .range([0, width]);
  svg.append("g")
      .attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(x).tickFormat(d3.timeFormat("%Y")));

  // Y axis
  const y = d3.scaleLinear()
      .domain([d3.min(formattedData, d => d.temperature), d3.max(formattedData, d => d.temperature)])
      .range([height, 0]);
  svg.append("g")
      .call(d3.axisLeft(y).tickFormat(d => d + "°C"));

  // Y axis label
  svg.append("text")
      .attr("text-anchor", "middle")
      .attr("transform", `translate(${-margin.left + 15}, ${height / 2}) rotate(-90)`)
      .style("font-size", "14px")
      .text("Temperature Change (°C)");

  // X axis label
  svg.append("text")
      .attr("text-anchor", "middle")
      .attr("x", width / 2)
      .attr("y", height + margin.bottom)
      .style("font-size", "14px")
      .text("Years");

  // line
  svg.append("path")
      .datum(formattedData)
      .attr("fill", "none")
      .attr("stroke", "steelblue")
      .attr("stroke-width", 1.5)
      .attr("d", d3.line()
          .defined(d => !isNaN(d.temperature))
          .x(d => x(d.year))
          .y(d => y(d.temperature))
      );

  // points to the line
  const points = svg.selectAll("dot")
      .data(formattedData.filter(d => !isNaN(d.temperature)))
      .enter()
      .append("circle")
      .attr("r", 3)
      .attr("cx", d => x(d.year))
      .attr("cy", d => y(d.temperature))
      .attr("fill", "steelblue");

  // highest temperature change
  const maxTemp = d3.max(formattedData, d => d.temperature);
  const maxTempPoint = formattedData.find(d => d.temperature === maxTemp);

  svg.append("circle")
      .attr("r", 5)
      .attr("cx", x(maxTempPoint.year))
      .attr("cy", y(maxTempPoint.temperature))
      .attr("fill", "red");

  // annotation
  const annotation = [
      {
          note: {
              label: `${maxTempPoint.temperature}°C`,
              title: "Highest Temperature Change",
              wrap: 100
          },
          x: x(maxTempPoint.year),
          y: y(maxTempPoint.temperature),
          dy: 200,
          dx: -20
      }
  ];

  const makeAnnotations = d3.annotation()
      .type(d3.annotationLabel)
      .annotations(annotation);

  svg.append("g")
      .call(makeAnnotations);

  // tooltip
  const tooltip = d3.select("body").append("div")
      .attr("class", "tooltip")
      .style("opacity", 0);

  points.on("mouseover", function (event, d) {
      tooltip.transition()
          .duration(200)
          .style("opacity", .9);
      tooltip.html(`Year: ${d.year.getFullYear()}<br>Temp: ${d.temperature}°C`)
          .style("left", (event.pageX - 10) + "px") // Adjusted to center horizontally
          .style("top", (event.pageY - 10) + "px"); // Adjusted to move up vertically
  }).on("mouseout", function () {
      tooltip.transition()
          .duration(500)
          .style("opacity", 0);
  });
}

function renderCityChart(data) {
  d3.select("#city-chart-container").select("svg").remove();

  d3.select(".tooltip").remove();

  const margin = { top: 20, right: 30, bottom: 50, left: 60 },
      width = 800 - margin.left - margin.right,
      height = 400 - margin.top - margin.bottom;

  const formattedData = data.map(d => ({
    year: new Date(d.Year),
    temperature: parseFloat(d.TemperatureChange)
  }));

  const svg = d3.select("#city-chart-container")
      .append("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

  // X axis
  const x = d3.scaleTime()
      .domain(d3.extent(formattedData, d => d.year))
      .range([0, width]);
  svg.append("g")
      .attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(x).tickFormat(d3.timeFormat("%Y")));

  // Y axis
  const y = d3.scaleLinear()
      .domain([d3.min(formattedData, d => d.temperature), d3.max(formattedData, d => d.temperature)])
      .range([height, 0]);
  svg.append("g")
      .call(d3.axisLeft(y).tickFormat(d => d + "°C"));

  // Y axis label
  svg.append("text")
      .attr("text-anchor", "middle")
      .attr("transform", `translate(${-margin.left + 15}, ${height / 2}) rotate(-90)`)
      .style("font-size", "14px")
      .text("Temperature Change (°C)");

  // X axis label
  svg.append("text")
      .attr("text-anchor", "middle")
      .attr("x", width / 2)
      .attr("y", height + margin.bottom)
      .style("font-size", "14px")
      .text("Years");

  // line
  svg.append("path")
      .datum(formattedData)
      .attr("fill", "none")
      .attr("stroke", "steelblue")
      .attr("stroke-width", 1.5)
      .attr("d", d3.line()
          .defined(d => !isNaN(d.temperature))
          .x(d => x(d.year))
          .y(d => y(d.temperature))
      );

  // points to the line
  const points = svg.selectAll("dot")
      .data(formattedData.filter(d => !isNaN(d.temperature)))
      .enter()
      .append("circle")
      .attr("r", 3)
      .attr("cx", d => x(d.year))
      .attr("cy", d => y(d.temperature))
      .attr("fill", "steelblue");

  // highest temperature change
  const maxTemp = d3.max(formattedData, d => d.temperature);
  const maxTempPoint = formattedData.find(d => d.temperature === maxTemp);

  svg.append("circle")
      .attr("r", 5)
      .attr("cx", x(maxTempPoint.year))
      .attr("cy", y(maxTempPoint.temperature))
      .attr("fill", "red");

  // annotation
  const annotation = [
      {
          note: {
              label: `${maxTempPoint.temperature.toFixed(3)}°C`,
              title: "Highest Temperature Change",
              wrap: 100
          },
          x: x(maxTempPoint.year),
          y: y(maxTempPoint.temperature),
          dy: 200,
          dx: -20
      }
  ];

  const makeAnnotations = d3.annotation()
      .type(d3.annotationLabel)
      .annotations(annotation);

  svg.append("g")
      .call(makeAnnotations);

  // tooltip
  const tooltip = d3.select("body").append("div")
      .attr("class", "tooltip")
      .style("opacity", 0);

  points.on("mouseover", function (event, d) {
      tooltip.transition()
          .duration(200)
          .style("opacity", .9);
      tooltip.html(`Year: ${d.year.getFullYear()}<br>Temp: ${d.temperature.toFixed(3)}°C`)
          .style("left", (event.pageX - 10) + "px")
          .style("top", (event.pageY - 10) + "px");
  }).on("mouseout", function () {
      tooltip.transition()
          .duration(500)
          .style("opacity", 0);
  });
}
