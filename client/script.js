let chartInstance = null; // Global variable to store the current Chart.js instance

// Wait until the DOM is fully loaded
document.addEventListener('DOMContentLoaded', function () {
    // Fetch sales data from the backend API
    fetch('/data')
        .then((response) => response.json())
        .then((data) => {
            // Handle case where no data is returned
            if (!data || data.length === 0) {
                const app = document.getElementById('app');
                if (app) {
                    app.innerHTML = "<p>No data available.</p>";
                }
                return;
            }

            // Initialize filters and dashboard content
            setupFilters(data);
            initializeDashboard(data);

            // Re-render charts when chart type changes
            document.getElementById('chart-type-selector').onchange = () => filterAndRenderData(data);
        })
        .catch((error) => {
            // Handle fetch error
            console.error('Error fetching data:', error);
            const app = document.getElementById('app');
            if (app) {
                app.innerHTML = "<p>Failed to fetch data.</p>";
            }
        });
});

// Initialize Flatpickr date pickers and category filter
function setupFilters(data) {
    // Convert date strings to JS Date objects
    const dates = data.map((item) => new Date(item.order_date.split('/').reverse().join('-')));
    const minDate = new Date(Math.min(...dates));
    const maxDate = new Date(Math.max(...dates));

    // Configure start date picker
    flatpickr("#start-date", {
        defaultDate: minDate.toISOString().slice(0, 10),
        dateFormat: "Y-m-d",
        altInput: true,
        altFormat: "F j, Y",
        onChange: function () {
            filterAndRenderData(data);
        },
    });

    // Configure end date picker
    flatpickr("#end-date", {
        defaultDate: maxDate.toISOString().slice(0, 10),
        dateFormat: "Y-m-d",
        altInput: true,
        altFormat: "F j, Y",
        onChange: function () {
            filterAndRenderData(data);
        },
    });

    // Set up category dropdown change listener
    const categoryFilter = document.getElementById('category-filter');
    if (categoryFilter) {
        categoryFilter.onchange = () => filterAndRenderData(data);
    }
}

// Initialize dashboard after filters are set
function initializeDashboard(data) {
    populateCategoryFilter(data);     // Populate category dropdown
    filterAndRenderData(data);       // Initial render with all data
}

// Apply filters and update key metrics, chart, and table
function filterAndRenderData(data) {
    const chartType = document.getElementById('chart-type-selector').value;
    const startDate = document.getElementById('start-date')._flatpickr.selectedDates[0];
    const endDate = document.getElementById('end-date')._flatpickr.selectedDates[0];
    const selectedCategory = document.getElementById('category-filter').value;

    // Filter data by date and category
    const filteredData = data.filter((item) => {
        const itemDate = new Date(item.order_date.split('/').reverse().join('-'));
        return (
            itemDate >= startDate &&
            itemDate <= endDate &&
            (selectedCategory === 'all' || item.categories === selectedCategory)
        );
    });

    updateKeyMetrics(filteredData);                   // Update metrics like revenue and orders
    drawChart(filteredData, 'chart-canvas', chartType); // Render chart
    populateDataTable(filteredData);                  // Update table
}

// Update dashboard metrics (total revenue, order count, etc.)
function updateKeyMetrics(data) {
    const totalRevenue = data.reduce((acc, item) => acc + parseFloat(item.total), 0);
    const totalOrders = data.length;
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    // Calculate total revenue per category to find top category
    const revenueByCategory = data.reduce((acc, item) => {
        const category = item.categories || "Uncategorized";
        acc[category] = (acc[category] || 0) + parseFloat(item.total);
        return acc;
    }, {});

    // Determine category with highest total revenue
    const topCategory = Object.keys(revenueByCategory).reduce(
        (a, b) => (revenueByCategory[a] > revenueByCategory[b] ? a : b),
        "None"
    );

    // Display metrics in the DOM
    document.getElementById('total-revenue').textContent = `$${totalRevenue.toFixed(2)}`;
    document.getElementById('total-orders').textContent = `${totalOrders}`;
    document.getElementById('average-order-value').textContent = `$${averageOrderValue.toFixed(2)}`;
    document.getElementById('top-category').textContent = topCategory || 'None';
}

// Draw the selected chart type using Chart.js
function drawChart(data, elementId, chartType) {
    const ctx = document.getElementById(elementId).getContext('2d');

    // Destroy previous chart if one exists
    if (chartInstance) {
        chartInstance.destroy();
    }

    switch (chartType) {
        case 'revenueOverTime':
            // Line chart showing revenue by order date
            chartInstance = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: data.map((item) => item.order_date),
                    datasets: [{
                        label: 'Revenue Over Time',
                        data: data.map((item) => parseFloat(item.total)),
                        fill: false,
                        borderColor: 'rgb(75, 192, 192)',
                        tension: 0.1,
                    }],
                },
                options: {
                    scales: {
                        y: { beginAtZero: true },
                    },
                },
            });
            break;

        case 'revenueByCategory':
            // Bar chart showing total revenue per category
            const categories = [...new Set(data.map((item) => item.categories))];
            const revenueByCategory = categories.map((category) => {
                return {
                    category,
                    revenue: data
                        .filter((item) => item.categories === category)
                        .reduce((acc, item) => acc + parseFloat(item.total), 0),
                };
            });
            chartInstance = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: revenueByCategory.map((item) => item.category),
                    datasets: [{
                        label: 'Revenue by Category',
                        data: revenueByCategory.map((item) => item.revenue),
                        backgroundColor: 'rgba(255, 99, 132, 0.2)',
                        borderColor: 'rgba(255, 99, 132, 1)',
                        borderWidth: 1,
                    }],
                },
                options: {
                    scales: {
                        y: { beginAtZero: true },
                    },
                },
            });
            break;

        case 'topProducts':
            // Horizontal bar chart showing top 10 products by revenue
            const productRevenue = data.reduce((acc, item) => {
                const productName = item.product_names || 'Unknown Product';
                acc[productName] = (acc[productName] || 0) + parseFloat(item.total);
                return acc;
            }, {});

            const topProducts = Object.entries(productRevenue)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 10);

            chartInstance = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: topProducts.map((item) => item[0]), // Product names
                    datasets: [{
                        label: 'Top Products by Revenue',
                        data: topProducts.map((item) => item[1]), // Revenue
                        backgroundColor: 'rgba(54, 162, 235, 0.8)',
                        borderColor: 'rgba(54, 162, 235, 1)',
                        borderWidth: 1,
                    }],
                },
                options: {
                    indexAxis: 'y', // Horizontal bars
                    scales: {
                        x: { beginAtZero: true },
                    },
                },
            });
            break;
    }
}

// Display filtered data in a DataTable
function populateDataTable(data) {
    const tableElement = $('#data-table');

    // Destroy existing table if it exists
    if ($.fn.DataTable.isDataTable(tableElement)) {
        tableElement.DataTable().clear().destroy();
    }

    // Create a new DataTable with relevant columns
    tableElement.DataTable({
        data: data.map((item) => [
            item.order_id,
            item.order_date,
            item.customer_id,
            item.product_names,
            item.categories,
            `$${parseFloat(item.total).toFixed(2)}`,
        ]),
        columns: [
            { title: "Order ID" },
            { title: "Order Date" },
            { title: "Customer ID" },
            { title: "Product" },
            { title: "Category" },
            { title: "Total" },
        ],
    });
}

// Populate the category filter dropdown with available categories
function populateCategoryFilter(data) {
    const categoryFilter = document.getElementById('category-filter');
    categoryFilter.innerHTML = '';
    categoryFilter.appendChild(new Option('All Categories', 'all', true, true));

    // Extract unique categories
    const categories = new Set(data.map((item) => item.categories));
    categories.forEach((category) => {
        categoryFilter.appendChild(new Option(category, category));
    });
}