// Function to draw the streamgraph visualization
// Purpose is to show the distribution of customer risk categories across credit score ranges
function draw_streamgraph(data, svgEl) {

    // Read dimensions from the card container instead of global width/height
    const container = svgEl.parentElement;
    const W = container.clientWidth;
    const H = container.clientHeight;

    // Select this chart's own SVG (not a global svg) and clear it before redrawing
    const svg = d3.select(svgEl)
        .attr("viewBox", `0 0 ${W} ${H}`);

    svg.selectAll("*").remove();

    // Set up margins — uses card size instead of fixed coords
    const margin = { top: 46, right: 16, bottom: 40, left: 16 };

    const width = W - margin.left - margin.right;
    const height = H - margin.top - margin.bottom;

    // Main chart group
    const g = svg.append("g")
        .attr(
            "transform",
            `translate(${margin.left}, ${margin.top})`
        );

    // Risk categories represented in the streamgraph
    const categories = [
        "High Risk",
        "Medium Risk",
        "Low Risk"
    ];

    // Color scale for each risk category using the shared palette (High->red, Medium->yellow, Low->green)
    const color = d3.scaleOrdinal()
        .domain(categories)
        .range([window.palette[2], window.palette[1], window.palette[0]]);

    // Credit score ranges used for binning customers
    const scoreRanges = [
        300, 350, 400, 450, 500, 550,
        600, 650, 700, 750, 800
    ];

    // Initialize bins
    const streamData = scoreRanges.map(function (score, i) {
        const end = scoreRanges[i + 1] ? scoreRanges[i + 1] - 1 : 850;

        return {
            range: score + "-" + end,
            "High Risk": 0,
            "Medium Risk": 0,
            "Low Risk": 0
        };
    });

    // Count customers in each score range and risk category
    data.forEach(function (d) {

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

    // Calculate totals so we can show percentages in the tooltip
    streamData.forEach(function (d) {
        d.total = d["High Risk"] + d["Medium Risk"] + d["Low Risk"];
    });

    // Chart title
    g.append("text")
        .attr("x", width / 2)
        .attr("y", -28)
        .attr("text-anchor", "middle")
        .attr("font-family", "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif")
        .attr("font-size", "13px")
        .attr("font-weight", "500")
        .attr("fill", "#1a1e2e")
        .text("How does risk vary across credit scores?");

    // Subtitle
    g.append("text")
        .attr("x", width / 2)
        .attr("y", -8)
        .attr("text-anchor", "middle")
        .attr("font-size", "10px")
        .attr("fill", "#9aa0b0")
        .text("Credit score vs. Debt-to-Income Ratio, colored by purchase tier");

    // Legend placed bottom-right inside the chart
    const legendWidth = 140;
    const legendHeight = categories.length * 16 + 14;
    const legendX = Math.max(0, width - legendWidth + 60);
    const legendY = Math.max(0, height - legendHeight);
    const legend = g.append("g").attr("class", "stream-legend").attr("transform", `translate(${legendX}, ${legendY})`);

    // Legend title
    legend.append("text")
        .attr("x", -10)
        .attr("y", -6)
        .attr("font-size", "12px")
        .attr("font-weight", 600)
        .attr("fill", "#5a6070")
        .text("Risk Score");

    categories.forEach(function (category, i) {
        const ly = i * 16;
        legend.append("rect")
            .attr("x", 0)
            .attr("y", ly)
            .attr("width", 10)
            .attr("height", 10)
            .attr("rx", 2)
            .attr("fill", color(category))
            .attr("opacity", 0.85);

        legend.append("text")
            .attr("x", 14)
            .attr("y", ly + 9)
            .attr("font-size", "11px")
            .attr("fill", "#5a6070")
            .text(category);
    });

    // Convert data into stacked layers for the streamgraph
    const stack = d3.stack()
        .keys(categories)
        .offset(d3.stackOffsetWiggle);

    const stackedData = stack(streamData);

    // X scale for score ranges
    const x = d3.scalePoint()
        .domain(streamData.map(function (d) {
            return d.range;
        }))
        .range([0, width])
        .padding(0.2);

    // Determine vertical bounds
    const yMin = d3.min(stackedData, function (layer) {
        return d3.min(layer, function (d) {
            return d[0];
        });
    });

    const yMax = d3.max(stackedData, function (layer) {
        return d3.max(layer, function (d) {
            return d[1];
        });
    });

    const y = d3.scaleLinear()
        .domain([yMin, yMax])
        .range([height, 0]);

    // Area generator for stream layers
    const area = d3.area()
        .x(function (d) {
            return x(d.data.range);
        })
        .y0(function (d) {
            return y(d[0]);
        })
        .y1(function (d) {
            return y(d[1]);
        })
        .curve(d3.curveBasis);

    // Flat area used for the entry animation
    const areaFlat = d3.area()
        .x(function (d) {
            return x(d.data.range);
        })
        .y0(height / 2)
        .y1(height / 2)
        .curve(d3.curveBasis);

    // streamgraph layers
    const layers = g.selectAll(".stream-layer")
        .data(stackedData)
        .enter()
        .append("path")
        .attr("class", "stream-layer")
        .attr("d", areaFlat)
        .attr("fill", function (d) {
            return color(d.key);
        })
        .attr("opacity", 0)
        .attr("stroke", "white")
        .attr("stroke-width", 1.5);

    layers.transition()
        .delay(function (d, i) {
            return 80 + i * 120;
        })
        .duration(750)
        .ease(d3.easeCubicOut)
        .attr("d", area)
        .attr("opacity", 0.85);

    // Vertical crosshair shown on hover
    const crosshair = g.append("line")
        .attr("y1", 0)
        .attr("y2", height)
        .attr("stroke", "#1a1e2e")
        .attr("stroke-width", 1)
        .attr("stroke-dasharray", "3 3")
        .attr("opacity", 0)
        .attr("pointer-events", "none");

    // Hover regions for each credit score bucket
    const bucket_width = width / (scoreRanges.length - 1);

    g.selectAll(".sg-hover")
        .data(streamData)
        .enter()
        .append("rect")
        .attr("class", "sg-hover")
        .attr("x", function (d) {
            return x(d.range) - bucket_width / 2;
        })
        .attr("y", 0)
        .attr("width", bucket_width)
        .attr("height", height)
        .attr("fill", "transparent")
        .on("mouseover", function (event, d) {

            const cx = x(d.range);

            crosshair
                .attr("x1", cx)
                .attr("x2", cx)
                .transition()
                .duration(80)
                .attr("opacity", 1);

            const pct_high = d.total > 0 ? Math.round(d["High Risk"] / d.total * 100) : 0;
            const pct_medium = d.total > 0 ? Math.round(d["Medium Risk"] / d.total * 100) : 0;
            const pct_low = d.total > 0 ? Math.round(d["Low Risk"] / d.total * 100) : 0;

            const dot_high = `<span style="display:inline-block;width:8px;height:8px;border-radius:2px;background:${window.palette[2]};margin-right:5px;"></span>`;
            const dot_medium = `<span style="display:inline-block;width:8px;height:8px;border-radius:2px;background:${window.palette[1]};margin-right:5px;"></span>`;
            const dot_low = `<span style="display:inline-block;width:8px;height:8px;border-radius:2px;background:${window.palette[0]};margin-right:5px;"></span>`;

            showTooltip(event,
                `<strong>${d.range}</strong> credit score<br>` +
                `<span style="color:#9aa0b0;font-size:10px">${d.total.toLocaleString()} customers</span><br>` +
                dot_high + `High Risk <strong>${d["High Risk"].toLocaleString()}</strong> (${pct_high}%)<br>` +
                dot_medium + `Medium Risk <strong>${d["Medium Risk"].toLocaleString()}</strong> (${pct_medium}%)<br>` +
                dot_low + `Low Risk <strong>${d["Low Risk"].toLocaleString()}</strong> (${pct_low}%)`
            );
        })
        .on("mousemove", moveTooltip)
        .on("mouseout", function () {

            crosshair
                .transition()
                .duration(150)
                .attr("opacity", 0);

            hideTooltip();
        });

    // X-axis
    g.append("g")
        .attr("transform", `translate(0, ${height})`)
        .call(
            d3.axisBottom(x)
                .tickFormat(function (d) {
                    return d.split("-")[0];
                })
                .tickSize(0)
        )
        .call(function (axis) {
            axis.select(".domain").attr("stroke", "#e8eaee");
        })
        .selectAll("text")
        .attr("dy", "1.2em")
        .attr("font-size", "10px")
        .attr("fill", "#9aa0b0");

    // X-axis label
    g.append("text")
        .attr("x", width / 2)
        .attr("y", height + 32)
        .attr("text-anchor", "middle")
        .attr("font-size", "11px")
        .attr("fill", "#9aa0b0")
        .text("Credit Score");
}