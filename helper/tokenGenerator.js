// Token Genarator
const jwt = require('jsonwebtoken');


const secret = process.env.JWT_SECRET
// JWT Token Access
const tokenGenerator = async (user) => {
    const accessToken = jwt.sign({
        id: user._id
    }, secret, { expiresIn: '30d' })
    return accessToken
}
// Result of Token Genarator
module.exports = tokenGenerator