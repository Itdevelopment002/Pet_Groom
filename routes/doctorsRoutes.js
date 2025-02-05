const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const router = express.Router();
const db = require('../config/db.js');



// Multer Setup for Image Uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
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

// Add a New Doctor
router.post('/doctors', upload.single('image'), (req, res) => {
    const { doctor_name, title, year_of_experience } = req.body;
    const image = req.file ? `/uploads/${req.file.filename}` : null;

    if (!doctor_name || !title || !year_of_experience || !image) {
        return res.status(400).json({ message: 'All fields are required' });
    }

    const sql = 'INSERT INTO doctors (image, doctor_name, title, year_of_experience) VALUES (?, ?, ?, ?)';
    db.query(sql, [image, doctor_name, title, year_of_experience], (err, result) => {
        if (err) {
            return res.status(500).json({ message: 'Database error', error: err });
        }
        res.status(201).json({ message: 'Doctor added successfully', id: result.insertId });
    });
});

// Retrieve All Doctors
router.get('/doctors', (req, res) => {
    const sql = 'SELECT * FROM doctors';
    db.query(sql, (err, results) => {
        if (err) {
            return res.status(500).json({ message: 'Database error', error: err });
        }
        res.status(200).json(results);
    });
});

// Retrieve a Specific Doctor by ID
router.get('/doctors/:id', (req, res) => {
    const { id } = req.params;

    const sql = 'SELECT * FROM doctors WHERE id = ?';
    db.query(sql, [id], (err, results) => {
        if (err) {
            return res.status(500).json({ message: 'Database error', error: err });
        }
        if (results.length === 0) {
            return res.status(404).json({ message: 'Doctor not found' });
        }
        res.status(200).json(results[0]);
    });
});

// Update Doctor Details
router.put('/doctors/:id', upload.single('image'), (req, res) => {
    const { id } = req.params;
    const { doctor_name, title, year_of_experience } = req.body;
    const image = req.file ? `/uploads/${req.file.filename}` : null;

    const sql = `
        UPDATE doctors 
        SET doctor_name = ?, title = ?, year_of_experience = ?, image = ?
        WHERE id = ?
    `;
    db.query(sql, [doctor_name, title, year_of_experience, image, id], (err, result) => {
        if (err) {
            return res.status(500).json({ message: 'Database error', error: err });
        }
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Doctor not found' });
        }
        res.status(200).json({ message: 'Doctor updated successfully' });
    });
});

// Delete a Doctor
router.delete('/doctors/:id', (req, res) => {
    const { id } = req.params;

    const sql = 'DELETE FROM doctors WHERE id = ?';
    db.query(sql, [id], (err, result) => {
        if (err) {
            return res.status(500).json({ message: 'Database error', error: err });
        }
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Doctor not found' });
        }
        res.status(200).json({ message: 'Doctor deleted successfully' });
    });
});

module.exports = router;
