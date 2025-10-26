const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const app = express();
const PORT = 3000;

// Full path to your SQLite database
const DB_PATH = "C:\\Users\\thoma\\projects\\my-dashboard\\sales_data.db";

// Serve static files from the client directory
app.use(express.static(path.join(__dirname, '..', 'client')));

// Route to fetch data from SQLite database
app.get('/data', (req, res) => {
    const db = new sqlite3.Database(DB_PATH, sqlite3.OPEN_READONLY, (err) => {
        if (err) {
            console.error("Error connecting to database:", err.message);
            res.status(500).json({ error: "Database connection failed" });
            return;
        }
    });

    // Query the database
    const query = "SELECT * FROM sales;"; // Replace 'sales' with your table name
    db.all(query, [], (err, rows) => {
        if (err) {
            console.error("Error running query:", err.message);
            res.status(500).json({ error: "Query failed" });
        } else {
            res.json(rows); // Send the query result as JSON
        }
    });

    db.close((err) => {
        if (err) {
            console.error("Error closing database:", err.message);
        }
    });
});

// Catch-all route to serve the main HTML file
app.get('/*', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'client', 'index.html'));
});


// Start the server
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});