const express = require("express");
const mysql = require("mysql");
const bodyParser = require("body-parser");
const bcrypt = require("bcryptjs");
const cors = require("cors");
const twilio = require('twilio');
const axios = require('axios');
const app = express();
const db = require('./config/db');
// const { OAuth2Client } = require('google-auth-library');

require('dotenv').config();

// const client1 = new OAuth2Client(process.env.AUTH_CLIENT);

app.use(cors());
app.use(bodyParser.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use('/uploads', express.static('uploads'));

const session = require('express-session');

app.use(session({
  secret: process.env.SECRET_KEY,
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false } 
}));

const multer = require('multer');
const path = require('path');
const fs = require('fs');

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

// const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

const getOrInsertUserId = async (phoneNumber) => {
  return new Promise((resolve, reject) => {
    db.query(
      'INSERT INTO users_details (phoneNumber) VALUES (?) ON DUPLICATE KEY UPDATE id=LAST_INSERT_ID(id)',
      [phoneNumber],
      (err, result) => {
        if (err) {
          return reject(err);
        }
        resolve(result.insertId);
      }
    );
  });
};


app.post('/send-otp', async (req, res) => {
  const { phoneNumber } = req.body;

  if (!phoneNumber) {
    return res.status(400).json({ error: 'Phone number is required' });
  }

  const sendOtpUrl = `https://www.smsalert.co.in/api/mverify.json?apikey=${process.env.SMS_ALERT_API_KEY}&sender=${process.env.SENDER_ID}&mobileno=${phoneNumber}&template=OTP to verify your registered mobile number for Myanimal is [otp] Powered by myanimal.in`;

  try {
    // Ensure user exists in the database
    const userId = await getOrInsertUserId(phoneNumber);

    // Send OTP using SMS Alert API
    const response = await axios.get(sendOtpUrl);

    if (response.data.status === 'success') {
      return res.status(200).json({
        message: 'OTP sent successfully.',
        userId: userId,
        phoneNumber: phoneNumber,
      });
    }

    return res.status(500).json({ error: 'Failed to send OTP', details: response.data });
  } catch (error) {
    console.error('Error sending OTP:', error);
    return res.status(500).json({ error: 'Error sending OTP.', details: error.message });
  }
});


// app.post('/verify-otp', async (req, res) => {
//   const { phoneNumber, otp } = req.body;

//   if (!phoneNumber || !otp) {
//     return res.status(400).json({ error: 'Phone number and OTP are required.' });
//   }

//   const verifyOtpUrl = `https://www.smsalert.co.in/api/mverify.json?apikey=${process.env.SMS_ALERT_API_KEY}&mobileno=${phoneNumber}&code=${otp}`;

//   try {
//     // Verify OTP using the SMS Alert API
//     const response = await axios.get(verifyOtpUrl);
// if (response.data.description.desc === 'Code Matched successfully.') {
//   return res.status(200).json({ message: 'OTP verified successfully.'});
// }else{
//   return res.status(400).json({
//     error: 'Invalid OTP or phone number',
//     details: response.data
//   });  
// }

//     // if (response.data.status === 'success') {
//     //   // Fetch the user ID associated with the phone number
//     //   try {
//     //     const userId = await new Promise((resolve, reject) => {
//     //       db.query(
//     //         'SELECT id FROM users_details WHERE phoneNumber = ?',
//     //         [phoneNumber],
//     //         (err, result) => {
//     //           if (err) {
//     //             return reject(err);
//     //           }
//     //           if (result.length === 0) {
//     //             return reject(new Error('User not found.'));
//     //           }
//     //           resolve(result[0].id);
//     //         }
//     //       );
//     //     });

//     //     return res.status(200).json({ message: 'OTP verified successfully.', userId: userId });
//     //   } catch (dbError) {
//     //     console.error('Error fetching user ID:', dbError);
//     //     return res.status(500).json({ error: 'Error fetching user ID.', details: dbError.message });
//     //   }
//     // }

//     // return res.status(400).json({ error: 'Invalid OTP', details: response.data });
//   } catch (error) {
//     console.error('Error verifying OTP:', error);
//     return res.status(500).json({ error: 'Error verifying OTP.', details: error.message });
//   }
// });

app.post('/verify-otp', async (req, res) => {
    const { phoneNumber, otp } = req.body;

    // Check if phoneNumber and otp are provided
    if (!phoneNumber || !otp) {
        return res.status(400).json({ error: 'Phone number and OTP are required.' });
    }

    const verifyOtpUrl = `https://www.smsalert.co.in/api/mverify.json?apikey=${process.env.SMS_ALERT_API_KEY}&mobileno=${phoneNumber}&code=${otp}`;

    try {
        // Verify OTP using the SMS Alert API
        const response = await axios.get(verifyOtpUrl);

        // Handle OTP verification response
        const description = response.data.description?.desc;

        // Check if OTP matched successfully
        if (description === 'Code Matched successfully.') {
            try {
                // Fetch the user ID associated with the phone number
                const userId = await new Promise((resolve, reject) => {
                    db.query(
                        'SELECT id FROM users_details WHERE phoneNumber = ?',
                        [phoneNumber],
                        (err, result) => {
                            if (err) {
                                return reject(err);
                            }
                            if (result.length === 0) {
                                return reject(new Error('User not found.'));
                            }
                            resolve(result[0].id);
                        }
                    );
                });

                return res.status(200).json({ message: 'OTP verified successfully.', userId: userId });
            } catch (dbError) {
                console.error('Error fetching user ID:', dbError);
                return res.status(500).json({ error: 'Error fetching user ID.', details: dbError.message });
            }
        } else {
            // Simplified validation messages
            let errorMessage = 'Invalid OTP or phone number. Please ensure both are correct.';
            
            // In case the OTP code does not match
            if (description === 'Code does not match.') {
                errorMessage = 'OTP not found. Please check and try again.';
            }

            return res.status(400).json({
                error: errorMessage
            });
        }
    } catch (error) {
        console.error('Error verifying OTP:', error);
        return res.status(500).json({ error: 'Error verifying OTP.', details: error.message });
    }
});





app.post('/resend-otp', async (req, res) => {
  const { phoneNumber } = req.body;

  if (!phoneNumber) {
    return res.status(400).json({ error: 'Phone number is required' });
  }

  const resendOtpUrl = `https://www.smsalert.co.in/api/mverify.json?apikey=${process.env.SMS_ALERT_API_KEY}&sender=${process.env.SENDER_ID}&mobileno=${phoneNumber}&template=OTP to verify your registered mobile number for Myanimal is [otp] Powered by myanimal.in`;

  try {
    const response = await axios.get(resendOtpUrl);

    if (response.data.status === 'success') {
      return res.status(200).json({
        message: 'OTP resent successfully.',
      });
    }

    return res.status(500).json({ error: 'Failed to resend OTP', details: response.data });
  } catch (error) {
    console.error('Error resending OTP:', error);
    return res.status(500).json({ error: 'Error resending OTP.', details: error.message });
  }
});

app.put('/user-name/:id', (req, res) => {
  const { id } = req.params;
  const { name } = req.body;

  if (!id || !name) {
    return res.status(400).json({ message: 'User ID and name are required.' });
  }

  // Update the user's name based on the ID
  db.query(
    'UPDATE users_details SET name = ? WHERE id = ?',
    [name, id],
    (err, results) => {
      if (err) {
        console.error('Error updating name:', err);
        return res.status(500).json({ message: 'Failed to update name.', error: err });
      }

      if (results.affectedRows === 0) {
        return res.status(404).json({ message: 'User ID not found.' });
      }

      res.status(200).json({ message: 'Name updated successfully.', userId: id });
    }
  );
});

app.get('/users', (req, res) => {
  const sql = 'SELECT * FROM users_details';
  db.query(sql, (err, results) => {
      if (err) {
          console.error('Database Error:', err);
          return res.status(500).json({ message: 'Database error', error: err });
      }
      res.status(200).json({ message: 'User data fetched successfully', users: results });
  });
});

app.get('/users/:id', (req, res) => {
  const userId = req.params.id;
  const sql = 'SELECT * FROM users_details WHERE id = ?';
  db.query(sql, [userId], (err, results) => {
    if (err) {
      console.error('Database Error:', err);
      return res.status(500).json({ message: 'Database error', error: err });
    }
    if (results.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.status(200).json({ message: 'User data fetched successfully', user: results[0] });
  });
});

app.put('/users/:id', upload.single('userImg'), (req, res) => {
  const { id } = req.params;
  const { phoneNumber, name, email, aadharNo, password } = req.body;

  let updateSql = 'UPDATE users_details SET';
  const updateParams = [];

  // Dynamically build the SQL query for non-empty fields

  if (name) {
      updateSql += updateParams.length > 0 ? ', name = ?' : ' name = ?';
      updateParams.push(name);
  }
  if (email) {
      updateSql += updateParams.length > 0 ? ', email = ?' : ' email = ?';
      updateParams.push(email);
  }
  if (phoneNumber) {
      updateSql += updateParams.length > 0 ? ', phoneNumber = ?' : ' phoneNumber = ?';
      updateParams.push(phoneNumber);
  }
  if (aadharNo) {
      updateSql += updateParams.length > 0 ? ', aadharNo = ?' : ' aadharNo = ?';
      updateParams.push(aadharNo);
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

  // If no fields provided, return an error
  if (updateParams.length === 0) {
      return res.status(400).json({ message: 'No fields to update' });
  }

  // Add the WHERE clause
  updateSql += ' WHERE id = ?';
  updateParams.push(id);

  // Fetch old image path before updating
  const selectSql = 'SELECT userImg FROM users_details WHERE id = ?';
  db.query(selectSql, [id], (err, result) => {
      if (err) {
          return res.status(500).json({ message: 'Database error', error: err });
      }
      if (result.length === 0) {
          return res.status(404).json({ message: 'User not found' });
      }

      const oldImagePath = result[0].userImg;

      // Perform the update
      db.query(updateSql, updateParams, (err, updateResult) => {
          if (err) {
              return res.status(500).json({ message: 'Database error', error: err });
          }

          // Delete old image if a new image was uploaded
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




const nameRoutes = require('./routes/nameRoutes');
const userDetailsRoutes = require('./routes/userDetailsRoutes');
const serviceRoutes = require('./routes/serviceRoutes');
const groomersRoutes = require('./routes/groomersRoutes');
const doctorsRoutes = require('./routes/doctorsRoutes');
const screenRoutes = require('./routes/screenRoutes');
const servicepriceRoutes = require('./routes/servicepriceRoutes');
const contactRoutes = require('./routes/contactRoutes');

app.use('/api', nameRoutes);
app.use('/api', userDetailsRoutes);
app.use('/api', serviceRoutes);
app.use('/api', groomersRoutes);
app.use('/api', doctorsRoutes);
app.use('/api', screenRoutes);
app.use('/api', servicepriceRoutes);
app.use('/api', contactRoutes);

const PORT = process.env.PORT || 9003;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
