const width = 1600;
const height = 900;

// Create SVG container with a responsive view box and aspect ratio, so it can scale depending on window size
const svg = d3.select("svg")
    .attr("viewBox", `0 0 ${width} ${height}`)
    .attr("preserveAspectRatio", "xMidYMid meet");

// Load the dataset
d3.csv("data/Buy_Now_Pay_Later_BNPL_CreditRisk_Dataset.csv").then(function(dataset) {

    // Convert strings from csv defaults to numerical values 
    dataset.forEach(function(d) {
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
        if (d.purchase_amount < 1000){
            d.purchase_tier = "Low (< $1K)";
        } 
        else if (d.purchase_amount < 2500){  
            d.purchase_tier = "Medium ($1K – $2.5K)";
        }
        else if (d.purchase_amount < 4000)  d.purchase_tier = "High ($2.5K – $4K)";
        else                                d.purchase_tier = "Very High (> $4K)";

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

    // Draw the title of the dashboard
    draw_title();

    // Draw the visualizations using the functions and files for each visualization type
    draw_heatmap(dataset);
    draw_scatterplot(dataset);
    // draw_sankey(dataset);
    // draw_streamgraph(dataset);
});

function draw_title() {
    // Main title
    svg.append("text")
        .attr("x", width / 2)
        .attr("y", 35)
        .attr("text-anchor", "middle")
        .attr("font-size", "30px")
        .attr("font-weight", "bold")
        .text("Buy Now, Pay Later (BNPL) Credit Risk Dashboard");

    // Subtitle
    svg.append("text")
        .attr("x", width / 2)
        .attr("y", 65)
        .attr("text-anchor", "middle")
        .attr("font-size", "20px")
        .text("Exploring how demographic, financial, and purchasing behaviors relate to BNPL repayment risk");
}