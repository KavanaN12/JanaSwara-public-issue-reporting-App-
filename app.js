//http://localserver:27017/

const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const path = require('path');
const validator = require('validator');  // Adjust the path to where the model is located
const multer = require('multer');
const Complaint = require('./models/Complaint');
const User = require('./models/user');
const complaintRoutes = require('./routes/complaint');
const app = express();
const PORT = process.env.PORT || 3000;
// Connect to MongoDB
mongoose.connect('mongodb://127.0.0.1:27017/userDB', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
}).then(() => {
    console.log("Connected to MongoDB");
}).catch(err => {
    console.error("Error connecting to MongoDB:", err);
});

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
// For JSON requests
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));// For parsing application/x-www-form-urlencoded
app.use('/', complaintRoutes);
// Session Middleware
app.use(session({
    secret: '12983756yrbckaku32#@43$3@#43456782367$5213',
    resave: false,
    saveUninitialized: true,
    store: MongoStore.create({
        mongoUrl: 'mongodb://127.0.0.1:27017/userDB', // Ensure this matches your DB connection
    }),
    cookie: {
        secure: false, // Use true only for HTTPS
        httpOnly: true,
    }
}));

app.use((req, res, next) => {
    console.log('Session:', req.session);
    next();
});
app.use(express.json()); 
app.use('/complaints', complaintRoutes);
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));


const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/'); // The folder where files will be stored
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname); // File name
    }
});



const upload = multer({ storage:storage });

function getUserById(id) {
    return User.findById(id);  // Assuming you're using Mongoose
}

app.use(bodyParser.json());

app.get('/', (req, res) => {
    res.redirect('/publicsignUp');
});

app.get('/publicsignUp', (req, res) => {
    res.render('MyLogin');
});

app.post('/publicsignUp',upload.fields([{ name: 'photo', maxCount: 1 }]), async (req, res) => {
    const { name, dob, address, gender,about, phone,email, password, confirmPassword } = req.body;
    if (!validator.isEmail(email)) {
        return res.send('Invalid email address');
    }

    if (password !== confirmPassword) {
        return res.send('Password and Comfirm Password did not match');
    }
    const hashedPassword = await bcrypt.hash(password, 10);

    const existingUser = await User.findOne({ email });
    if (existingUser) {
        return res.send('User already exists');
    }
    const photo = req.files.photo ? req.files.photo[0].filename : null;
    const newUser = new User({
        name,
        dob,
        address,
        gender,
        about,
        email,
        phone,
        photo,
        password: hashedPassword,
        role: 'user',  
    });

    await newUser.save();
    res.redirect('/publicsignUp');
});
app.get('/forgotPassward',(req,res)=>{
    res.render('forgotPassward');
})
app.get('/publiclogin', (req, res) => {
    res.render('publiclogin');
});
app.post('/publiclogin', async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await User.findOne({ email });
        if (!user) {
            return res.send('User not found');
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (isMatch) {
            req.session.userId = user._id.toString();
            req.session.save(err => {
                if (err) {
                    console.error('Session save error:', err);
                }
                res.redirect('/home');
            });
        } else {
            res.send('Incorrect password');
        }
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).send('Error during login');
    }
});

// Home Route (Post-Login)
app.get('/home', async (req, res) => {
    if (!req.session.userId) {
        return res.redirect('/publiclogin');
    }

    try {
        const user = await User.findById(req.session.userId);
        if (!user) {
            return res.send('User not found');
        }
        res.render('home', { user });
    } catch (err) {
        console.error('Error fetching user:', err);
        res.status(500).send('Error fetching user');
    }
});



app.get('/profile/:userId', async (req, res) => {
    // Check if the user is logged in (session exists)
    if (!req.session.userId) {
        return res.redirect('/publiclogin');  // If not logged in, redirect to login page
    }

    // Find the user by userId
    try {
        const user = await User.findById(req.params.userId);

        if (!user) {
            return res.send('User not found');
        }

        // Render the profile page and pass user data to the view
        res.render('profile', { user });
    } catch (err) {
        console.error(err);
        res.send('Error fetching user data');
    }
});

app.get('/edit-profile/:userId', async (req, res) => {
    if (!req.session.userId) {
        return res.redirect('/publiclogin');
    }

    try {
        const user = await User.findById(req.params.userId);

        if (!user) {
            return res.send('User not found');
        }

        // Render the edit profile page with user data
        res.render('edit-profile', { user }); // Send the user data to the view
    } catch (err) {
        console.log(err);
        res.send('Error fetching user data');
    }
});

// Route to handle the profile update form submission
app.post('/edit-profile/:userId', upload.fields([{ name: 'photo', maxCount: 1 }]), async (req, res) => {
    if (!req.session.userId) {
        return res.redirect('/publiclogin');
    }

    const { name, email, phone, address, gender, dob, about } = req.body;

    try {
        const user = await User.findById(req.params.userId);

        if (!user) {
            return res.send('User not found');
        }
        if (req.files.photo) {
            user.photo = req.files.photo[0].filename;
        }
        // Update the user's data
        user.name = name;
        user.email = email;
        user.phone = phone;
        user.address = address;
        user.gender = gender;
        user.dob = dob;
        user.about = about;

        await user.save(); // Save the updated user to the database

        // Redirect to the profile page to show updated details
        res.redirect(`/profile/${user._id}`);
    } catch (err) {
        console.log(err);
        res.send('Error updating profile');
    }
});


app.get('/authoritysignUp', (req, res) => {
    res.render('MyLogin');
});

app.post('/authoritysignUp',upload.fields([{ name: 'photo', maxCount: 1 }, { name: 'idProofPhoto', maxCount: 1 }]), async (req, res) => {
    console.log(req.body);
    const { name, gender, email, password, confirmPassword, phone, sector, department, designation, address, terms } = req.body;
    if (!email) {
        return res.send('Email is required');
    }
    console.log(req.body); 
    console.log('Email:', email); 
    // Check if the email is valid
    if (!validator.isEmail(email)) {
        return res.send('Invalid email address');
    }

    // Check if passwords match
    if (password !== confirmPassword) {
        return res.send('Passwords do not match');
    }

    // Check if phone number already exists
    const existingPhoneUser = await User.findOne({ phone });
    if (existingPhoneUser) {
        return res.send('Phone number already registered');
    }
    const photo = req.files.photo ? req.files.photo[0].filename : null;
    const idProofPhoto = req.files.idProofPhoto ? req.files.idProofPhoto[0].filename : null;
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    const termsAccepted = terms === 'on'; 

    // Create new authority user
    const newUser = new User({
        name,
        address,
        gender,
        email,
        phone,
        password: hashedPassword,
        sector,
        department,
        designation,
        idProof: idProofPhoto, // Store the file name of ID proof photo
        photo:photo, 
        terms: termsAccepted,
        role: 'authority', // Ensure the role is set to 'authority' for authority users
    });

    try {
        // Save the new user to the database
        await newUser.save();
        res.redirect('/authoritylogin'); // Redirect after successful sign-up
    } catch (error) {
        console.error('Error saving user:', error);
        res.status(500).send('Error registering user');
    }
});


app.get('/authoritylogin', (req, res) => {
    res.render('MyLogin');
});

app.post('/authoritylogin', async (req, res) => {
    const { email, password } = req.body;

    // Find the user by email
    const user = await User.findOne({ email });

    if (!user) {
        return res.send('User not found');
    }

    // Compare the password with the stored hashed password
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
        return res.send('Invalid password');
    }

    // Check if the user is an authority
    if (user.role === 'authority') {
        // Set up session for the logged-in user
        req.session.user = user;  // Store user data in the session

        req.session.save(err => {
            if (err) {
                console.error('Session save error:', err);
                return res.send('Session error');
            }

            // Redirect to /home2 after session is saved
            res.redirect('/home2');
        });
    } else {
        return res.send('You are not authorized to access this page');
    }
});


// Logout Route
app.get('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            console.error('Error destroying session:', err);
            return res.send('Error logging out');
        }
        res.redirect('/publicsignUp');
    });
});


app.get('/getComplaintDetails/:userId', async (req, res) => {
    const userId = req.params.userId; // Ensure you are correctly accessing the userId
    console.log(`with user ${userId}`);
    if (!req.session.userId) {
        return res.redirect('/publiclogin');
    }

    // Find the user by userId
    try {
        const user = await User.findById(userId);  // Use the userId from the route parameter

        if (!user) {
            return res.send('User not found');
        }
        res.json({
            name: user.name, // Correct reference to user object
            email: user.email,
        });
    } catch (err) {
        res.status(500).json({ error: "Internal Server Error" });
    }
});

app.get('/resolve-complaints', isAuthenticated, async (req, res) => {
    try {
        const complaints = await Complaint.find({ status: 'Open' });
        console.log('Complaints fetched:', complaints); // Debugging output
        res.render('resolve-complaints', { complaints });
    } catch (error) {
        console.error('Error retrieving complaints:', error);
        res.status(500).send('Error retrieving complaints');
    }
});



// Route to mark complaint as resolved
app.post('/resolve-complaint/:id', async (req, res) => {
    const complaintId = req.params.id;
    try {
        const complaint = await Complaint.findByIdAndUpdate(
            complaintId,
            { 
                status: 'Resolved',
                resolvedBy: req.session.user._id // Use session to get the logged-in user's ID
            },
            { new: true }
        );

        if (complaint) {
            res.json({ success: true });
        } else {
            res.json({ success: false, message: 'Complaint not found' });
        }
    } catch (error) {
        console.error('Error resolving complaint:', error);
        res.json({ success: false, message: 'Error resolving complaint' });
    }
});


function isAuthenticated(req, res, next) {
    console.log('Session user:', req.session.user); // Debugging output
    if (req.session.user && req.session.user.role === 'authority') {
        return next();
    }
    res.redirect('/authoritylogin');
}

app.get('/test-complaints', async (req, res) => {
    try {
        const complaints = await Complaint.find({});
        res.json(complaints); // Send all complaints as JSON for debugging
    } catch (error) {
        console.error('Error fetching complaints:', error);
        res.status(500).send('Error fetching complaints');
    }
});

app.get('/home2', async (req, res) => {
    if (!req.session.user || !req.session.user._id) {
        return res.redirect('/publiclogin');
    }

    try {
        const user = await User.findById(req.session.user._id);
        if (!user) {
            return res.send('User not found');
        }
        res.render('home2', { user });
    } catch (err) {
        console.error('Error fetching user:', err);
        res.status(500).send('Error fetching user');
    }
});
app.get('/profile2/:id', (req, res) => {
    const userId = req.params.id;  // Get the userId from the URL
    
    // Fetch the user by ID
    getUserById(userId).then(user => {
        if (user) {
            res.render('profile2', { user: user });
        } else {
            res.status(404).send("User not found");
        }
    }).catch(err => {
        console.error(err);
        res.status(500).send("Internal Server Error");
    });
});
app.get('/edit-profile2/:id', (req, res) => {
    const userId = req.params.id;

    getUserById(userId).then(user => {
        if (user) {
            res.render('edit-profile2', { user });
        } else {
            res.status(404).send('User not found');
        }
    }).catch(err => {
        console.error(err);
        res.status(500).send('Internal Server Error');
    });
});

app.post('/edit-profile2/:userId', upload.fields([{ name: 'photo', maxCount: 1 }, { name: 'idProof', maxCount: 1 }]), async (req, res) => {
    const { name, email, phone, address, gender, sector, department, designation } = req.body;

    try {
        const user = await User.findById(req.params.userId);
        if (!user) {
            return res.send('User not found');
        }
        // Update fields
        user.name = name;
        user.email = email;
        user.phone = phone;
        user.address = address;
        user.gender = gender;
        user.sector = sector;
        user.department = department;
        user.designation = designation;

        // Handle file uploads (only update if a new file is provided)
        if (req.files.photo) {
            user.photo = req.files.photo[0].filename;
        }
        if (req.files.idProof) {
            user.idProof = req.files.idProof[0].filename;
        }

        await user.save(); // Save the updated user data

        res.redirect(`/profile2/${user._id}`); // Redirect to updated profile
    } catch (err) {
        console.error(err);
        res.send('Error updating profile');
    }
});
// Start Server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
