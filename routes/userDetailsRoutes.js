const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const router = express.Router();
const db = require('../config/db.js'); 

// Middleware for file upload
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname)); 
    },
});

const upload = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB file size limit
});

// Validation function for different fields
const validateField = (fieldName, value) => {
    // Check if the value is empty
    if (!value || value.trim() === '') {
        return `${fieldName} is required.`;
    }

    // Switch case to handle different fields
    switch (fieldName) {
        
        case 'userName':
            // Ensure userName is at least 3 characters long
            if (value.length < 3) {
                return 'Name must be at least 3 characters long.';
            }
            // Ensure userName contains only alphabets and spaces (for basic validation)
            const userNameRegex = /^[a-zA-Z\s]+$/;
            if (!userNameRegex.test(value)) {
                return 'Username must only contain letters and spaces.';
            }
            break;

        case 'email':
            // Validate email format using regular expression
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(value)) {
                return 'Invalid email format.';
            }
            break;

        case 'mobileNo':
            // Validate Indian mobile number (10 digits, starting with 6-9)
            const mobileRegex = /^[6-9]\d{9}$/;
            if (!mobileRegex.test(value)) {
                return 'Mobile number must be a valid 10-digit number starting with 6-9.';
            }
            break;

        case 'aadharNo':
            // Validate Aadhar number (12 digits)
            const aadharRegex = /^\d{12}$/;
            if (!aadharRegex.test(value)) {
                return 'Aadhar number must be a 12-digit numeric value.';
            }
            break;

        case 'password':
            // Ensure password is at least 6 characters long
            if (value.length < 6) {
                return 'Password must be at least 6 characters long.';
            }
            break;

        default:
            return null;
    }
    
    return null; // No error found
};

// User creation route
router.post('/user', upload.single('userImg'), (req, res) => {
    const { user_name, email, mobile_no, aadhar_no, password } = req.body;

    // Validate fields
    let validationErrors = [];
    validationErrors.push(validateField('userName', user_name));
    validationErrors.push(validateField('email', email));
    validationErrors.push(validateField('mobileNo', mobile_no));
    validationErrors.push(validateField('aadharNo', aadhar_no));
    validationErrors.push(validateField('password', password));

    // Filter out null values from validation errors
    validationErrors = validationErrors.filter(error => error !== null);

    // If there are validation errors, return them
    if (validationErrors.length > 0) {
        return res.status(400).json({ message: validationErrors.join(' ') });
    }

    // Process image path if uploaded
    const imagePath = req.file ? `/uploads/${req.file.filename}` : null;

    // SQL query to insert user
    const sql = 'INSERT INTO users (userImg, userName, email, mobileNo, aadharNo, password) VALUES (?, ?, ?, ?, ?, ?)';
    db.query(sql, [imagePath, user_name, email, mobile_no, aadhar_no, password], (err, result) => {
        if (err) {
            return res.status(500).json({ message: 'Database error', error: err });
        }
        res.status(200).json({ message: 'User added successfully', userId: result.insertId });
    });
});

// Fetch all users
router.get('/user', (req, res) => {
    const sql = 'SELECT * FROM users';
    db.query(sql, (err, results) => {
        if (err) {
            return res.status(500).json({ message: 'Database error', error: err });
        }
        res.status(200).json(results);
    });
});

// Fetch a specific user by ID
router.get('/user/:id', (req, res) => {
    const { id } = req.params;
    const sql = 'SELECT * FROM users WHERE id = ?';
    db.query(sql, [id], (err, result) => {
        if (err) {
            return res.status(500).json({ message: 'Database error', error: err });
        }
        if (result.length === 0) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.status(200).json(result[0]);
    });
});

// Update user details
router.put('/user/:id', upload.single('userImage'), (req, res) => {
    const { id } = req.params;
    const { user_name, email, mobile_no, aadhar_no, password } = req.body;

    // Validate fields
    let validationErrors = [];
    validationErrors.push(validateField('userName', user_name));
    validationErrors.push(validateField('email', email));
    validationErrors.push(validateField('mobileNo', mobile_no));
    validationErrors.push(validateField('aadharNo', aadhar_no));
    validationErrors.push(validateField('password', password));

    // Filter out null values from validation errors
    validationErrors = validationErrors.filter(error => error !== null);

    // If there are validation errors, return them
    if (validationErrors.length > 0) {
        return res.status(400).json({ message: validationErrors.join(' ') });
    }

    let updateSql = 'UPDATE users SET';
    const updateParams = [];

    // Dynamically build the update SQL query
    if (user_name) {
        updateSql += updateParams.length > 0 ? ', userName = ?' : ' userName = ?';
        updateParams.push(user_name);
    }
    if (email) {
        updateSql += updateParams.length > 0 ? ', email = ?' : ' email = ?';
        updateParams.push(email);
    }

    if (mobile_no) {
        updateSql += updateParams.length > 0 ? ', mobileNo = ?' : ' mobileNo = ?';
        updateParams.push(mobile_no);
    }

    if (aadhar_no) {
        updateSql += updateParams.length > 0 ? ', aadharNo = ?' : ' aadharNo = ?';
        updateParams.push(aadhar_no);
    }

    if (password) {
        updateSql += updateParams.length > 0 ? ', password = ?' : ' password = ?';
        updateParams.push(password);
    }

    let imagePath;
    if (req.file) {
        imagePath = `/uploads/${req.file.filename}`;
        updateSql += updateParams.length > 0 ? ', userImg = ?' : ' userImg = ?';
        updateParams.push(imagePath);
    }

    if (updateParams.length === 0) {
        return res.status(400).json({ message: 'No fields to update' });
    }

    updateSql += ' WHERE id = ?';
    updateParams.push(id);

    // Fetch old image path before update
    const selectSql = 'SELECT userImg FROM users WHERE id = ?';
    db.query(selectSql, [id], (err, result) => {
        if (err) {
            return res.status(500).json({ message: 'Database error', error: err });
        }
        if (result.length === 0) {
            return res.status(404).json({ message: 'User not found' });
        }

        const oldImagePath = result[0].userImg;

        // Update user data in the database
        db.query(updateSql, updateParams, (err, updateResult) => {
            if (err) {
                return res.status(500).json({ message: 'Database error', error: err });
            }

            // If an image was uploaded, delete the old image
            if (req.file && oldImagePath) {
                const fullPath = path.join(__dirname, '..', oldImagePath.replace(/^\//, ''));
                fs.unlink(fullPath, (fsErr) => {
                    if (fsErr) {
                        console.error('Error deleting old image:', fsErr);
                    }
                });
            }

            res.status(200).json({ message: 'User updated successfully' });
        });
    });
});

// Delete user by ID
router.delete('/user/:id', (req, res) => {
    const { id } = req.params;

    // Fetch the image path of the user before deletion
    const selectSql = 'SELECT userImg FROM users WHERE id = ?';
    db.query(selectSql, [id], (err, result) => {
        if (err) {
            return res.status(500).json({ message: 'Database error', error: err });
        }
        if (result.length === 0) {
            return res.status(404).json({ message: 'User not found' });
        }

        const imagePath = result[0].userImg;

        // Delete the user from the database
        const deleteSql = 'DELETE FROM users WHERE id = ?';
        db.query(deleteSql, [id], (err, deleteResult) => {
            if (err) {
                return res.status(500).json({ message: 'Database error', error: err });
            }

            // Delete the user's image file if it exists
            if (imagePath) {
                const fullPath = path.join(__dirname, '..', imagePath.replace(/^\//, ''));
                fs.unlink(fullPath, (fsErr) => {
                    if (fsErr) {
                        console.error('Error deleting image file:', fsErr);
                    }
                });
            }

            res.status(200).json({ message: 'User deleted successfully' });
        });
    });
});

module.exports = router;
