// Function to draw the heatmap visualization
// Purpose is to show what the different age groups are doing BNPL transactions on
function draw_heatmap(data, svgEl) {

    // Read dimensions from the card container instead of global width/height
    const container = svgEl.parentElement;
    const W = container.clientWidth;
    const H = container.clientHeight;

    // Select this chart's own SVG (not a global svg) and clear it before redrawing
    const svg = d3.select(svgEl)
        .attr("viewBox", `0 0 ${W} ${H}`);

    svg.selectAll("*").remove();

    // Set up margins and dimensions
    const margin = { top: 42, right: 16, bottom: 72, left: 58 };

    const chart_width = W - margin.left - margin.right;
    const chart_height = H - margin.top - margin.bottom;

    // Create group element for the heatmap
    const g = svg.append("g")
        .attr("transform", `translate(${margin.left}, ${margin.top})`);

    // Main title
    g.append("text")
        .attr("x", chart_width / 2)
        .attr("y", -16)
        .attr("text-anchor", "middle")
        .attr("font-family", "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif")
        .attr("font-size", "13px")
        .attr("font-weight", "500")
        .attr("fill", "#1a1e2e")
        .text("How are different age groups using BNPL?");

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
        new Set(
            data.map(function (d) {
                return d.product_category;
            })
        )
    ).sort();

    // Create one heatmap cell for each age group and product category pair
    const heatmap_data = [];

    age_groups.forEach(function (age_group) {
        product_categories.forEach(function (category) {

            const filtered = data.filter(function (d) {
                return d.age_group === age_group &&
                    d.product_category === category;
            });

            const amounts = filtered.map(function (d) {
                return d.purchase_amount;
            });

            const defaulted = filtered.filter(function (d) {
                return d.default_flag === 1;
            }).length;

            heatmap_data.push({
                age_group: age_group,
                category: category,

                average_purchase: d3.mean(filtered, function (d) {
                    return d.purchase_amount;
                }) || 0,

                min_purchase: d3.min(amounts) || 0,
                max_purchase: d3.max(amounts) || 0,

                count: filtered.length,

                default_rate:
                    filtered.length > 0
                        ? (defaulted / filtered.length) * 100
                        : 0,

                avg_credit_score:
                    d3.mean(filtered, function (d) {
                        return d.credit_score;
                    }) || 0
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
            d3.min(heatmap_data, function (d) {
                return d.average_purchase;
            }),
            d3.max(heatmap_data, function (d) {
                return d.average_purchase;
            })
        ])
        .range(["#d4eeff", "#045a8d"]);

    // Draw x-axis
    g.append("g")
        .attr("transform", `translate(0, ${chart_height})`)
        .call(d3.axisBottom(x).tickSize(0))
        .call(function (axis) {
            axis.select(".domain").remove();
        })
        .selectAll("text")
        .attr("transform", "rotate(-35)")
        .attr("text-anchor", "end")
        .attr("font-size", "10px")
        .attr("fill", "#9aa0b0")
        .attr("dy", "0.5em")
        .attr("dx", "-0.4em");

    // Draw y-axis
    g.append("g")
        .call(d3.axisLeft(y).tickSize(0))
        .call(function (axis) {
            axis.select(".domain").remove();
        })
        .selectAll("text")
        .attr("font-size", "10px")
        .attr("fill", "#5a6070")
        .attr("dx", "-4px");

    // Draw heatmap cells
    const cells = g.selectAll(".heatmap-cell")
        .data(heatmap_data)
        .enter()
        .append("rect")
        .attr("class", "heatmap-cell")
        .attr("x", function (d) {
            return x(d.category);
        })
        .attr("y", function (d) {
            return y(d.age_group);
        })
        .attr("width", x.bandwidth())
        .attr("height", y.bandwidth())
        .attr("rx", 3)
        .attr("fill", function (d) {
            if (d.count > 0) {
                return color(d.average_purchase);
            }
            return "#f4f6f9";
        })
        .attr("stroke", "white")
        .attr("stroke-width", 1)
        .attr("opacity", 0);

    // Fade cells in with a staggered animation
    cells.transition()
        .delay(function (d) {
            return 60 +
                product_categories.indexOf(d.category) * 40 +
                age_groups.indexOf(d.age_group) * 12;
        })
        .duration(380)
        .ease(d3.easeCubicOut)
        .attr("opacity", 1);

    // Show detailed information when the user hovers over a cell
    cells.on("mouseover", function (event, d) {

        d3.select(this)
            .attr("stroke", "#2b8cbe")
            .attr("stroke-width", 2);

        const tooltipHtml = `
            <strong>${d.age_group} &mdash; ${d.category}</strong><br>
            Default rate <strong>${d.default_rate.toFixed(1)}%</strong><br>
            Avg credit <strong>${Math.round(d.avg_credit_score)}</strong><br>
            Transactions <strong>${d.count.toLocaleString()}</strong>
        `;

            showTooltip(event, tooltipHtml);
        })
        .on("mousemove", moveTooltip)
        .on("mouseout", function () {

            d3.select(this)
                .attr("stroke", "white")
                .attr("stroke-width", 1);

            hideTooltip();
        });

    // Add the average purchase amount labels inside each cell
    g.selectAll(".heatmap-label")
        .data(heatmap_data)
        .enter()
        .append("text")
        .attr("class", "heatmap-label")
        .attr("x", function (d) {
            return x(d.category) + x.bandwidth() / 2;
        })
        .attr("y", function (d) {
            return y(d.age_group) + y.bandwidth() / 2 + 4;
        })
        .attr("text-anchor", "middle")
        .attr("font-size", "9px")
        .attr("pointer-events", "none")
        .attr("fill", function (d) {

            const min_value = d3.min(heatmap_data, function (d) {
                return d.average_purchase;
            });

            const max_value = d3.max(heatmap_data, function (d) {
                return d.average_purchase;
            });

            const midpoint = (min_value + max_value) / 2;

            if (d.average_purchase > midpoint) {
                return "white";
            } else {
                return "black";
            }
        })
        .text(function (d) {
            if (d.count > 0) {
                return "$" + Math.round(d.average_purchase);
            }
            return "";
        });

    // Axes labels
    g.append("text")
        .attr("x", chart_width / 2)
        .attr("y", chart_height + 62)
        .attr("text-anchor", "middle")
        .attr("font-size", "11px")
        .attr("fill", "#9aa0b0")
        .text("Product Category");

    g.append("text")
        .attr("transform", "rotate(-90)")
        .attr("x", -chart_height / 2)
        .attr("y", -46)
        .attr("text-anchor", "middle")
        .attr("font-size", "11px")
        .attr("fill", "#9aa0b0")
        .text("Age Group");

    // Create color legend for heatmap
    const legend_width = Math.min(130, chart_width * 0.35);
    const legend_height = 8;

    const legend = g.append("g")
        .attr(
            "transform",
            `translate(${chart_width - legend_width}, ${chart_height + 50})`
        );

    // Create the gradient definition to make it clear for user and easy to understand
    const defs = svg.append("defs");

    const gradient = defs.append("linearGradient")
        .attr("id", "hm-grad")
        .attr("x1", "0%")
        .attr("x2", "100%")
        .attr("y1", "0%")
        .attr("y2", "0%");

    gradient.append("stop")
        .attr("offset", "0%")
        .attr("stop-color", "#d4eeff");

    gradient.append("stop")
        .attr("offset", "100%")
        .attr("stop-color", "#045a8d");

    // Draw gradient bar
    legend.append("rect")
        .attr("width", legend_width)
        .attr("height", legend_height)
        .attr("rx", 3)
        .style("fill", "url(#hm-grad)");

    // Show minimum value of average
    legend.append("text")
        .attr("x", 0)
        .attr("y", legend_height + 13)
        .attr("font-size", "9px")
        .attr("fill", "#9aa0b0")
        .text("$" + Math.round(d3.min(heatmap_data, function (d) {
            return d.average_purchase;
        })));

    // Show maximum value of average
    legend.append("text")
        .attr("x", legend_width)
        .attr("y", legend_height + 13)
        .attr("text-anchor", "end")
        .attr("font-size", "9px")
        .attr("fill", "#9aa0b0")
        .text("$" + Math.round(d3.max(heatmap_data, function (d) {
            return d.average_purchase;
        })));
}