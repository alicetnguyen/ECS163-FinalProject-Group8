// Function to draw the scatterplot visualization
// Purpose is to show the relationship between credit score and debt to income ratios where each point represents one customer
function draw_scatterplot(data) {

    // Set up margins and dimensions
    const margin = {top: 120, right: 40, bottom: 70, left: 70};

    const chart_width = width / 2 - margin.left - margin.right;
    const chart_height = 200;

    // Create a group element for the scatterplot and place in the top right quadrant
    const g = svg.append("g")
        .attr("transform", `translate(${width / 2 + margin.left}, ${margin.top + 55})`);

    // Main title
    g.append("text")
        .attr("x", chart_width / 2)
        .attr("y", -50)
        .attr("text-anchor", "middle")
        .attr("font-size", "20px")
        .attr("font-weight", "bold")
        .text("Who tends to make the largest BNPL purchases?");

    // Subtitle
    g.append("text")
        .attr("x", chart_width / 2)
        .attr("y", -25)
        .attr("text-anchor", "middle")
        .attr("font-size", "16px")
        .text("Credit score vs. Debt-to-Income Ratio, colored by purchase tier");

    // Purchase tier order must match the preprocessing labels in main.js
    const purchase_tiers = [
        "Low (< $1K)",
        "Medium ($1K – $2.5K)",
        "High ($2.5K – $4K)",
        "Very High (> $4K)"
    ];

    // d3 function to scale the colors for the purchase amounts 
    const color = d3.scaleOrdinal()
        .domain(purchase_tiers)
        .range(["#d4eeff", "#74a9cf", "#2b8cbe", "#045a8d"]);

    // d3 function to scale the axes 
    const x = d3.scaleLinear()
        .domain(d3.extent(data, function(d) {
            return d.credit_score;
        }))
        .range([0, chart_width])
        .nice();

    const y = d3.scaleLinear()
        .domain(d3.extent(data, function(d) {
            return d.debt_to_income_ratio;
        }))
        .range([chart_height, 0])
        .nice();

    // Draw axes and points for each BNPL transaction/customer
    g.append("g")
        .attr("transform", `translate(0, ${chart_height})`)
        .call(d3.axisBottom(x));

    g.append("g")
        .call(d3.axisLeft(y));

    g.selectAll(".scatter-point")
        .data(data)
        .enter()
        .append("circle")
        .attr("class", "scatter-point")
        .attr("cx", function(d) {
            return x(d.credit_score);
        })
        .attr("cy", function(d) {
            return y(d.debt_to_income_ratio);
        })
        .attr("r", 2)
        .attr("fill", function(d) {
            return color(d.purchase_tier);
        })
        .attr("opacity", 0.45);

    // Add labels for the axes
    g.append("text")
        .attr("x", chart_width / 2)
        .attr("y", chart_height + 50)
        .attr("text-anchor", "middle")
        .attr("font-size", "15px")
        .text("Credit Score");

    g.append("text")
        .attr("transform", "rotate(-90)")
        .attr("x", -chart_height / 2)
        .attr("y", -50)
        .attr("text-anchor", "middle")
        .attr("font-size", "15px")
        .text("Debt-to-Income Ratio");

    // Create a legend for the color categories of the points 
    // Horizontal legend below the scatterplot
    const legend = g.append("g")
        .attr(
            "transform",
            `translate(${chart_width / 2 - 325}, ${chart_height + 85})`
        );

    legend.append("text")
        .attr("x", 0)
        .attr("y", 0)
        .attr("font-size", "13px")
        .attr("font-weight", "bold")
        .text("Purchase Tier:");

    legend.selectAll(".legend-circle")
        .data(purchase_tiers)
        .enter()
        .append("circle")
        .attr("cx", function(d, i) {
            return 110 + i * 140;
        })
        .attr("cy", -4)
        .attr("r", 5)
        .attr("fill", function(d) {
            return color(d);
        });

    legend.selectAll(".legend-label")
        .data(purchase_tiers)
        .enter()
        .append("text")
        .attr("x", function(d, i) {
            return 122 + i * 140;
        })
        .attr("y", 0)
        .attr("font-size", "12px")
        .text(function(d) {
            return d;
        });
}