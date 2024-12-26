const mongoose = require('mongoose');  // Add this line
const multer = require('multer');
const path = require('path');
const express = require('express');
const router = express.Router();
const Complaint = require('../models/Complaint');
const User = require('../models/user');
const isAuthenticated = require('../middleware/auth');
const axios = require('axios');

// Set storage engine for multer
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');  // Change this to your actual upload folder
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname)); // Give each file a unique name
    }
});

// Initialize multer
const upload = multer({
    storage,
    fileFilter: (req, file, cb) => {
        const filetypes = /jpeg|jpg|png|gif/;
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = filetypes.test(file.mimetype);

        if (extname && mimetype) {
            cb(null, true);
        } else {
            cb('Error: Images Only!');
        }
    },
});

// Raise Complaint Page
// Define the route to raise a complaint for a specific user
router.get('/raise-complaint/:userId', (req, res) => {
    const userId = req.params.userId;  // Access the userId from the URL

    // You can use userId to do some validation or fetch user data
    // For example, check if the user exists before allowing them to raise a complaint

    User.findById(userId)
        .then(user => {
            if (!user) {
                return res.status(404).send('User not found');
            }

            // Render the raise-complaint page for the given user
            res.render('raise-complaint', { user });  // Passing the user data to the view
        })
        .catch(err => {
            console.error(err);
            res.status(500).send('Error fetching user data');
        });
});

// POST route to handle raising a complaint for a specific user
router.post('/raise-complaint/:userId', upload.single('photo'), async (req, res) => {
    const userId = req.params.userId; // Get the userId from the URL parameter
    const { title, description, latitude, longitude } = req.body; // Extract fields from request body
    console.log('Raising complaint for user:', userId);

    try {
        // Check if the user exists
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).send('User not found');
        }

        // Handle the uploaded file (if any)
        const photo = req.file ? req.file.filename : null;

        // Optionally, get the location based on latitude and longitude
        let location = 'Location not provided';
        if (latitude && longitude) {
            try {
                location = await getAreaFromCoordinates(latitude, longitude); // Assuming this function fetches location
            } catch (err) {
                console.error('Error fetching location from coordinates:', err);
                location = 'Error fetching location';
            }
        }

        // Create and save the complaint
        const complaint = new Complaint({
            userId,
            title,
            description,
            photo,
            location,
            latitude: latitude ? parseFloat(latitude) : null,
            longitude: longitude ? parseFloat(longitude) : null,
        });

        await complaint.save();

        // Redirect to the user's complaints list
        //res.redirect(`/my-complaints/${userId}`); 
       // res.redirect(`complaints/raise-complaints/${userId}`); // Pass userId in the redirect URL
       res.render('raise-complaint', { user });
    } catch (err) {
        console.error('Error raising complaint:', err);
        res.status(500).send('Error raising complaint');
    }
});



router.get('/my-complaints/:userId', async (req, res) => {
    console.log('In /my-complaints route');
    try {
        const { userId } = req.params; // Extract userId from route parameter
        if (!userId) {
            return res.status(400).send('User ID is required'); // Validate userId
        }

        // Find complaints for the user based on userId parameter
        const complaints = await Complaint.find({ userId});

        // Render the view with complaints and userId
        try {
            res.render('my-complaints', { complaints, userId });
        } catch (err) {
            console.error('Error rendering the view:', err);
            res.status(500).send('Error rendering the complaints page');
        }
    } catch (err) {
        console.error('Error fetching complaints:', err);
        res.status(500).send('Error fetching complaints');
    }
});


router.get('/public-complaints', async (req, res) => {
    try {
        // Fetch complaints with status 'Open' only
        const complaints = await Complaint.find({ status: 'Open' }).populate('userId', 'name');
        res.render('public-complaints', { complaints });
    } catch (err) {
        console.error(err);
        res.send('Error fetching complaints');
    }
});

router.get('/first', async (req, res) => {
    try {
        // Fetch complaints with status 'Open' only
        const complaints = await Complaint.find({ status: 'Open' }).populate('userId', 'name');
        
        // Render first.ejs and pass complaints data
        res.render('first', { complaints });
    } catch (err) {
        console.error(err);
        res.send('Error fetching complaints');
    }
});


async function getAreaFromCoordinates(latitude, longitude) {
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&addressdetails=1`;

    try {
        const response = await axios.get(url);
        if (response.data && response.data.address) {
            const address = response.data.address;
            
            // Try to get the city, town, or village, if available
            const city = address.city || address.town || address.village;
            const suburb = address.suburb || '';
            const state = address.state || '';
            const country = address.country || '';

            // Combine the address fields in a readable format
            let location = city || suburb || 'Area not found'; // Default to "Area not found" if no city/town/village

            // Optionally, add state and country if city or suburb is not available
            if (!city && suburb) {
                location = `${suburb}, ${state || ''}, ${country || ''}`.trim();
            } else if (!city && !suburb) {
                location = `${state || ''}, ${country || ''}`.trim();
            }

            return location || 'Area not found';
        }
        return 'Area not found';
    } catch (error) {
        console.error('Error fetching location:', error);
        return 'Error retrieving area';
    }
}


router.get('/complaints', async (req, res) => {
    try {
        const complaints = await Complaint.find();

        // For each complaint, fetch the area name using latitude and longitude if available
        const complaintsWithLocation = await Promise.all(complaints.map(async (complaint) => {
            if (complaint.latitude && complaint.longitude) {
                const area = await getAreaFromCoordinates(complaint.latitude, complaint.longitude);
                complaint.location = area;  // Store the area name in the complaint object
            } else {
                complaint.location = 'Area not provided'; // Handle if no coordinates are available
            }
            return complaint;
        }));

        res.render('public-complaints', { complaints: complaintsWithLocation }); // Render the complaints on the page
    } catch (error) {
        res.status(500).json({ error: 'Failed to retrieve complaints' });
    }
});

module.exports = router;
