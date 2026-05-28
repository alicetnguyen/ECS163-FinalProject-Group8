// Function to draw the heatmap visualization
// Purpose is to show what the different age groups are doing BNPL transactions on
function draw_heatmap(data) {

    // Set up margins and dimensions
    const margin = {top: 120, right: 40, bottom: 90, left: 100};

    const chart_width = width / 2 - margin.left - margin.right;
    const chart_height = 200;

    // Create group element for the heatmap and place it in the top-left quadrant
    const g = svg.append("g")
        .attr("transform", `translate(${margin.left}, ${margin.top + 55})`);

    // Main title
    g.append("text")
        .attr("x", chart_width / 2)
        .attr("y", -45)
        .attr("text-anchor", "middle")
        .attr("font-size", "20px")
        .attr("font-weight", "bold")
        .text("How are different age groups using BNPL for?");

    // Subtitle
    g.append("text")
        .attr("x", chart_width / 2)
        .attr("y", -20)
        .attr("text-anchor", "middle")
        .attr("font-size", "16px")
        .text("Average purchase amount by age group and product category");

    // Age group order should match preprocessing in main.js
    const age_groups = [
        "18-24",
        "25-34",
        "35-44",
        "45-54",
        "55+"
    ];

    // Get all product categories from the dataset
    const product_categories = Array.from(
        new Set(data.map(function(d) {
            return d.product_category;
        }))
    );

    // Create one heatmap cell for each age group and product category pair
    const heatmap_data = [];

    age_groups.forEach(function(age_group) {
        product_categories.forEach(function(category) {

            const filtered = data.filter(function(d) {
                return d.age_group === age_group &&
                       d.product_category === category;
            });

            heatmap_data.push({
                age_group: age_group,
                category: category,
                average_purchase: d3.mean(filtered, function(d) {
                    return d.purchase_amount;
                })
            });
        });
    });

    // X scale for the product category columns
    const x = d3.scaleBand()
        .domain(product_categories)
        .range([0, chart_width])
        .padding(0.05);

    // Y scale for the age group rows
    const y = d3.scaleBand()
        .domain(age_groups)
        .range([0, chart_height])
        .padding(0.05);

    // Use a blue color scale for average purchase amount
    const color = d3.scaleLinear()
        .domain([
            d3.min(heatmap_data, function(d) {
                return d.average_purchase;
            }),
            d3.max(heatmap_data, function(d) {
                return d.average_purchase;
            })
        ])
        .range(["#e3f2fd", "#1565c0"]);

    // Draw x-axis
    g.append("g")
        .attr("transform", `translate(0, ${chart_height})`)
        .call(d3.axisBottom(x))
        .selectAll("text")
        .attr("transform", "rotate(-35)")
        .attr("text-anchor", "end")
        .attr("font-size", "12px");

    // Draw y-axis
    g.append("g")
        .call(d3.axisLeft(y))
        .selectAll("text")
        .attr("font-size", "13px");

    // Draw heatmap cells
    g.selectAll(".heatmap-cell")
        .data(heatmap_data)
        .enter()
        .append("rect")
        .attr("class", "heatmap-cell")
        .attr("x", function(d) {
            return x(d.category);
        })
        .attr("y", function(d) {
            return y(d.age_group);
        })
        .attr("width", x.bandwidth())
        .attr("height", y.bandwidth())
        .attr("fill", function(d) {
            return color(d.average_purchase);
        })
        .attr("stroke", "white")
        .attr("stroke-width", 1);

    // Add the average purchase amount labels inside each cell
    g.selectAll(".heatmap-label")
        .data(heatmap_data)
        .enter()
        .append("text")
        .attr("class", "heatmap-label")
        .attr("x", function(d) {
            return x(d.category) + x.bandwidth() / 2;
        })
        .attr("y", function(d) {
            return y(d.age_group) + y.bandwidth() / 2 + 4;
        })
        .attr("text-anchor", "middle")
        .attr("font-size", "11px")
        .attr("fill", function(d) {
            const min_value = d3.min(heatmap_data, function(d) {
                return d.average_purchase;
            });

            const max_value = d3.max(heatmap_data, function(d) {
                return d.average_purchase;
            });

            const midpoint = (min_value + max_value) / 2;

            if (d.average_purchase > midpoint) {
                return "white";
            } else {
                return "black";
            }
        })
        .text(function(d) {
            return "$" + Math.round(d.average_purchase);
        });

    // Axes labels
    g.append("text")
        .attr("x", chart_width / 2)
        .attr("y", chart_height + 80)
        .attr("text-anchor", "middle")
        .attr("font-size", "15px")
        .text("Product Category");

    g.append("text")
        .attr("transform", "rotate(-90)")
        .attr("x", -chart_height / 2)
        .attr("y", -75)
        .attr("text-anchor", "middle")
        .attr("font-size", "15px")
        .text("Age Group");

    // Create color legend for heatmap
    const legend_width = 180;
    const legend_height = 15;

    const legend = g.append("g")
        .attr(
            "transform",
            `translate(${chart_width - 180}, ${chart_height + 70})`
        );

    // Create the gradient definition to make it clear for user and easy to understand
    const defs = svg.append("defs");

    const gradient = defs.append("linearGradient")
        .attr("id", "heatmap-gradient")
        .attr("x1", "0%")
        .attr("x2", "100%")
        .attr("y1", "0%")
        .attr("y2", "0%");

    gradient.append("stop")
        .attr("offset", "0%")
        .attr("stop-color", "#e3f2fd");

    gradient.append("stop")
        .attr("offset", "100%")
        .attr("stop-color", "#1565c0");

    // Draw gradient bar
    legend.append("rect")
        .attr("width", legend_width)
        .attr("height", legend_height)
        .style("fill", "url(#heatmap-gradient)")
        .attr("stroke", "#999");

    // Legend title
    legend.append("text")
        .attr("x", legend_width / 2)
        .attr("y", -8)
        .attr("text-anchor", "middle")
        .attr("font-size", "12px")
        .attr("font-weight", "bold")
        .text("Average Purchase Amount");

    // Show minimum value of average
    legend.append("text")
        .attr("x", 0)
        .attr("y", legend_height + 15)
        .attr("font-size", "11px")
        .text(
            "$" +
            Math.round(
                d3.min(heatmap_data, d => d.average_purchase)
            )
        );

    // Show maximum value of average
    legend.append("text")
        .attr("x", legend_width)
        .attr("y", legend_height + 15)
        .attr("text-anchor", "end")
        .attr("font-size", "11px")
        .text(
            "$" +
            Math.round(
                d3.max(heatmap_data, d => d.average_purchase)
            )
    );
}