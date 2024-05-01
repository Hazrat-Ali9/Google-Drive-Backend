// Auth Cheaker 
const jwt = require('jsonwebtoken');
const User = require('../modules/user/user.model');
const secret = process.env.JWT_SECRET
const userChecker = async (req, res, next) => {
    const token = req.headers.token
    if (!token) {
        return res.status(401).send({ message: "Unauthorized !token" })
    }
    const decod = jwt.verify(token, secret)
    if (!decod) {
        return res.status(401).send({ message: "Unauthorized !decod" })
    }
    const user = await User.findById(decod.id)
    if (!user) {
        return res.status(401).send({ message: "Unauthorized !user" })
    }
    req.token = token
    req.user = user
    next()
}

const adminChecker = async (req, res, next) => {
    const token = req.headers.token
    if (!token) {
        return res.status(401).send({ message: "Unauthorized !token" })
    }
    const decod = jwt.verify(token, secret)
    if (!decod) {
        return res.status(401).send({ message: "Unauthorized !decod" })
    }
    const user = await User.findById(decod.id)
    if (!user) {
        return res.status(401).send({ message: "Unauthorized !user" })
    }
    if (user.role !== "admin") {
        return res.status(401).send({ message: "Unauthorized !admin" })
    }
    req.token = token
    req.user = user
    next()
}

module.exports = {
    userChecker,
    adminChecker
}