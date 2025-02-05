const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const router = express.Router();
const db = require('../config/db.js');


const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir);
}


const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadsDir); 
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname)); 
    }
});

const upload = multer({
    storage: storage,
    fileFilter: (req, file, cb) => {
        const fileTypes = /jpeg|jpg|png/;
        const extName = fileTypes.test(path.extname(file.originalname).toLowerCase());
        const mimeType = fileTypes.test(file.mimetype);
        if (extName && mimeType) {
            return cb(null, true);
        } else {
            cb(new Error('Only JPEG, JPG, and PNG files are allowed'));
        }
    }
}).single('photo'); 

// Error handling for multer errors
router.use((err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        return res.status(400).json({ message: 'Multer error', error: err.message });
    }
    if (err.message) {
        return res.status(400).json({ message: err.message });
    }
    next(err);  // Pass to default error handler
});

// Add a new groomer with image upload and validation
router.post('/groomer', upload, (req, res) => {
    const { name, yearsOfExperience } = req.body;
    let validationErrors = [];

    // Validate name
    if (!name) {
        validationErrors.push('Name is required');
    } else if (name.length < 3) {
        validationErrors.push('Name should be at least 3 characters long');
    }

    // Validate years of experience
    if (!yearsOfExperience) {
        validationErrors.push('Years of experience are required');
    } else if (isNaN(yearsOfExperience) || yearsOfExperience <= 0) {
        validationErrors.push('Years of experience must be a positive number');
    }

    // Validate photo
    if (!req.file) {
        validationErrors.push('Photo is required');
    }
    const photo = req.file ? `/uploads/${req.file.filename}` : null;

    // If there are validation errors, send a response
    if (validationErrors.length > 0) {
        return res.status(400).json({ message: 'Validation errors', errors: validationErrors });
    }

    // Insert into database
    const sql = 'INSERT INTO groomers (name, years_of_experience, photo) VALUES (?, ?, ?)';
    db.query(sql, [name, yearsOfExperience, photo], (err, result) => {
        if (err) {
            console.error('Database Error:', err);
            return res.status(500).json({ message: 'Database error', error: err });
        }
        res.status(201).json({ message: 'Groomer added successfully', groomerId: result.insertId });
    });
});

// Get all groomers
router.get('/groomers', (req, res) => {
    const sql = 'SELECT * FROM groomers';
    db.query(sql, (err, results) => {
        if (err) {
            console.error('Database Error:', err);
            return res.status(500).json({ message: 'Database error', error: err });
        }
        res.status(200).json({ message: 'Groomers fetched successfully', groomers: results });
    });
});

// Get groomer by ID
router.get('/groomer/:id', (req, res) => {
    const { id } = req.params;

    const sql = 'SELECT * FROM groomers WHERE id = ?';
    db.query(sql, [id], (err, result) => {
        if (err) {
            console.error('Database Error:', err);
            return res.status(500).json({ message: 'Database error', error: err });
        }

        if (result.length === 0) {
            return res.status(404).json({ message: 'Groomer not found' });
        }

        res.status(200).json({ message: 'Groomer fetched successfully', groomer: result[0] });
    });
});

// Update groomer details with optional image upload and validation
router.put('/groomers/:id', upload, (req, res) => {
    const { id } = req.params;
    const { name, yearsOfExperience } = req.body;
    let validationErrors = [];

    // Validate name
    if (!name) {
        validationErrors.push('Name is required');
    } else if (name.length < 3) {
        validationErrors.push('Name should be at least 3 characters long');
    }

    // Validate years of experience
    if (!yearsOfExperience) {
        validationErrors.push('Years of experience are required');
    } else if (isNaN(yearsOfExperience) || yearsOfExperience <= 0) {
        validationErrors.push('Years of experience must be a positive number');
    }

    // If no new photo is uploaded, keep the old one
    let photo = req.file ? `/uploads/${req.file.filename}` : null;

    // If there are validation errors, send a response
    if (validationErrors.length > 0) {
        return res.status(400).json({ message: 'Validation errors', errors: validationErrors });
    }

    // Update query, using COALESCE to keep the old photo if no new one is provided
    const sql = `UPDATE groomers SET name = ?, years_of_experience = ?, photo = COALESCE(?, photo) WHERE id = ?`;
    db.query(sql, [name, yearsOfExperience, photo, id], (err, result) => {
        if (err) {
            console.error('Database Error:', err);
            return res.status(500).json({ message: 'Database error', error: err });
        }
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Groomer not found' });
        }
        res.status(200).json({ message: 'Groomer updated successfully' });
    });
});

// Delete a groomer
router.delete('/groomers/:id', (req, res) => {
    const { id } = req.params;

    const sql = 'DELETE FROM groomers WHERE id = ?';
    db.query(sql, [id], (err, result) => {
        if (err) {
            console.error('Database Error:', err);
            return res.status(500).json({ message: 'Database error', error: err });
        }
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Groomer not found' });
        }
        res.status(200).json({ message: 'Groomer deleted successfully' });
    });
});

module.exports = router;
