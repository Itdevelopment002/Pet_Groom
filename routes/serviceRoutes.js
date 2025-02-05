const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const router = express.Router();
const db = require("../config/db.js");

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
});

// === CATEGORY ROUTES ===

// Add Category
router.post("/category", upload.single("categoryImg"), (req, res) => {
  const { categoryName, description, price, colorcode } = req.body;

  if (!categoryName) {
    return res.status(400).json({ message: "Category name is required" });
  }

  const imagePath = req.file ? `/uploads/${req.file.filename}` : null;

  const sql =
    "INSERT INTO categories (categoryName, categoryImg,description,price,colorcode) VALUES (?, ?,?,?,?)";
  db.query(sql, [categoryName, imagePath, description, price, colorcode], (err, result) => {
    if (err) {
      return res.status(500).json({ message: "Database error", error: err });
    }
    res
      .status(200)
      .json({
        message: "Category added successfully",
        categoryId: result.insertId,
      });
  });
});

// Get All Categories
router.get("/categories", (req, res) => {
  const sql = "SELECT * FROM categories";
  db.query(sql, (err, results) => {
    if (err) {
      return res.status(500).json({ message: "Database error", error: err });
    }
    res.status(200).json(results);
  });
});

// Update Category
router.put("/category/:id", upload.single("categoryImg"), (req, res) => {
  const { id } = req.params;
  const { categoryName,description,price,colorcode } = req.body;

  let updateSql = "UPDATE categories SET";
  const updateParams = [];

  if (categoryName) {
    updateSql +=
      updateParams.length > 0 ? ", categoryName = ?" : " categoryName = ?";
    updateParams.push(categoryName);
  }

  if (description) {
    updateSql +=
      updateParams.length > 0 ? ", description = ?" : " description = ?";
    updateParams.push(description);
  }
  if (price) {
    updateSql +=
      updateParams.length > 0 ? ", price = ?" : " price = ?";
    updateParams.push(price);
  }
  if (colorcode) {
    updateSql +=
      updateParams.length > 0 ? ", colorcode = ?" : " colorcode = ?";
    updateParams.push(colorcode);
  }

  let imagePath;
  if (req.file) {
    imagePath = `/uploads/${req.file.filename}`;
    updateSql +=
      updateParams.length > 0 ? ", categoryImg = ?" : " categoryImg = ?";
    updateParams.push(imagePath);
  }

  if (updateParams.length === 0) {
    return res.status(400).json({ message: "No fields to update" });
  }

  updateSql += " WHERE id = ?";
  updateParams.push(id);

  const selectSql = "SELECT categoryImg FROM categories WHERE id = ?";
  db.query(selectSql, [id], (err, result) => {
    if (err) {
      return res.status(500).json({ message: "Database error", error: err });
    }
    if (result.length === 0) {
      return res.status(404).json({ message: "Category not found" });
    }

    const oldImagePath = result[0].categoryImg;

    db.query(updateSql, updateParams, (err) => {
      if (err) {
        return res.status(500).json({ message: "Database error", error: err });
      }

      if (req.file && oldImagePath) {
        const fullPath = path.join(
          __dirname,
          "..",
          oldImagePath.replace(/^\//, "")
        );
        fs.unlink(fullPath, (fsErr) => {
          if (fsErr) {
            console.error("Error deleting old image:", fsErr);
          }
        });
      }

      res.status(200).json({ message: "Category updated successfully" });
    });
  });
});

router.put("/category/:id", upload.single("categoryImg"), (req, res) => {
  const { id } = req.params;
  const { categoryName, newId } = req.body; // Assuming newId is passed in the body

  let updateSql = "UPDATE categories SET";
  const updateParams = [];

  // If categoryName is provided, include it in the update
  if (categoryName) {
    updateSql +=
      updateParams.length > 0 ? ", categoryName = ?" : " categoryName = ?";
    updateParams.push(categoryName);
  }

  // Handle image update if file is uploaded
  let imagePath;
  if (req.file) {
    imagePath = `/uploads/${req.file.filename}`;
    updateSql +=
      updateParams.length > 0 ? ", categoryImg = ?" : " categoryImg = ?";
    updateParams.push(imagePath);
  }

  // If newId is provided, add it to the update query
  if (newId) {
    updateSql += updateParams.length > 0 ? ", id = ?" : " id = ?";
    updateParams.push(newId); // newId is the new ID to be assigned
  }

  // If no fields are provided to update, return an error
  if (updateParams.length === 0) {
    return res.status(400).json({ message: "No fields to update" });
  }

  updateSql += " WHERE id = ?";
  updateParams.push(id);

  // Check if the category exists before proceeding with the update
  const selectSql = "SELECT categoryImg FROM categories WHERE id = ?";
  db.query(selectSql, [id], (err, result) => {
    if (err) {
      return res.status(500).json({ message: "Database error", error: err });
    }
    if (result.length === 0) {
      return res.status(404).json({ message: "Category not found" });
    }

    const oldImagePath = result[0].categoryImg;

    // Execute the update query
    db.query(updateSql, updateParams, (err) => {
      if (err) {
        return res.status(500).json({ message: "Database error", error: err });
      }

      // If the image has changed, delete the old image
      if (req.file && oldImagePath) {
        const fullPath = path.join(
          __dirname,
          "..",
          oldImagePath.replace(/^\//, "")
        );
        fs.unlink(fullPath, (fsErr) => {
          if (fsErr) {
            console.error("Error deleting old image:", fsErr);
          }
        });
      }

      res.status(200).json({ message: "Category updated successfully" });
    });
  });
});

// Delete Category
router.delete("/category/:id", (req, res) => {
  const { id } = req.params;

  const selectSql = "SELECT categoryImg FROM categories WHERE id = ?";
  db.query(selectSql, [id], (err, result) => {
    if (err) {
      return res.status(500).json({ message: "Database error", error: err });
    }
    if (result.length === 0) {
      return res.status(404).json({ message: "Category not found" });
    }

    const imagePath = result[0].categoryImg;

    const deleteSql = "DELETE FROM categories WHERE id = ?";
    db.query(deleteSql, [id], (err) => {
      if (err) {
        return res.status(500).json({ message: "Database error", error: err });
      }

      if (imagePath) {
        fs.unlink(path.join(__dirname, "..", imagePath), (fsErr) => {
          if (fsErr) {
            console.error("Error deleting image:", fsErr);
          }
        });
      }

      res.status(200).json({ message: "Category deleted successfully" });
    });
  });
});

// === SERVICE ROUTES ===
const isValidDate = (date) => /^\d{4}-\d{2}-\d{2}$/.test(date);

router.post("/time-slot", (req, res) => {
  const { date, timeSlots } = req.body;

  // Input validation
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return res
      .status(400)
      .json({ error: "Invalid or missing date. Use YYYY-MM-DD format." });
  }
  if (!Array.isArray(timeSlots) || timeSlots.length === 0) {
    return res
      .status(400)
      .json({ error: "TimeSlots array is required and cannot be empty." });
  }

  // Prepare insert values
  const insertQuery = "INSERT INTO time_slot (date, available_time) VALUES ?";
  const values = timeSlots.map((time) => [date, time]);

  db.query(insertQuery, [values], (insertErr, result) => {
    if (insertErr) {
      // Check for duplicate entry error (MySQL error code 1062)
      if (insertErr.code === "ER_DUP_ENTRY") {
        return res.status(400).json({
          error: "Duplicate date entry. The specified date already exists.",
        });
      }

      // Handle other database errors
      console.error("Error during insert query:", insertErr);
      return res
        .status(500)
        .json({ error: "Database error during insertion." });
    }

    res.status(201).json({
      message: "Time slots added successfully.",
      insertedCount: result.affectedRows,
    });
  });
});


// Get Available Time Slots for a Specific Date
router.get("/slots/:date", (req, res) => {
  const { date } = req.params;

  // Function to validate date format
  const isValidDate = (date) => /^\d{4}-\d{2}-\d{2}$/.test(date);

  if (!isValidDate(date)) {
    return res
      .status(400)
      .json({ error: "Invalid date format. Use YYYY-MM-DD format." });
  }

  const sql = "SELECT available_time FROM time_slot WHERE date = ?";
  db.query(sql, [date], (err, results) => {
    if (err) {
      return res.status(500).json({ message: "Database error", error: err });
    }

    // Function to convert time to 12-hour format
    const formatTime = (time) => {
      const [hour, minute] = time.split(":");
      const hours = parseInt(hour, 10);
      const minutes = parseInt(minute, 10);
      const ampm = hours >= 12 ? "PM" : "AM";
      const formattedHours = hours % 12 || 12; // Convert 0 to 12 for midnight
      return `${formattedHours}:${minutes.toString().padStart(2, "0")} ${ampm}`;
    };

    res.status(200).json({
      date,
      timeSlots: results.map((row) => formatTime(row.available_time)),
    });
  });
});

// Get All Available Slots for All Dates
router.get("/slots", (req, res) => {
  const sql =
    "SELECT date, available_time FROM time_slot ORDER BY date, available_time";
  db.query(sql, (err, results) => {
    if (err) {
      return res.status(500).json({ message: "Database error", error: err });
    }

    // Function to convert time to 12-hour format
    const formatTime = (time) => {
      const [hour, minute] = time.split(":");
      const hours = parseInt(hour, 10);
      const minutes = parseInt(minute, 10);
      const ampm = hours >= 12 ? "PM" : "AM";
      const formattedHours = hours % 12 || 12; // Convert 0 to 12 for midnight
      return `${formattedHours}:${minutes.toString().padStart(2, "0")} ${ampm}`;
    };

    // Group time slots by date and format available_time
    const groupedSlots = results.reduce((acc, row) => {
      if (!acc[row.date]) {
        acc[row.date] = [];
      }
      acc[row.date].push(formatTime(row.available_time));
      return acc;
    }, {});

    res.status(200).json(groupedSlots);
  });
});

// === APPOINTMENT ROUTES ===

// Book Appointment
const convertTo24HourFormat = (time12h) => {
  const [time, modifier] = time12h.split(" ");
  let [hours, minutes] = time.split(":");

  if (hours === "12") {
    hours = "00";
  }
  if (modifier === "PM") {
    hours = parseInt(hours, 10) + 12;
  }
  return `${hours}:${minutes}:00`; // Add seconds for TIME type
};

router.post("/appointment", (req, res) => {
  let { location, categoryId, serviceId, appointmentDate, appointmentTime } =
    req.body;

  if (
    !location ||
    !categoryId ||
    !serviceId ||
    !appointmentDate ||
    !appointmentTime
  ) {
    return res.status(400).json({ message: "All fields are required" });
  }

  // Convert time to 24-hour format
  try {
    appointmentTime = convertTo24HourFormat(appointmentTime);
  } catch (error) {
    return res.status(400).json({ message: "Invalid time format" });
  }

  const sql =
    "INSERT INTO appointments (location, category_id, service_id, appointment_date, appointment_time) VALUES (?, ?, ?, ?, ?)";
  db.query(
    sql,
    [location, categoryId, serviceId, appointmentDate, appointmentTime],
    (err, result) => {
      if (err) {
        console.error("Database Error:", err);
        return res.status(500).json({ message: "Database error", error: err });
      }
      res
        .status(200)
        .json({
          message: "Appointment booked successfully",
          appointmentId: result.insertId,
        });
    }
  );
});

// Get All Appointments
router.get("/appointments", (req, res) => {
  const sql = "SELECT * FROM appointments";
  db.query(sql, (err, results) => {
    if (err) {
      return res.status(500).json({ message: "Database error", error: err });
    }
    res.status(200).json(results);
  });
});

router.post(
  "/category/:id/service",
  upload.fields([
    { name: "serviceImg", maxCount: 1 },
    { name: "serviceIcon", maxCount: 1 },
  ]),
  (req, res) => {
    const { id } = req.params;
    const { serviceName, colorResource, description, price } = req.body;

    // Validate required fields
    if (!serviceName) {
      return res.status(400).json({ message: "Service name is required" });
    }

    if (!colorResource) {
      return res.status(400).json({ message: "Color Resource is required" });
    }

    if (!description) {
      return res.status(400).json({ message: "Description is required" });
    }

    if (!price) {
      return res.status(400).json({ message: "Price is required" });
    }

    // Handle file uploads
    const serviceImgPath = req.files?.serviceImg
      ? `/uploads/${req.files.serviceImg[0].filename}`
      : null;
    const serviceIconPath = req.files?.serviceIcon
      ? `/uploads/${req.files.serviceIcon[0].filename}`
      : null;

    // Insert into database
    const sql = `
        INSERT INTO services (categoryId, serviceName, colorResource, serviceImg, serviceIcon, description, price) 
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    db.query(
      sql,
      [
        id,
        serviceName,
        colorResource,
        serviceImgPath,
        serviceIconPath,
        description,
        price,
      ],
      (err, result) => {
        if (err) {
          return res
            .status(500)
            .json({ message: "Database error", error: err });
        }
        res
          .status(200)
          .json({
            message: "Service added successfully",
            serviceId: result.insertId,
          });
      }
    );
  }
);

router.get("/category/:id/services", (req, res) => {
  const { id } = req.params;

  const sql = "SELECT * FROM services WHERE categoryId = ?";
  db.query(sql, [id], (err, results) => {
    if (err) {
      return res.status(500).json({ message: "Database error", error: err });
    }
    res.status(200).json(results);
  });
});

router.put(
  "/service/:id",
  upload.fields([
    { name: "serviceImg", maxCount: 1 },
    { name: "serviceIcon", maxCount: 1 },
  ]),
  (req, res) => {
    const { id } = req.params;
    const { serviceName, colorResource, description, price } = req.body;

    let updateSql = "UPDATE services SET";
    const updateParams = [];

    // Conditionally add fields to the update query
    if (serviceName) {
      updateSql +=
        updateParams.length > 0 ? ", serviceName = ?" : " serviceName = ?";
      updateParams.push(serviceName);
    }

    if (colorResource) {
      updateSql +=
        updateParams.length > 0 ? ", colorResource = ?" : " colorResource = ?";
      updateParams.push(colorResource);
    }

    if (description) {
      updateSql +=
        updateParams.length > 0 ? ", description = ?" : " description = ?";
      updateParams.push(description);
    }

    if (price) {
      updateSql += updateParams.length > 0 ? ", price = ?" : " price = ?";
      updateParams.push(price);
    }

    // Handle serviceImg
    let imagePath;
    if (req.files?.serviceImg) {
      imagePath = `/uploads/${req.files.serviceImg[0].filename}`;
      updateSql +=
        updateParams.length > 0 ? ", serviceImg = ?" : " serviceImg = ?";
      updateParams.push(imagePath);
    }

    // Handle serviceIcon
    let iconPath;
    if (req.files?.serviceIcon) {
      iconPath = `/uploads/${req.files.serviceIcon[0].filename}`;
      updateSql +=
        updateParams.length > 0 ? ", serviceIcon = ?" : " serviceIcon = ?";
      updateParams.push(iconPath);
    }

    if (updateParams.length === 0) {
      return res.status(400).json({ message: "No fields to update" });
    }

    updateSql += " WHERE id = ?";
    updateParams.push(id);

    const selectSql =
      "SELECT serviceImg, serviceIcon FROM services WHERE id = ?";
    db.query(selectSql, [id], (err, result) => {
      if (err) {
        return res.status(500).json({ message: "Database error", error: err });
      }
      if (result.length === 0) {
        return res.status(404).json({ message: "Service not found" });
      }

      const oldImagePath = result[0].serviceImg;
      const oldIconPath = result[0].serviceIcon;

      db.query(updateSql, updateParams, (err) => {
        if (err) {
          return res
            .status(500)
            .json({ message: "Database error", error: err });
        }

        // Delete old serviceImg if a new one was uploaded
        if (req.files?.serviceImg && oldImagePath) {
          const fullPath = path.join(
            __dirname,
            "..",
            oldImagePath.replace(/^\//, "")
          );
          fs.unlink(fullPath, (fsErr) => {
            if (fsErr) {
              console.error("Error deleting old image:", fsErr);
            }
          });
        }

        // Delete old serviceIcon if a new one was uploaded
        if (req.files?.serviceIcon && oldIconPath) {
          const fullPath = path.join(
            __dirname,
            "..",
            oldIconPath.replace(/^\//, "")
          );
          fs.unlink(fullPath, (fsErr) => {
            if (fsErr) {
              console.error("Error deleting old icon:", fsErr);
            }
          });
        }

        res.status(200).json({ message: "Service updated successfully" });
      });
    });
  }
);

router.delete("/service/:id", (req, res) => {
  const { id } = req.params;

  const selectSql = "SELECT serviceImg, serviceIcon FROM services WHERE id = ?";
  db.query(selectSql, [id], (err, result) => {
    if (err) {
      return res.status(500).json({ message: "Database error", error: err });
    }
    if (result.length === 0) {
      return res.status(404).json({ message: "Service not found" });
    }

    const imagePath = result[0].serviceImg;
    const iconPath = result[0].serviceIcon;

    const deleteSql = "DELETE FROM services WHERE id = ?";
    db.query(deleteSql, [id], (err) => {
      if (err) {
        return res.status(500).json({ message: "Database error", error: err });
      }

      // Delete serviceImg file
      if (imagePath) {
        fs.unlink(path.join(__dirname, "..", imagePath), (fsErr) => {
          if (fsErr) {
            console.error("Error deleting service image:", fsErr);
          }
        });
      }

      // Delete serviceIcon file
      if (iconPath) {
        fs.unlink(path.join(__dirname, "..", iconPath), (fsErr) => {
          if (fsErr) {
            console.error("Error deleting service icon:", fsErr);
          }
        });
      }

      res.status(200).json({ message: "Service deleted successfully" });
    });
  });
});

module.exports = router;
