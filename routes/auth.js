const express = require('express');
const bcrypt = require('bcryptjs');
const User = require('../models/user');
const router = express.Router();

// User Registration Route (Sign-Up)
router.post('/publicsignUp', async (req, res) => {
    const { name, dob, address, gender, about, email, phone, password, confirmPassword } = req.body;

    if (password !== confirmPassword) {
        return res.send('Password and Confirm Password did not match');
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({
        name, dob, address, gender, about, email, phone, password: hashedPassword
    });

    try {
        await newUser.save();
        res.redirect('/publiclogin');
    } catch (err) {
        console.log(err);
        res.send('Error saving user');
    }
});

// User Login Route
router.post('/publiclogin', async (req, res) => {
    const { email, password } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
        return res.send('User not found');
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (isMatch) {
        req.session.userId = user._id; // Store user ID in session
        res.redirect(`/profile/${user._id}`);  // Redirect to user profile
    } else {
        res.send('Incorrect password');
    }
});

// Profile Route
router.get('/profile/:userId', async (req, res) => {
    if (!req.session.userId) {
        return res.redirect('/publiclogin');
    }

    try {
        const user = await User.findById(req.params.userId);
        if (!user) {
            return res.send('User not found');
        }
        res.render('profile', { user });
    } catch (err) {
        console.log(err);
        res.send('Error fetching user data');
    }
});

// Logout Route
router.get('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.send('Error logging out');
        }
        res.redirect('/publiclogin');
    });
});

module.exports = router;

// Route to handle the profile update
router.post('/update-profile/:userId', async (req, res) => {
    const { name, email, phone, address, about } = req.body;

    // Check if the user is logged in
    if (!req.session.userId) {
        return res.redirect('/publiclogin');
    }

    try {
        const user = await User.findById(req.params.userId);
        if (!user) {
            return res.send('User not found');
        }

        // Update the user data with the new values
        user.name = name;
        user.email = email;
        user.phone = phone;
        user.address = address;
        user.about = about;

        // Save the updated user data
        await user.save();

        // Redirect the user back to their profile page
        res.redirect(`/profile/${user._id}`);
    } catch (err) {
        console.error(err);
        res.send('Error updating profile');
    }
});
