const express = require('express');
const router = express.Router();
const db = require('../config/db.js');

// Add a New Contact
router.post('/contactdetails', (req, res) => {
    const { name, email, message } = req.body;

    if (!name || !email || !message) {
        return res.status(400).json({ message: 'All fields are required' });
    }

    const sql = 'INSERT INTO contactdetails (name, email, message) VALUES (?, ?, ?)';
    db.query(sql, [name, email, message], (err, result) => {
        if (err) {
            return res.status(500).json({ message: 'Database error', error: err });
        }
        res.status(201).json({ message: 'Contact added successfully', id: result.insertId });
    });
});

// Retrieve All Contacts
router.get('/contactdetails', (req, res) => {
    const sql = 'SELECT * FROM contactdetails ORDER BY created_at DESC';
    db.query(sql, (err, results) => {
        if (err) {
            return res.status(500).json({ message: 'Database error', error: err });
        }
        res.status(200).json(results);
    });
});

// Retrieve a Specific Contact by ID
router.get('/contactdetails/:id', (req, res) => {
    const { id } = req.params;

    const sql = 'SELECT * FROM contactdetails WHERE id = ?';
    db.query(sql, [id], (err, results) => {
        if (err) {
            return res.status(500).json({ message: 'Database error', error: err });
        }
        if (results.length === 0) {
            return res.status(404).json({ message: 'Contact not found' });
        }
        res.status(200).json(results[0]);
    });
});

// Update a Contact
router.put('/contactdetails/:id', (req, res) => {
    const { id } = req.params;
    const { name, email, message } = req.body;

    if (!name || !email || !message) {
        return res.status(400).json({ message: 'All fields are required' });
    }

    const sql = `
        UPDATE contactdetails 
        SET name = ?, email = ?, message = ?
        WHERE id = ?
    `;
    db.query(sql, [name, email, message, id], (err, result) => {
        if (err) {
            return res.status(500).json({ message: 'Database error', error: err });
        }
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Contact not found' });
        }
        res.status(200).json({ message: 'Contact updated successfully' });
    });
});

// Delete a Contact
router.delete('/contactdetails/:id', (req, res) => {
    const { id } = req.params;

    const sql = 'DELETE FROM contactdetails WHERE id = ?';
    db.query(sql, [id], (err, result) => {
        if (err) {
            return res.status(500).json({ message: 'Database error', error: err });
        }
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Contact not found' });
        }
        res.status(200).json({ message: 'Contact deleted successfully' });
    });
});

module.exports = router;
