//  flow: Purchase Amount Tier  -->  Employment Type -->  Default Status
function draw_sankey(dataset) {
    // set up sankey dimensions and width
    const sankeyWidth  = 740;   
    const sankeyHeight = 380;   
    const sankeyX      = 27;   
    const sankeyY      = 130;  

    // moves graph to the correct place
    const g = svg.append("g")
        .attr("transform", `translate(${sankeyX}, ${sankeyY})`);

    // label panel
    g.append("text")
        .attr("x", sankeyWidth / 2)
        .attr("y", -10)
        .attr("text-anchor", "middle")
        .attr("font-size", "16px")
        .attr("font-weight", "bold")
        .text("Relationships between Purchase Tier, Employment Type, Default Status");

    
    // ordered lists so nodes always render top-to-bottom
    const tierOrder = [
        "Low (<$1k)", "Medium ($1k–$2.5k)", "High ($2.5k–$4k)", "Very High (>$4k)"
    ];
    const empOrder = [...new Set(dataset.map(d => d.employment_type))].sort();
    const statusOrder = ["Paid", "Unpaid"];

    // build node array and an index map for the variables that we want to visualize
    const nodeNames = [
        ...tierOrder,
        ...empOrder,
        ...statusOrder
    ];
    const nodeIndex = {};
    nodeNames.forEach((name, i) => { nodeIndex[name] = i; });

    // aggregate flows using the tierEmp and empStatusMap
    const tierEmpMap   = new Map();
    const empStatusMap = new Map();
    dataset.forEach(d => {
        const tier = d.purchase_tier;
        const emp  = d.employment_type;
        const status = d.default_status;
        const k1 = `${tier}|${emp}`;
        const k2 = `${emp}|${status}`;
        tierEmpMap.set(k1,   (tierEmpMap.get(k1)   || 0) + 1);
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
        .nodeWidth(20)
        .nodePadding(14)
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
        const gradId  = `sankey-grad-${i}`;
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
    linkGroup.selectAll("path")
        .data(graph.links)
        .join("path")
        .attr("d", d3.sankeyLinkHorizontal())
        .attr("stroke",        d => `url(#${d.gradId})`)
        .attr("stroke-width",  d => Math.max(1, d.width))
        .attr("stroke-opacity", 0.45)
        // enable hovering behavior
        // Reference: https://d3js.org/d3-selection/selecting
        .on("mouseover", function(event, d) {
            d3.select(this).attr("stroke-opacity", 0.75);
            showTooltip(event,
                `${d.source.name} → ${d.target.name}<br/>Count: ${d.value.toLocaleString()}`
            );
        })
        .on("mousemove", moveTooltip)
        .on("mouseout",  function() {
            d3.select(this).attr("stroke-opacity", 0.45);
            hideTooltip();
        });


    // draw rectangle nodes
    // create seperate group for all nodes
    const nodeGroup = g.append("g").attr("class", "sankey-nodes");
    // position and draw rectangle for every node
    nodeGroup.selectAll("rect")
        .data(graph.nodes)
        .join("rect")
        .attr("x",      d => d.x0)
        .attr("y",      d => d.y0)
        .attr("height", d => Math.max(1, d.y1 - d.y0))
        .attr("width",  d => d.x1 - d.x0)
        .attr("fill",   d => nodeColor(d.name))
        .attr("stroke", "#333")
        .attr("stroke-width", 0.5)
        .on("mouseover", function(event, d) {
            showTooltip(event,
                `${d.name}<br/>Total: ${d.value.toLocaleString()}`
            );
        })
        .on("mousemove", moveTooltip)
        .on("mouseout",  hideTooltip);

    // label every node
    nodeGroup.selectAll("text")
        .data(graph.nodes)
        .join("text")
        .attr("x", d => d.x0 < sankeyWidth / 2 ? d.x1 + 6 : d.x0 - 6)
        .attr("y", d => (d.y0 + d.y1) / 2)
        .attr("dy", "0.35em")
        .attr("text-anchor", d => d.x0 < sankeyWidth / 2 ? "start" : "end")
        .attr("font-size", "11px")
        .attr("fill", "#222")
        .text(d => `${d.name} (${d.value.toLocaleString()})`);

    // align labels for each column
    const layers = [
        { label: "Purchase Tier",    x: 0 },
        { label: "Employment Type",  x: sankeyWidth / 2 },
        { label: "Default Status",   x: sankeyWidth }
    ];
    g.append("g").attr("class", "sankey-layer-labels")
        .selectAll("text")
        .data(layers)
        .join("text")
        .attr("x", d => d.x)
        .attr("y", sankeyHeight + 24)
        .attr("text-anchor", (d, i) => ["start", "middle", "end"][i])
        .attr("font-size", "13px")
        .attr("font-weight", "600")
        .attr("fill", "#444")
        .text(d => d.label);


    // helper functions for tooltips
    // Reference: https://d3-graph-gallery.com/graph/interactivity_tooltip.html 
    let tooltip = d3.select("body").select(".sankey-tooltip");
    // make tooltip
    if (tooltip.empty()) {
        tooltip = d3.select("body").append("div")
            .attr("class", "sankey-tooltip")
            .style("position",       "absolute")
            .style("background",     "rgba(0,0,0,0.75)")
            .style("color",          "#fff")
            .style("padding",        "6px 10px")
            .style("border-radius",  "4px")
            .style("font-size",      "12px")
            .style("pointer-events", "none")
            .style("opacity",        0);
    }
    // display tooltip near mouse
    function showTooltip(event, html) {
        tooltip.html(html)
            .style("opacity", 1)
            .style("left", (event.pageX + 12) + "px")
            .style("top",  (event.pageY - 28) + "px");
    }
    // align the tooltip with the mouse as it moves
    function moveTooltip(event) {
        tooltip
            .style("left", (event.pageX + 12) + "px")
            .style("top",  (event.pageY - 28) + "px");
    }

    // hide the tooltip
    function hideTooltip() {
        tooltip.style("opacity", 0);
    }

} 