//  flow: Purchase Amount Tier  -->  Employment Type -->  Default Status
function draw_sankey(dataset, svgEl) {

    // Read dimensions from the card container instead of global width/height
    const container = svgEl.parentElement;
    const W = container.clientWidth;
    const H = container.clientHeight;

    // Select this chart's own SVG (not a global svg) and clear it before redrawing
    const svg = d3.select(svgEl)
        .attr("viewBox", `0 0 ${W} ${H}`);

    svg.selectAll("*").remove();

    // Set up sankey dimensions — uses card size instead of fixed coords
    const margin = { top: 38, right: 90, bottom: 30, left: 90 };

    const sankeyWidth = W - margin.left - margin.right;
    const sankeyHeight = H - margin.top - margin.bottom;

    // moves graph to the correct place
    const g = svg.append("g")
        .attr("transform", `translate(${margin.left}, ${margin.top})`);

    // label panel
    g.append("text")
        .attr("x", sankeyWidth / 2)
        .attr("y", -16)
        .attr("text-anchor", "middle")
        .attr("font-family", "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif")
        .attr("font-size", "13px")
        .attr("font-weight", "500")
        .attr("fill", "#1a1e2e")
        .text("Purchase Tier → Employment Type → Default Status");

    // ordered lists so nodes always render top-to-bottom
    // filter to only tiers/statuses present in the current filtered dataset
    const allTierOrder = [
        "Low (< $1K)", "Medium ($1K – $2.5K)", "High ($2.5K – $4K)", "Very High (> $4K)"
    ];
    const activeTiers = new Set(dataset.map(d => d.purchase_tier));
    const tierOrder = allTierOrder.filter(t => activeTiers.has(t));

    const empOrder = [...new Set(dataset.map(d => d.employment_type))].sort();

    const activeStatuses = new Set(dataset.map(d => d.default_status));
    const statusOrder = ["Paid", "Unpaid"].filter(s => activeStatuses.has(s));

    // build node array and an index map for the variables that we want to visualize
    const nodeNames = [
        ...tierOrder,
        ...empOrder,
        ...statusOrder
    ];

    const nodeIndex = {};
    nodeNames.forEach((name, i) => { nodeIndex[name] = i; });

    // aggregate flows using the tierEmp and empStatusMap
    const tierEmpMap = new Map();
    const empStatusMap = new Map();

    // loop through the dataset and count the number of customers in each flow category
    dataset.forEach(d => {
        const tier = d.purchase_tier;
        const emp = d.employment_type;
        const status = d.default_status;
        const k1 = `${tier}|${emp}`;
        const k2 = `${emp}|${status}`;
        tierEmpMap.set(k1, (tierEmpMap.get(k1) || 0) + 1);
        empStatusMap.set(k2, (empStatusMap.get(k2) || 0) + 1);
    });

    // convert to d3-sankey link objects
    const links = [];

    // take data for each map and convert into link object array
    tierEmpMap.forEach((value, key) => {
        const [src, tgt] = key.split("|");
        links.push({ source: nodeIndex[src], target: nodeIndex[tgt], value });
    });
    empStatusMap.forEach((value, key) => {
        const [src, tgt] = key.split("|");
        links.push({ source: nodeIndex[src], target: nodeIndex[tgt], value });
    });

    const nodes = nodeNames.map(name => ({ name }));

    // run d3.sankey with the links and nodes we have defined
    // reference: https://github.com/d3/d3-sankey
    const sankey = d3.sankey()
        .nodeWidth(16)
        .nodePadding(10)
        .extent([[0, 0], [sankeyWidth, sankeyHeight]]);

    const graph = sankey({
        nodes: nodes.map(d => Object.assign({}, d)),
        links: links.map(d => Object.assign({}, d))
    });

    // defines color scales
    // Reference: https://d3js.org/d3-scale/ordinal
    const tierColours = d3.scaleOrdinal()
        .domain(tierOrder)
        .range(["#4e79a7", "#59a14f", "#f28e2b", "#e15759"]);

    // employment type colors
    const empColours = d3.scaleOrdinal()
        .domain(empOrder)
        .range(d3.schemeTableau10);

    // default status colors
    const statusColours = d3.scaleOrdinal()
        .domain(statusOrder)
        .range(["#76b7b2", "#e15759"]);

    // color nodes according to which variables or categories they are associated with
    function nodeColor(name) {
        if (tierOrder.includes(name))
            return tierColours(name);
        if (statusOrder.includes(name))
            return statusColours(name);
        return empColours(name);
    }

    // create links between the paths
    // define gradient ids for each link
    const defs = g.append("defs");

    // loop through every link
    graph.links.forEach((link, i) => {
        const srcName = link.source.name;
        const tgtName = link.target.name;
        // create unique gradient ID for the link
        const gradId = `sankey-grad-${i}`;
        // create linear gradient and position it
        const grad = defs.append("linearGradient")
            .attr("id", gradId)
            .attr("gradientUnits", "userSpaceOnUse")
            .attr("x1", link.source.x1)
            .attr("x2", link.target.x0);

        // add source and target color
        grad.append("stop")
            .attr("offset", "0%")
            .attr("stop-color", nodeColor(srcName));
        grad.append("stop")
            .attr("offset", "100%")
            .attr("stop-color", nodeColor(tgtName));
        // save ID onto link object
        link.gradId = gradId;
    });

    // create group to hold the link paths
    const linkGroup = g.append("g")
        .attr("class", "sankey-links")
        .attr("fill", "none");

    // draw path for each link
    const linkPaths = linkGroup.selectAll("path")
        .data(graph.links)
        .join("path")
        .attr("d", d3.sankeyLinkHorizontal())
        .attr("stroke", d => `url(#${d.gradId})`)
        .attr("stroke-width", d => Math.max(1, d.width))
        .attr("stroke-opacity", 0);

    linkPaths.transition()
        .delay((d, i) => 60 + i * 18)
        .duration(550)
        .ease(d3.easeCubicOut)
        .attr("stroke-opacity", 0.45);

    // enable hovering behavior
    // Reference: https://d3js.org/d3-selection/selecting
    linkPaths
        .on("mouseover", function (event, d) {
            d3.select(this).raise().transition().duration(100).attr("stroke-opacity", 0.75);
            showTooltip(event,
                `<strong>${d.source.name} → ${d.target.name}</strong><br>Count: ${d.value.toLocaleString()}`
            );
        })
        .on("mousemove", moveTooltip)
        .on("mouseout", function () {
            d3.select(this).transition().duration(180).attr("stroke-opacity", 0.45);
            hideTooltip();
        });

    // draw rectangle nodes
    // create seperate group for all nodes
    const nodeGroup = g.append("g").attr("class", "sankey-nodes");

    // position and draw rectangle for every node
    const nodeRects = nodeGroup.selectAll("rect")
        .data(graph.nodes)
        .join("rect")
        .attr("x", d => d.x0)
        .attr("y", d => d.y0)
        .attr("height", d => Math.max(1, d.y1 - d.y0))
        .attr("width", d => d.x1 - d.x0)
        .attr("fill", d => nodeColor(d.name))
        .attr("stroke", "#333")
        .attr("stroke-width", 0.5)
        .attr("opacity", 0);
    // animate nodes after links so they appear on top
    nodeRects.transition()
        .delay((d, i) => 180 + i * 25)
        .duration(450)
        .ease(d3.easeCubicOut)
        .attr("opacity", 1);

    // add hover behavior to nodes
    nodeRects
        .on("mouseover", function (event, d) {
            linkPaths.transition().duration(100)
                .attr("stroke-opacity", l =>
                    l.source.name === d.name || l.target.name === d.name ? 0.75 : 0.08);
            showTooltip(event,
                `<strong>${d.name}</strong><br>Total: ${d.value.toLocaleString()}`
            );
        })
        .on("mousemove", moveTooltip)
        .on("mouseout", function () {
            linkPaths.transition().duration(200).attr("stroke-opacity", 0.45);
            hideTooltip();
        });

    // label every node
    nodeGroup.selectAll("text")
        .data(graph.nodes)
        .join("text")
        .attr("x", d => d.x0 < sankeyWidth / 2 ? d.x1 + 6 : d.x0 - 6)
        .attr("y", d => (d.y0 + d.y1) / 2)
        .attr("dy", "0.35em")
        .attr("text-anchor", d => d.x0 < sankeyWidth / 2 ? "start" : "end")
        .attr("font-family", "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif")
        .attr("font-size", "11px")
        .attr("fill", "#5a6070")
        .text(d => d.name);

    // align labels for each column
    const layers = [
        { label: "Purchase Tier", x: 0 },
        { label: "Employment Type", x: sankeyWidth / 2 },
        { label: "Default Status", x: sankeyWidth }
    ];

    // add header labels for each column
    g.append("g").attr("class", "sankey-layer-labels")
        .selectAll("text")
        .data(layers)
        .join("text")
        .attr("x", d => d.x)
        .attr("y", sankeyHeight + 20)
        .attr("text-anchor", (d, i) => ["start", "middle", "end"][i])
        .attr("font-family", "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif")
        .attr("font-size", "11px")
        .attr("font-weight", "500")
        .attr("fill", "#9aa0b0")
        .text(d => d.label);
}