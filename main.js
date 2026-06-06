// Global state for dashboard filtering
const activeFilters = {
    risk: "All",
    age_group: "All",
    employment_type: "All",
    location: "All",
    product_category: "All"
};
let fullDataset = [];
let isRedrawing = false;

// Tooltip — shared across all charts
const tooltipEl = document.getElementById("tooltip");
const welcomeOverlay = document.getElementById("welcome-overlay");
const welcomeClose = document.getElementById("welcome-close");

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

function showWelcomePanel() {
    if (!welcomeOverlay || !welcomeClose) return;
    const seenKey = 'bnplDashboardWelcomeShown';
    if (window.localStorage && window.localStorage.getItem(seenKey)) return;

    welcomeOverlay.classList.remove('hidden');
    welcomeClose.addEventListener('click', function () {
        welcomeOverlay.classList.add('hidden');
        if (window.localStorage) window.localStorage.setItem(seenKey, 'true');
    });
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

    // Expose a simple palette and risk color helper for charts
    window.palette = ["#2ecc71", "#f1c40f", "#e74c3c"]; // green, yellow, red
    window.getRiskColor = function (value, min, max) {
        if (value == null || isNaN(value) || min == null || max == null) return window.palette[1];
        const mid = (min + max) / 2;
        const scale = d3.scaleLinear().domain([min, mid, max]).range(window.palette);
        return scale(value);
    };

    // Populate demographic dropdowns
    function populateSelect(id, values) {
        const sel = document.getElementById(id);
        if (!sel) return;
        // clear extras
        sel.querySelectorAll('option[value]').forEach(o => { if (o.value !== 'All') o.remove(); });
        values.sort();
        values.forEach(v => {
            const opt = document.createElement('option');
            opt.value = v;
            opt.textContent = v;
            sel.appendChild(opt);
        });
        sel.addEventListener('change', function () {
            if (isRedrawing) return;
            const val = this.value;
            if (id === 'select-age') activeFilters.age_group = val;
            if (id === 'select-employment') activeFilters.employment_type = val;
            if (id === 'select-location') activeFilters.location = val;
            if (id === 'select-product') activeFilters.product_category = val;
            const filtered = applyActiveFilters();
            updateRecordCount(filtered.length);
            animatedRedraw(filtered);
        });
    }

    // Risk filter dropdown (top-left)
    const riskSelect = document.getElementById('select-risk');
    if (riskSelect) {
        riskSelect.addEventListener('change', function () {
            if (isRedrawing) return;
            activeFilters.risk = this.value || 'All';
            const filtered = applyActiveFilters();
            updateRecordCount(filtered.length);
            animatedRedraw(filtered);
        });
    }

    // Reset button
    const resetBtn = document.getElementById('reset-filters');
    if (resetBtn) resetBtn.addEventListener('click', function () {
        activeFilters.risk = 'All';
        activeFilters.age_group = 'All';
        activeFilters.employment_type = 'All';
        activeFilters.location = 'All';
        activeFilters.product_category = 'All';
        // reset UI
        // reset selects and any pill state
        ['select-risk','select-age','select-employment','select-location','select-product'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.value = 'All';
        });
        ['select-age','select-employment','select-location','select-product'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.value = 'All';
        });
        const filtered = applyActiveFilters();
        updateRecordCount(filtered.length);
        animatedRedraw(filtered);
    });

    // Build initial dropdown options from dataset
    populateSelect('select-age', Array.from(new Set(fullDataset.map(d => d.age_group))));
    populateSelect('select-employment', Array.from(new Set(fullDataset.map(d => d.employment_type))));
    populateSelect('select-location', Array.from(new Set(fullDataset.map(d => d.location))));
    populateSelect('select-product', Array.from(new Set(fullDataset.map(d => d.product_category))));

    // Helper to apply all activeFilters to the full dataset
    function applyActiveFilters() {
        return fullDataset.filter(d => {
            if (activeFilters.risk !== 'All' && d.customer_segment !== activeFilters.risk) return false;
            if (activeFilters.age_group !== 'All' && d.age_group !== activeFilters.age_group) return false;
            if (activeFilters.employment_type !== 'All' && d.employment_type !== activeFilters.employment_type) return false;
            if (activeFilters.location !== 'All' && d.location !== activeFilters.location) return false;
            if (activeFilters.product_category !== 'All' && d.product_category !== activeFilters.product_category) return false;
            return true;
        });
    }

    updateRecordCount(fullDataset.length);

    showWelcomePanel();

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
            const filtered = applyActiveFilters();
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
        const filtered = (typeof applyActiveFilters === 'function') ? applyActiveFilters() : fullDataset;
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