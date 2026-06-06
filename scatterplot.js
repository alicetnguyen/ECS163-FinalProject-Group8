// Function to draw the scatterplot visualization
// Purpose is to show the relationship between credit score and debt to income ratios where each point represents one customer
function draw_scatterplot(data, svgEl) {

    // Read dimensions from the card container instead of global width/height
    const container = svgEl.parentElement;
    const W = container.clientWidth;
    const H = container.clientHeight;

    // Select this chart's own SVG (not a global svg) and clear it before redrawing
    const svg = d3.select(svgEl)
        .attr("viewBox", `0 0 ${W} ${H}`);

    svg.selectAll("*").remove();

    // Set up margins and dimensions
    const margin = { top: 46, right: 16, bottom: 56, left: 48 };

    const chart_width = W - margin.left - margin.right;
    const chart_height = H - margin.top - margin.bottom;

    // Create a group element for the scatterplot
    const g = svg.append("g")
        .attr("transform", `translate(${margin.left}, ${margin.top})`);

    // Main title
    g.append("text")
        .attr("x", chart_width / 2)
        .attr("y", -22)
        .attr("text-anchor", "middle")
        .attr("font-family", "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif")
        .attr("font-size", "13px")
        .attr("font-weight", "500")
        .attr("fill", "#1a1e2e")
        .text("Who tends to make the largest BNPL purchases?");

    // Subtitle
    g.append("text")
        .attr("x", chart_width / 2)
        .attr("y", -8)
        .attr("text-anchor", "middle")
        .attr("font-size", "10px")
        .attr("fill", "#9aa0b0")
        .text("Credit score vs. Debt-to-Income Ratio, colored by purchase tier");

    // Purchase tier order must match the preprocessing labels in main.js
    const purchase_tiers = [
        "Low (< $1K)",
        "Medium ($1K – $2.5K)",
        "High ($2.5K – $4K)",
        "Very High (> $4K)"
    ];

    // Map purchase tiers to a clear green → yellow → orange → red progression
    const colorMap = {
        "Low (< $1K)": "#2ecc71",
        "Medium ($1K – $2.5K)": "#f1c40f",
        "High ($2.5K – $4K)": "#f28e2b",
        "Very High (> $4K)": "#e74c3c"
    };

    const color = function(tier) {
        return colorMap[tier];
    };

    // d3 function to scale the axes
    const x = d3.scaleLinear()
        .domain(d3.extent(data, function (d) {
            return d.credit_score;
        }))
        .range([0, chart_width])
        .nice();

    const y = d3.scaleLinear()
        .domain(d3.extent(data, function (d) {
            return d.debt_to_income_ratio;
        }))
        .range([chart_height, 0])
        .nice();

    // Draw axes and points for each BNPL transaction/customer
    g.append("g")
        .attr("transform", `translate(0, ${chart_height})`)
        .call(d3.axisBottom(x).ticks(5).tickSize(0))
        .call(function (axis) {
            axis.select(".domain").attr("stroke", "#e8eaee");
        })
        .selectAll("text")
        .attr("font-size", "10px")
        .attr("fill", "#9aa0b0");

    // add horizontal grid lines for better readability, using the same ticks as the y-axis
    g.append("g")
        .call(d3.axisLeft(y).ticks(4).tickSize(0))
        .call(function (axis) {
            axis.select(".domain").attr("stroke", "#e8eaee");
        })
        .selectAll("text")
        .attr("font-size", "10px")
        .attr("fill", "#9aa0b0");

    // Create the points for each customer, initially positioned at the bottom with 0 radius and opacity for animation
    const points = g.selectAll(".scatter-point")
        .data(data)
        .enter()
        .append("circle")
        .attr("class", "scatter-point")
        .attr("cx", function (d) {
            return x(d.credit_score);
        })
        .attr("cy", chart_height / 2)
        .attr("r", 0)
        .attr("fill", function (d) {
            return color(d.purchase_tier);
        })
        .attr("opacity", 0);

    // Points drop in from the centre with a random staggered delay
    points.transition()
        .delay(function () {
            return Math.random() * 320;
        })
        .duration(450)
        .ease(d3.easeCubicOut)
        .attr("cy", function (d) {
            return y(d.debt_to_income_ratio);
        })
        .attr("r", 2.5)
        .attr("opacity", 0.6);

    // Add hover behavior to the points to show more details about each customer in the tooltip
    points
        .on("mouseover", function (event, d) {

            d3.select(this).raise().attr("r", 5).attr("opacity", 1);

            showTooltip(event,
                `<strong>${d.purchase_tier}</strong><br>` +
                `Credit Score: ${d.credit_score}<br>` +
                `Debt-to-Income: ${d.debt_to_income_ratio.toFixed(2)}<br>` +
                `Purchase: $${Math.round(d.purchase_amount).toLocaleString()}`
            );
        })
        .on("mousemove", moveTooltip)
        .on("mouseout", function () {

            d3.select(this).attr("r", 2.5).attr("opacity", 0.6);

            hideTooltip();
        });

    // Add labels for the axes
    g.append("text")
        .attr("x", chart_width / 2)
        .attr("y", chart_height + 36)
        .attr("text-anchor", "middle")
        .attr("font-size", "11px")
        .attr("fill", "#9aa0b0")
        .text("Credit Score");

    // Y-axis label is rotated -90 degrees and positioned to the left of the axis
    g.append("text")
        .attr("transform", "rotate(-90)")
        .attr("x", -chart_height / 2)
        .attr("y", -36)
        .attr("text-anchor", "middle")
        .attr("font-size", "11px")
        .attr("fill", "#9aa0b0")
        .text("Debt-to-Income Ratio");

    // create legend for the color categories of the points
    // legend so it fits within the card width
    // top right like most legends
    const legendWidth = 140;
    // move slightly right and down to sit inside the card padding
    const legendX = Math.max(0, chart_width - legendWidth) + 10;
    const legendY = -7;
    const legend = g.append("g")
        .attr("class", "scatter-legend")
        .attr("transform", `translate(${legendX}, ${legendY})`);

    // legend title
    legend.append("text")
        .attr("x", 0)
        .attr("y", 0)
        .attr("font-size", "11px")
        .attr("font-weight", 600)
        .attr("fill", "#5a6070")
        .text("Purchase Tier");

    // vertical purchase tiers
    purchase_tiers.forEach(function (tier, i) {
        const ly = 12 + i * 18; // start below title
        legend.append("circle")
            .attr("cx", 0)
            .attr("cy", ly + 6)
            .attr("r", 5)
            .attr("fill", color(tier));

        legend.append("text")
            .attr("x", 12)
            .attr("y", ly + 10)
            .attr("font-size", "11px")
            .attr("fill", "#5a6070")
            .text(tier);
    });

    // Function to move the tooltip position based on mouse movement, with boundaries to prevent it from going off-screen
    const brush = d3.brush()
        .extent([[0, 0], [chart_width, chart_height]])
        .on("brush", function (event) {

            const sel = event.selection;
            if (!sel) return;

            // sel gives the pixel coordinates of the brush rectangle as [(x0, y0), (x1, y1)]
            const [[x0, y0], [x1, y1]] = sel;

            // Filter the data to find which points are within the brushed area
            const brushed = data.filter(function (d) {
                return x(d.credit_score) >= x0 && x(d.credit_score) <= x1
                    && y(d.debt_to_income_ratio) >= y0 && y(d.debt_to_income_ratio) <= y1;
            });

            // Highlight brushed points and fade out others
            points
                .attr("r", function (d) {
                    return x(d.credit_score) >= x0 && x(d.credit_score) <= x1
                        && y(d.debt_to_income_ratio) >= y0 && y(d.debt_to_income_ratio) <= y1
                        ? 2 : 1.5;
                })
                .attr("opacity", function (d) {
                    return x(d.credit_score) >= x0 && x(d.credit_score) <= x1
                        && y(d.debt_to_income_ratio) >= y0 && y(d.debt_to_income_ratio) <= y1
                        ? 1 : 0.08;
                });

            applyBrushFilter(brushed);
        })
        // when user clears (clicks on empty space), restore all points and tell other charts to go back to full dataset
        .on("end", function (event) {
            if (!event.selection) {
                points.attr("r", 2.5).attr("opacity", 0.6);
                applyBrushFilter(null);
            }
        });

    // attach the brush to the chart and style the selection rectangle
    g.append("g").call(brush)
        .select(".selection")
        .attr("fill", "#2b8cbe")
        .attr("fill-opacity", 0.08)
        .attr("stroke", "#2b8cbe")
        .attr("stroke-width", 1)
        .attr("stroke-dasharray", "4 3");
}