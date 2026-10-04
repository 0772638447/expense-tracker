// Expense Tracker - backend (Express API + PostgreSQL)
//
// PHASE 1
// Setup:
//   1. Create a database named expense_tracker and run schema.sql on it.
//   2. Copy .env.example to a new file named .env and write your PostgreSQL password.
//   3. npm install express cors pg dotenv
// Run:    node server.js   (restart it every time you change this file)
//
// Endpoints you need to build:
//   GET    /api/expenses        return all expenses
//   GET    /api/expenses/:id    return one expense (404 if not found)
//   POST   /api/expenses        add an expense (201, or 400 if the data is invalid)
//   PUT    /api/expenses/:id    update an expense (200, 400, or 404)
//   DELETE /api/expenses/:id    delete an expense (200, or 404)
//
// Tips:
//   - Create one Pool (from the "pg" library) with the values from .env,
//     and use pool.query(...) in every route.
//   - ALWAYS send the values as parameters: pool.query("... WHERE id = $1", [id]).
//     NEVER build the SQL text by joining strings with data from the user.
//   - Use RETURNING to get the new (or updated) row back from INSERT and UPDATE.
//   - The database creates the id. The client never sends one.
//   - pg returns NUMERIC as text and DATE as a JavaScript Date, so fix both in your SELECT.
//     Hint: amount::float8 and to_char(date, 'YYYY-MM-DD').
//   - Validate the data before the query, and answer 400 with a message that explains the problem.
//   - Check the id before the query. A text like "abc" makes PostgreSQL throw an error.
//   - Enable CORS so the frontend can talk to the server.
//   - Test every endpoint with Thunder Client BEFORE you connect the frontend.
const express = require('express');
const cors = require('cors');

const { Pool } = require('pg');
require('dotenv').config();

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

// Configure database connection using pg Pool
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || 'postgres',
  password: String(process.env.DB_PASSWORD || ''), // تحويل الباسورد لنص لتجنب أخطاء SCRAM
  database: process.env.DB_NAME || 'expense_tracker',
});

// Allowed categories for validation
const ALLOWED_CATEGORIES = ['Food', 'Transport', 'Bills', 'Entertainment', 'Other'];

// ==========================================
// ENDPOINTS
// ==========================================

// 1. GET /api/expenses - Fetch all expenses
app.get('/api/expenses', async (req, res) => {
  try {
    const query = `
      SELECT id, title, amount::float8, category, to_char(date, 'YYYY-MM-DD') AS date 
      FROM expenses 
      ORDER BY date DESC, id DESC
    `;
    const result = await pool.query(query);
    res.status(200).json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// 2. GET /api/expenses/:id - Fetch a single expense by ID
app.get('/api/expenses/:id', async (req, res) => {
  const { id } = req.params;

  if (isNaN(id)) {
    return res.status(400).json({ message: 'Invalid ID parameter. Must be a number.' });
  }

  try {
    const query = `
      SELECT id, title, amount::float8, category, to_char(date, 'YYYY-MM-DD') AS date 
      FROM expenses 
      WHERE id = $1
    `;
    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Expense not found' });
    }

    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// 3. POST /api/expenses - Add a new expense
app.post('/api/expenses', async (req, res) => {
  const { title, amount, category, date } = req.body;

  if (!title || typeof title !== 'string' || title.trim() === '') {
    return res.status(400).json({ message: 'Title is required and must be a non-empty string.' });
  }
  if (!amount || isNaN(amount) || Number(amount) <= 0) {
    return res.status(400).json({ message: 'Amount is required and must be a number greater than zero.' });
  }
  if (!category || !ALLOWED_CATEGORIES.includes(category)) {
    return res.status(400).json({ message: `Category must be one of: ${ALLOWED_CATEGORIES.join(', ')}` });
  }
  if (!date || isNaN(Date.parse(date))) {
    return res.status(400).json({ message: 'Valid date is required.' });
  }

  try {
    const query = `
      INSERT INTO expenses (title, amount, category, date) 
      VALUES ($1, $2, $3, $4) 
      RETURNING id, title, amount::float8, category, to_char(date, 'YYYY-MM-DD') AS date
    `;
    const values = [title.trim(), amount, category, date];
    const result = await pool.query(query, values);

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to add expense' });
  }
});

// 4. PUT /api/expenses/:id - Update an existing expense
app.put('/api/expenses/:id', async (req, res) => {
  const { id } = req.params;
  const { title, amount, category, date } = req.body;

  if (isNaN(id)) {
    return res.status(400).json({ message: 'Invalid ID parameter. Must be a number.' });
  }

  if (!title || typeof title !== 'string' || title.trim() === '') {
    return res.status(400).json({ message: 'Title is required and must be a non-empty string.' });
  }
  if (!amount || isNaN(amount) || Number(amount) <= 0) {
    return res.status(400).json({ message: 'Amount is required and must be a number greater than zero.' });
  }
  if (!category || !ALLOWED_CATEGORIES.includes(category)) {
    return res.status(400).json({ message: `Category must be one of: ${ALLOWED_CATEGORIES.join(', ')}` });
  }
  if (!date || isNaN(Date.parse(date))) {
    return res.status(400).json({ message: 'Valid date is required.' });
  }

  try {
    const query = `
      UPDATE expenses 
      SET title = $1, amount = $2, category = $3, date = $4 
      WHERE id = $5 
      RETURNING id, title, amount::float8, category, to_char(date, 'YYYY-MM-DD') AS date
    `;
    const values = [title.trim(), amount, category, date, id];
    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Expense not found to update' });
    }

    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to update expense' });
  }
});

// 5. DELETE /api/expenses/:id - Delete an expense
app.delete('/api/expenses/:id', async (req, res) => {
  const { id } = req.params;

  if (isNaN(id)) {
    return res.status(400).json({ message: 'Invalid ID parameter. Must be a number.' });
  }

  try {
    const query = 'DELETE FROM expenses WHERE id = $1 RETURNING id';
    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Expense not found to delete' });
    }

    res.status(200).json({ message: 'Expense deleted successfully', id: Number(id) });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to delete expense' });
  }
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});