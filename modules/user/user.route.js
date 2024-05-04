// User Route
const { userChecker, adminChecker } = require('../../helper/authChecker');
const transporter = require('../../helper/nodemailer');
const sessions = require('../../helper/sessions');
const tokenGenerator = require('../../helper/tokenGenerator');
const File = require('../files/file.model');
const Folder = require('../folders/folder.model');
const User = require('./user.model');
const bcrypt = require('bcrypt');
const router = require('express').Router();
const fs = require('fs');
// register



router.post('/register', async (req, res) => {

    const body = req.body

    try {

        const hashedPassword = await bcrypt.hash(body.password, 10)

        const newUser = new User({
            ...body, password: hashedPassword
        })
        const isExist = await User.findOne({ email: body.email })
        if (isExist) {
            res.status(400).json({ message: "User Already Exist" })
        }
        else {
            const result = await newUser.save()
            const token = await tokenGenerator(result)

            res.cookie('token00', token, { httpOnly: true, maxAge: 30 * 24 * 60 * 60 * 1000, domain: "localhost:5173" });
            res.send({
                message: "User Created Success",
                token,
                user: result
            })
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
})

// login
router.post('/login', async (req, res) => {
    const { email, password, provider } = req.body
    try {
        const user = await User.findOne({
            email: email,
            provider: provider
        })

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        const isMatch = await bcrypt.compare(password, user.password)
        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }
        else {
            const token = await tokenGenerator(user)

            // Set a cookie
            res.cookie('token00', token, { httpOnly: true, maxAge: 30 * 24 * 60 * 60 * 1000, domain: "localhost:5173" });
            const data = await User.findOne({ email: user.email })
                .select("-password")
                .exec();
            res.status(200).send({ user: data, message: "Login Success", token })
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
})


// login
router.post('/login-google', async (req, res) => {
    const { email, provider } = req.body

    try {
        const user = await User.findOne({
            email: email,
            provider: "google"
        })
            .select("-password")
            .exec();

        if (!user) {
            const newUser = new User(req.body)
            const result = await newUser.save()
            const token = await tokenGenerator(result)
            // Set a cookie
            res.cookie('token00', token, {
                httpOnly: true,
                maxAge: 30 * 24 * 60 * 60 * 1000,
                domain: "localhost:5173"
            });

            res.status(200).send({ result, message: "Login Success", token })
        }
        else {
            const token = await tokenGenerator(user)
            // Set a cookie
            res.cookie('token00', token, {
                httpOnly: true,
                maxAge: 30 * 24 * 60 * 60 * 1000,
                domain: "localhost:5173"
            });

            res.status(200).send({ user, message: "Login Success", token })
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
})
// get all user

router.get('/', adminChecker, async (req, res) => {
    try {
        const data = await User.find({})
            .select("-password")
            .exec();
        res.send(data)
    } catch (error) {
        res.status(500).send({ message: error.message })
    }
})

// get logedin user
router.get('/me', userChecker, async (req, res) => {
    const id = req.user?._id
    try {
        const user = await User.findById(id)
            .select("-password -code")
            .exec()
        res.send(user)
    } catch (error) {
        res.status(500).send({ message: error.message })
    }
})


// update a user

router.put('/:id', userChecker, async (req, res) => {
    const body = req.body
    const id = req.params.id
    try {
        const data = await User.findByIdAndUpdate(id, body, { new: true })
        res.send({ data, message: "User Updated Success" })
    } catch (error) {
        res.status(500).send({ message: error.message })
    }
})

// change Password 

router.put('/password/:id', userChecker, async (req, res) => {
    const body = req.body
    const id = req.params.id
    try {
        const user = await User.findById(id)
        const isMatch = await bcrypt.compare(body.oldPassword, user.password)
        if (!isMatch) {
            return res.status(401).send({ message: "Old Password Not Match" });
        }

        const hashedPassword = await bcrypt.hash(body.newPassword, 10)
        const data = await User.findByIdAndUpdate(id, { password: hashedPassword }, { new: true })
        res.send({ data, message: "User Updated Success" })
    } catch (error) {
        res.status(500).send({ message: error.message })
    }
})

router.put('/password-update/:id', userChecker, async (req, res) => {
    const body = req.body
    const id = req.params.id
    try {

        const hashedPassword = await bcrypt.hash(body.password, 10)
        const data = await User.findByIdAndUpdate(id, {
            password: hashedPassword
        },
            { new: true }
        )
        res.send({ data, message: "User Updated Success" })
    } catch (error) {
        res.status(500).send({ message: error.message })
    }
})
// delete a user
router.delete('/:id', adminChecker, async (req, res) => {
    const id = req.params.id
    try {
        const files = await File.find({ user: id })
        await Promise.all(files.map(async (file) => {
            await File.findByIdAndDelete(file._id)
            const filePath = file.path
            // check if file exists
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
            const fileSize = file.size / 1024 / 1024;
            // increase the size of the file
            await User.findByIdAndUpdate(id, {
                $inc: { storage: fileSize }
            })

        }))
        await Folder.deleteMany({ user: id })
        const data = await User.findByIdAndDelete(id)
        res.send({ data, message: "User Deleted Success" })
    } catch (error) {
        res.status(500).send({ message: error.message })
    }
})

// send email
router.post('/send-email', userChecker, async (req, res) => {
    const { email } = req.user
    try {
        // generate 6 digit number 

        const messageCode = Math.floor(100000 + Math.random() * 900000);
        await User.updateOne({ email: email }, { $set: { code: messageCode, isMailSent: true } })
        const result = await transporter.sendMail({
            from: "info@digifile.com",
            to: email,
            subject: "Account Verification Mail",
            text: "Account  Verification Code " + messageCode,
            html: `
            <div>
            <h2>Your Verification Code is</h2>
            <h1>${messageCode}</h1>
            </div>
            `,
        })
        res.send({ message: "Email sent successfully", result })
    } catch (error) {
        res.status(500).send({ message: error.message })
    }
})

// verify code
router.post('/verify', userChecker, async (req, res) => {
    const { code } = req.body
    const { email } = req.user
    try {
        if (req.user.code == code) {
            await User.updateOne({ email: email }, { $set: { code: "" }, isVerified: true })
            res.send({ message: "Email Verified" })
        }
        else {
            res.status(400).send({ message: "Invalid Code" })
        }
    } catch (error) {
        res.status(500).send({ message: error.message })
    }
})
module.exports = router