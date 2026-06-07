# ECS163-FinalProject-Group8
Description:

This project was built as an interactive data visualization dashboard for ECS 163 at UC Davis. The dashboard visualizes a Buy Now, Pay Later (BNPL) dataset, exploring consumer transcation flows, repayment behavior, and which factors most contribute to a likelihood in payment default.

BNPL has become increasingly popular as an alternative option to traditional full payments, however most users may not fully understand their repayment risks and general patterns of default. This dashboard address this concern through four coordinated visualizations: a heatmap, a Sankey diagram, a scatterplot, and a stream graph. Each viewpoint highlights a different aspect of the dataset. Interactivity and filtering of the data is consistent across all four views, so users are able to select a subset of time periods or borrowers in one chart and have all other charts updated in real time, allowing the data to be drilled down from high-level trends to targeted subsets of the data. 

This project was built with D3.js and vanilla javascript, meaning no frameworks or build tools is required. Each visualization is attatched to its own JavaScript file: heatmap.js, sankey.js, scatterplot.js, stream.js. Index.html manages all four visualizations. The BNPL dataset file is stored in data/, and styling is done in styles.css. 

This project was a collaborative effort amongst Alice N., Archita S., Ananya T., Manushri R., and Jordan T. 

Installation:

Clone the repository: 

git clone https://github.com/alicetnguyen/ECS163-FinalProject-Group8.git                    
cd ECS163-FinalProject-Group8

After this is done, open the corresponding folder in VS Code and follow the below steps. 

Execution:
1. Install the Live Server Extension if not already downloaded
2. Right-click index.html and select "Open with Live Server"

This will trigger your browser to automatically open your dashboard. To use the interactivity, click to filter and hover for tooltips. All other views will update based on your selection.

AI Disclosure:
This project recieved assistance from Claude (Anthropic). Claude was used to debug the code and decide which d3 functions would best fit the visualizations chosen to represent the dataset. 
