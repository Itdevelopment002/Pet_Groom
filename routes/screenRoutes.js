const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const router = express.Router();
const db = require('../config/db.js');

// Multer setup for image uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/'); // Folder to store images
    },
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}_${file.originalname}`);
    },
});

const upload = multer({
    storage: storage,
    fileFilter: (req, file, cb) => {
        const fileTypes = /jpeg|jpg|png/;
        const extname = fileTypes.test(path.extname(file.originalname).toLowerCase());
        const mimeType = fileTypes.test(file.mimetype);

        if (extname && mimeType) {
            cb(null, true);
        } else {
            cb(new Error('Only images are allowed!'));
        }
    },
});

// Routes

// Create a new screen
router.post('/screens', upload.fields([{ name: 'image' }, { name: 'detailsimage' }]), (req, res) => {
    const { name, description } = req.body;
    const image = req.files['image'] ? `/uploads/${req.files['image'][0].filename}` : null;
    const detailsimage = req.files['detailsimage'] ? `/uploads/${req.files['detailsimage'][0].filename}` : null;

    if (!name || !image || !detailsimage || !description) {
        return res.status(400).json({ message: 'Name, image, detailsimage, and description are required' });
    }

    const sql = 'INSERT INTO screens (name, image, detailsimage, description) VALUES (?, ?, ?, ?)';
    db.query(sql, [name, image, detailsimage, description], (err, result) => {
        if (err) {
            return res.status(500).json({ message: 'Database error', error: err });
        }
        res.status(201).json({ message: 'Screen added successfully', id: result.insertId });
    });
});

// Retrieve all screens
router.get('/screens', (req, res) => {
    const sql = 'SELECT * FROM screens';
    db.query(sql, (err, results) => {
        if (err) {
            return res.status(500).json({ message: 'Database error', error: err });
        }
        res.status(200).json(results);
    });
});

// Retrieve a specific screen by ID
router.get('/screens/:id', (req, res) => {
    const { id } = req.params;

    const sql = 'SELECT * FROM screens WHERE id = ?';
    db.query(sql, [id], (err, results) => {
        if (err) {
            return res.status(500).json({ message: 'Database error', error: err });
        }
        if (results.length === 0) {
            return res.status(404).json({ message: 'Screen not found' });
        }
        res.status(200).json(results[0]);
    });
});

// Update a screen
router.put('/screens/:id', upload.fields([{ name: 'image' }, { name: 'detailsimage' }]), (req, res) => {
    const { id } = req.params;
    const { name, description } = req.body;
    const image = req.files['image'] ? `/uploads/${req.files['image'][0].filename}` : null;
    const detailsimage = req.files['detailsimage'] ? `/uploads/${req.files['detailsimage'][0].filename}` : null;

    const sql = 'UPDATE screens SET name = ?, image = ?, detailsimage = ?, description = ? WHERE id = ?';
    db.query(sql, [name, image, detailsimage, description, id], (err, result) => {
        if (err) {
            return res.status(500).json({ message: 'Database error', error: err });
        }
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Screen not found' });
        }
        res.status(200).json({ message: 'Screen updated successfully' });
    });
});

// Delete a screen
router.delete('/screens/:id', (req, res) => {
    const { id } = req.params;

    const sql = 'DELETE FROM screens WHERE id = ?';
    db.query(sql, [id], (err, result) => {
        if (err) {
            return res.status(500).json({ message: 'Database error', error: err });
        }
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Screen not found' });
        }
        res.status(200).json({ message: 'Screen deleted successfully' });
    });
});

module.exports = router;
