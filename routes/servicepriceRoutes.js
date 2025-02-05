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

// Add Service
router.post('/price-services', (req, res) => {
    const { name, price } = req.body;

    // Validate name and price
    if (!name || !price) {
        return res.status(400).json({ message: 'Name and price are required' });
    }

    const query = `INSERT INTO price_services (name, price) VALUES (?, ?)`;
    db.query(query, [name, price], (err, result) => {
        if (err) {
            res.status(500).json({ message: 'Error adding service', error: err });
        } else {
            res.status(201).json({ message: 'Service added successfully', id: result.insertId });
        }
    });
});

// Get All Services
router.get('/price-services', (req, res) => {
    const query = `SELECT * FROM price_services`;
    db.query(query, (err, results) => {
        if (err) {
            res.status(500).json({ message: 'Error fetching services', error: err });
        } else {
            res.status(200).json(results);
        }
    });
});

// Get a single service by ID
router.get('/price-services/:id', (req, res) => {
    const { id } = req.params;
    const query = `SELECT * FROM price_services WHERE id = ?`;
    db.query(query, [id], (err, results) => {
        if (err) {
            res.status(500).json({ message: 'Error fetching service by ID', error: err });
        } else if (results.length === 0) {
            res.status(404).json({ message: 'Service not found' });
        } else {
            res.status(200).json(results[0]);
        }
    });
});

// Update Service
router.put('/price-services/:id', (req, res) => {
    const { id } = req.params;
    const { name, price } = req.body;

    // Debug: log the request body
    console.log('Request Body:', req.body);

    // Validate name and price
    if (!name || !price) {
        return res.status(400).json({ message: 'Name and price are required' });
    }

    const query = `UPDATE price_services SET name = ?, price = ? WHERE id = ?`;
    db.query(query, [name, price, id], (err) => {
        if (err) {
            res.status(500).json({ message: 'Error updating service', error: err });
        } else {
            res.status(200).json({ message: 'Service updated successfully' });
        }
    });
});


// Delete Service
router.delete('/price-services/:id', (req, res) => {
    const { id } = req.params;
    const query = `DELETE FROM price_services WHERE id = ?`;
    db.query(query, [id], (err) => {
        if (err) {
            res.status(500).json({ message: 'Error deleting service', error: err });
        } else {
            res.status(200).json({ message: 'Service deleted successfully' });
        }
    });
});

// Routes for sub_services (sub-services)

// Add Sub-Service
router.post('/sub-services', upload.single('img'), (req, res) => {
    const { service_id, name, color } = req.body;
    const img = req.file ? `/uploads/${req.file.filename}` : null;

    // Remove extra spaces around the color
    const cleanColor = color.trim();

    const query = `INSERT INTO sub_services (service_id, name, img, color) VALUES (?, ?, ?, ?)`;
    db.query(query, [service_id, name, img, cleanColor], (err, result) => {
        if (err) {
            res.status(500).json({ message: 'Error adding sub-service', error: err });
        } else {
            res.status(201).json({ message: 'Sub-service added successfully', id: result.insertId });
        }
    });
});

// Get all sub-services
router.get('/sub-services', (req, res) => {
    const query = `SELECT * FROM sub_services`;
    db.query(query, (err, results) => {
        if (err) {
            res.status(500).json({ message: 'Error fetching sub-services', error: err });
        } else {
            res.status(200).json(results);
        }
    });
});

// Get Sub-Services by Service ID
router.get('/price-services/:id/sub-services', (req, res) => {
    const { id } = req.params;
    const query = `SELECT * FROM sub_services WHERE service_id = ?`;
    db.query(query, [id], (err, results) => {
        if (err) {
            res.status(500).json({ message: 'Error fetching sub-services', error: err });
        } else {
            res.status(200).json(results);
        }
    });
});

// Update Sub-Service
router.put('/sub-services/:id', upload.single('img'), (req, res) => {
    const { id } = req.params;
    const { name, color } = req.body;
    const img = req.file ? `/uploads/${req.file.filename}` : null;

    let query = `UPDATE sub_services SET name = ?, color = ?`;
    const values = [name, color.trim()];  // Clean color value to remove spaces

    if (img) {
        query += `, img = ?`;
        values.push(img);
    }

    query += ` WHERE id = ?`;
    values.push(id);

    db.query(query, values, (err) => {
        if (err) {
            res.status(500).json({ message: 'Error updating sub-service', error: err });
        } else {
            res.status(200).json({ message: 'Sub-service updated successfully' });
        }
    });
});

// Delete Sub-Service
router.delete('/sub-services/:id', (req, res) => {
    const { id } = req.params;
    const query = `DELETE FROM sub_services WHERE id = ?`;
    db.query(query, [id], (err) => {
        if (err) {
            res.status(500).json({ message: 'Error deleting sub-service', error: err });
        } else {
            res.status(200).json({ message: 'Sub-service deleted successfully' });
        }
    });
});

// Get All Services with their Sub-Services and IDs
// router.get('/price-sub-services', (req, res) => {
//     const query = `
//         SELECT price_services.id AS service_id, price_services.name AS service_name, price_services.price,
//               JSON_ARRAYAGG(
//                   JSON_OBJECT('id', sub_services.id, 'name', sub_services.name, 'color', sub_services.color, 'img', sub_services.img)
//               ) AS sub_services
//         FROM price_services
//         LEFT JOIN sub_services ON price_services.id = sub_services.service_id
//         GROUP BY price_services.id;
//     `;

//     db.query(query, (err, results) => {
//         if (err) {
//             res.status(500).json({ message: 'Error fetching services with sub-services', error: err });
//         } else {
//             res.status(200).json(results);
//         }
//     });
// });
router.get('/price-sub-services', (req, res) => {
    const query = `
        SELECT 
            price_services.id AS service_id, 
            price_services.name AS service_name, 
            price_services.price,
            JSON_ARRAYAGG(
                JSON_OBJECT('id', sub_services.id, 'img', sub_services.img, 'name', sub_services.name, 'color', sub_services.color)
            ) AS sub_services
        FROM price_services
        LEFT JOIN sub_services ON price_services.id = sub_services.service_id
        GROUP BY price_services.id;
    `;

    db.query(query, (err, results) => {
        if (err) {
            res.status(500).json({ message: 'Error fetching services and sub-services', error: err });
        } else {
            // Ensure proper parsing of JSON strings
            const formattedResults = results.map(service => {
                return {
                    service_id: service.service_id,
                    service_name: service.service_name,
                    price: service.price,
                    sub_services: service.sub_services ? JSON.parse(service.sub_services) : [] // Parse or default to an empty array
                };
            });
            res.status(200).json(formattedResults);
        }
    });
});


// Get a single service by ID with its sub-services
// router.get('/price-sub-services/:id', (req, res) => {
//     const { id } = req.params;

//     const query = `
//         SELECT price_services.id AS service_id, price_services.name AS service_name, price_services.price,
//               JSON_ARRAYAGG(
//                   JSON_OBJECT('id', sub_services.id, 'name', sub_services.name, 'color', sub_services.color, 'img', sub_services.img)
//               ) AS sub_services
//         FROM price_services
//         LEFT JOIN sub_services ON price_services.id = sub_services.service_id
//         WHERE price_services.id = ?
//         GROUP BY price_services.id;
//     `;

//     db.query(query, [id], (err, results) => {
//         if (err) {
//             res.status(500).json({ message: 'Error fetching service and sub-services', error: err });
//         } else if (results.length === 0) {
//             res.status(404).json({ message: 'Service not found' });
//         } else {
//             res.status(200).json(results[0]); 
//         }
//     });
// });


router.get('/price-sub-services/:id', (req, res) => {
    const { id } = req.params;

    const query = `
        SELECT 
            price_services.id AS service_id, 
            price_services.name AS service_name, 
            price_services.price,
            JSON_ARRAYAGG(
                JSON_OBJECT(
                    'id', sub_services.id, 
                    'img', sub_services.img, 
                    'name', sub_services.name, 
                    'color', sub_services.color
                )
            ) AS sub_services
        FROM price_services
        LEFT JOIN sub_services ON price_services.id = sub_services.service_id
        WHERE price_services.id = ?
        GROUP BY price_services.id;
    `;

    db.query(query, [id], (err, results) => {
        if (err) {
            res.status(500).json({ message: 'Error fetching service and sub-services', error: err });
        } else if (results.length === 0) {
            res.status(404).json({ message: 'Service not found' });
        } else {
            const service = results[0];
            const formattedResponse = {
                service_id: service.service_id,
                service_name: service.service_name,
                price: service.price,
                sub_services: service.sub_services ? JSON.parse(service.sub_services) : []
            };
            res.status(200).json(formattedResponse);
        }
    });
});


module.exports = router;
