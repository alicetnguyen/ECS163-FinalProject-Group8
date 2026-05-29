// Function to draw the streamgraph visualization
// Purpose is to show the distribution of customer risk categories across credit score ranges
function draw_streamgraph(data) {

    // Position and size of the streamgraph
    const chartX = 800;
    const chartY = 500;
    const chartWidth = 700;
    const chartHeight = 400;

    const margin = { top: 70, right: 20, bottom: 55,left: 20 };

    const width = chartWidth - margin.left - margin.right;
    const height = chartHeight - margin.top - margin.bottom;

    // Main chart group
    const g = svg.append("g")
        .attr(
            "transform",
            `translate(${chartX + margin.left}, ${chartY + margin.top})`
        );

    // Risk categories represented in the streamgraph
    const categories = [
        "High Risk",
        "Medium Risk",
        "Low Risk"
    ];

    // Color scale for each risk category
    const color = d3.scaleOrdinal()
        .domain(categories)
        .range([
            "#2b8cbe",
            "#74a9cf",
            "#d4eeff"
        ]);

    // Credit score ranges used for binning customers
    const scoreRanges = [
        300, 350, 400, 450, 500, 550,
        600, 650, 700, 750, 800
    ];

    // Initialize bins
    const streamData = scoreRanges.map(function(score, i) {
        const end = scoreRanges[i + 1] ? scoreRanges[i + 1] - 1 : 850;

        return {
            range: score + "-" + end,
            "High Risk": 0,
            "Medium Risk": 0,
            "Low Risk": 0
        };
    });

    // Count customers in each score range and risk category
    data.forEach(function(d) {

        const score = +d.credit_score;
        const risk = d.customer_segment;

        for (let i = 0; i < scoreRanges.length; i++) {

            const start = scoreRanges[i];
            const end = scoreRanges[i + 1] || 851;

            if (score >= start && score < end) {

                if (streamData[i][risk] !== undefined) {
                    streamData[i][risk]++;
                }

                break;
            }
        }
    });

    // Chart title
    g.append("text")
        .attr("x", width / 2)
        .attr("y", -40)
        .attr("text-anchor", "middle")
        .attr("font-size", "20px")
        .attr("font-weight", "bold")
        .text("How does risk level vary across credit scores?");

    // Chart subtitle
    g.append("text")
        .attr("x", width / 2)
        .attr("y", -15)
        .attr("text-anchor", "middle")
        .attr("font-size", "16px")
        .text("Distribution of customer risk categories across credit score ranges");

    // Convert data into stacked layers for the streamgraph
    const stack = d3.stack()
        .keys(categories)
        .offset(d3.stackOffsetWiggle);

    const stackedData = stack(streamData);

    // X scale for score ranges
    const x = d3.scalePoint()
        .domain(streamData.map(function(d) {
            return d.range;
        }))
        .range([0, width])
        .padding(0.2);

    // Determine vertical bounds
    const yMin = d3.min(stackedData, function(layer) {
        return d3.min(layer, function(d) {
            return d[0];
        });
    });

    const yMax = d3.max(stackedData, function(layer) {
        return d3.max(layer, function(d) {
            return d[1];
        });
    });

    const y = d3.scaleLinear()
        .domain([yMin, yMax])
        .range([height, 0]);

    // Area generator for stream layers
    const area = d3.area()
        .x(function(d) {
            return x(d.data.range);
        })
        .y0(function(d) {
            return y(d[0]);
        })
        .y1(function(d) {
            return y(d[1]);
        })
        .curve(d3.curveBasis);

    // streamgraph layers
    g.selectAll(".stream-layer")
        .data(stackedData)
        .enter()
        .append("path")
        .attr("class", "stream-layer")
        .attr("d", area)
        .attr("fill", function(d) {
            return color(d.key);
        })
        .attr("opacity", 0.85)
        .attr("stroke", "white")
        .attr("stroke-width", 1.5);

    // X-axis
    g.append("g")
        .attr("transform", `translate(0, ${height})`)
        .call(
            d3.axisBottom(x)
                .tickFormat(function(d) {
                    return d.split("-")[0];
                })
        );

    // X-axis label
    g.append("text")
        .attr("x", width / 2)
        .attr("y", height + 45)
        .attr("text-anchor", "middle")
        .attr("font-size", "15px")
        .text("Credit Score");

    // Legend for risk categories
    const legend = g.append("g")
    .attr("transform", `translate(${width - 140}, -10)`);

    categories.forEach(function(category, i) {

        legend.append("rect")
            .attr("x", 0)
            .attr("y", i * 25)
            .attr("width", 14)
            .attr("height", 14)
            .attr("fill", color(category));

        legend.append("text")
            .attr("x", 22)
            .attr("y", i * 25 + 12)
            .attr("font-size", "12px")
            .text(category);
    });
}