const express = require('express');
const router = express.Router();
const db = require('../config/db.js');

// Helper function for validation
const validateName = (name) => {
    if (!name || name.trim() === '') {
        return 'Name is required and cannot be empty.';
    }
    if (name.length < 5) { 
        return 'Name must be 5 characters';
    }
    return null;
};

// POST /full-name - Add a new name
router.post('/full-name', (req, res) => {
    const { name } = req.body;

    // Validate name
    const validationError = validateName(name);
    if (validationError) {
        return res.status(400).json({ message: validationError });
    }

    const sql = 'INSERT INTO name (name) VALUES (?)';
    db.query(sql, [name], (err, result) => {
        if (err) {
            return res.status(500).json({ message: 'Database error', error: err });
        }
        res.status(200).json({ message: 'Name added successfully', nameId: result.insertId });
    });
});

// GET /full-name - Get all names
router.get('/full-name', (req, res) => {
    const sql = 'SELECT * FROM name';
    db.query(sql, (err, results) => {
        if (err) {
            return res.status(500).json({ message: 'Database error', error: err });
        }
        res.status(200).json(results);
    });
});

// GET /full-name/:id - Get a name by ID
router.get('/full-name/:id', (req, res) => {
    const { id } = req.params;
    const sql = 'SELECT * FROM name WHERE id = ?';
    db.query(sql, [id], (err, result) => {
        if (err) {
            return res.status(500).json({ message: 'Database error', error: err });
        }
        if (result.length === 0) {
            return res.status(404).json({ message: 'Name not found' });
        }
        res.status(200).json(result[0]);
    });
});

// PUT /full-name/:id - Update a name by ID
router.put('/full-name/:id', (req, res) => {
    const { id } = req.params;
    const { name } = req.body;

    // Validate name
    const validationError = validateName(name);
    if (validationError) {
        return res.status(400).json({ message: validationError });
    }

    const sql = 'UPDATE name SET name = ? WHERE id = ?';
    db.query(sql, [name, id], (err, result) => {
        if (err) {
            return res.status(500).json({ message: 'Database error', error: err });
        }
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Name not found' });
        }
        res.status(200).json({ message: 'Name updated successfully' });
    });
});

// DELETE /full-name/:id - Delete a name by ID
router.delete('/full-name/:id', (req, res) => {
    const { id } = req.params;
    const sql = 'DELETE FROM name WHERE id = ?';
    db.query(sql, [id], (err, result) => {
        if (err) {
            return res.status(500).json({ message: 'Database error', error: err });
        }
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Name not found' });
        }
        res.status(200).json({ message: 'Name deleted successfully' });
    });
});

module.exports = router;
