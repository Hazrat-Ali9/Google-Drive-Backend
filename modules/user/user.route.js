const { userChecker, adminChecker } = require('../../helper/authChecker');
const tokenGenerator = require('../../helper/tokenGenerator');
const User = require('./user.model');
const bcrypt = require('bcrypt');
const router = require('express').Router();

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
            res.send({ message: "User Created Success", token })
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
            .select("-password")
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


// delete a user
router.delete('/:id', adminChecker, async (req, res) => {
    const id = req.params.id
    try {
        const data = await User.findByIdAndDelete(id)
        res.send({ data, message: "User Deleted Success" })
    } catch (error) {
        res.status(500).send({ message: error.message })
    }
})
module.exports = router