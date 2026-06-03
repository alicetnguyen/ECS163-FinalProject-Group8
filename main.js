// Global state for dashboard filtering
let activeRiskFilter = "All";
let fullDataset = [];
let isRedrawing = false;

// Tooltip — shared across all charts
const tooltipEl = document.getElementById("tooltip");

function showTooltip(event, html) {
    tooltipEl.innerHTML = html;
    tooltipEl.style.opacity = 1;
    moveTooltip(event);
}

function moveTooltip(event) {
    const x = event.clientX + 14;
    const y = event.clientY - 36;
    const maxX = window.innerWidth - tooltipEl.offsetWidth - 16;
    const maxY = window.innerHeight - tooltipEl.offsetHeight - 8;
    tooltipEl.style.left = Math.min(x, maxX) + "px";
    tooltipEl.style.top = Math.max(8, Math.min(y, maxY)) + "px";
}

function hideTooltip() {
    tooltipEl.style.opacity = 0;
}

// Load the dataset
d3.csv("data/Buy_Now_Pay_Later_BNPL_CreditRisk_Dataset.csv").then(function (dataset) {

    // Convert strings from csv defaults to numerical values
    dataset.forEach(function (d) {

        // May not use all features/variables
        d.user_id = +d.user_id;
        d.employment_type = d.employment_type;
        d.product_category = d.product_category;
        d.location = d.location;
        d.customer_segment = d.customer_segment;
        d.age = +d.age;
        d.monthly_income = +d.monthly_income;
        d.credit_score = +d.credit_score;
        d.purchase_amount = +d.purchase_amount;
        d.bnpl_installments = +d.bnpl_installments;
        d.repayment_delay_days = +d.repayment_delay_days;
        d.missed_payments = +d.missed_payments;
        d.debt_to_income_ratio = +d.debt_to_income_ratio;
        d.risk_score = +d.risk_score;
        d.default_flag = +d.default_flag;

        // Readable paid/unpaid label
        d.default_status = d.default_flag === 1 ? "Unpaid" : "Paid";

        // Purchase amount tiers
        if (d.purchase_amount < 1000) {
            d.purchase_tier = "Low (< $1K)";
        }
        else if (d.purchase_amount < 2500) {
            d.purchase_tier = "Medium ($1K – $2.5K)";
        }
        else if (d.purchase_amount < 4000) {
            d.purchase_tier = "High ($2.5K – $4K)";
        }
        else {
            d.purchase_tier = "Very High (> $4K)";
        }

        // Age groups
        if (d.age < 25) {
            d.age_group = "18-24";
        }
        else if (d.age < 35) {
            d.age_group = "25-34";
        }
        else if (d.age < 45) {
            d.age_group = "35-44";
        }
        else if (d.age < 55) {
            d.age_group = "45-54";
        }
        else {
            d.age_group = "55+";
        }
    });

    fullDataset = dataset;

    // Hide loading screen once data is ready
    const loading = document.getElementById("loading");
    if (loading) loading.classList.add("hidden");

    // Risk filter controls
    d3.selectAll(".filter-pill").on("click", function () {

        if (isRedrawing) return;

        const val = this.dataset.val;

        if (val === activeRiskFilter) return;

        d3.selectAll(".filter-pill").classed("active", false);
        d3.select(this).classed("active", true);

        activeRiskFilter = val;

        const filtered = val === "All"
            ? fullDataset
            : fullDataset.filter(d => d.customer_segment === val);

        updateRecordCount(filtered.length);
        animatedRedraw(filtered);
    });

    updateRecordCount(fullDataset.length);

    // Defer first draw so cards have painted and have real dimensions
    requestAnimationFrame(function () {
        requestAnimationFrame(function () {
            // Draw the visualizations using the functions and files for each visualization type
            redraw(fullDataset);
        });
    });

    // Redraw on resize with debounce
    let resizeTimer;
    window.addEventListener("resize", function () {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(function () {
            const filtered = activeRiskFilter === "All"
                ? fullDataset
                : fullDataset.filter(d => d.customer_segment === activeRiskFilter);
            redraw(filtered);
        }, 150);
    });
});

// Update record count display
function updateRecordCount(n) {
    const el = document.getElementById("record-count");
    if (el) el.textContent = n.toLocaleString() + " customers";
}

// Draw all visualizations
function redraw(data) {
    draw_heatmap(data, document.getElementById("svg-heatmap"));
    draw_scatterplot(data, document.getElementById("svg-scatter"));
    draw_sankey(data, document.getElementById("svg-sankey"));
    draw_streamgraph(data, document.getElementById("svg-stream"));
}

// Called by the scatterplot brush to update the other three charts with a filtered subset.
function applyBrushFilter(brushedData) {
    if (brushedData === null) {
        const filtered = activeRiskFilter === "All"
            ? fullDataset
            : fullDataset.filter(d => d.customer_segment === activeRiskFilter);
        draw_heatmap(filtered, document.getElementById("svg-heatmap"));
        draw_sankey(filtered, document.getElementById("svg-sankey"));
        draw_streamgraph(filtered, document.getElementById("svg-stream"));
    } else {
        draw_heatmap(brushedData, document.getElementById("svg-heatmap"));
        draw_sankey(brushedData, document.getElementById("svg-sankey"));
        draw_streamgraph(brushedData, document.getElementById("svg-stream"));
    }
}

// Animated redraw used when switching filters
function animatedRedraw(data) {

    isRedrawing = true;

    const cards = document.querySelectorAll(".chart-card");
    cards.forEach(c => { c.style.transition = "opacity 0.18s ease"; c.style.opacity = "0.35"; });

    setTimeout(function () {

        redraw(data);

        cards.forEach(c => { c.style.opacity = "1"; });

        setTimeout(function () {
            cards.forEach(c => { c.style.transition = ""; });
            isRedrawing = false;
        }, 200);

    }, 180);
}