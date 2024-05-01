const jwt = require('jsonwebtoken');


const secret = process.env.JWT_SECRET

const tokenGenerator = async (user) => {
    const accessToken = jwt.sign({
        id: user._id
    }, secret, { expiresIn: '30d' })
    return accessToken
}

module.exports = tokenGenerator