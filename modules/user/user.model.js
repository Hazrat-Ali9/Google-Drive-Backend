// User Model
const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    picture: {
        type: String
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    role: {
        type: String,
        default: 'user',
        // roles ["admin", "user"]
    },
    provider: {
        type: String,
        required: true
    },
    password: {
        type: String,
        required: true
    },
    storage: {
        type: Number,
        default: 102400
    },
    storageMax: {
        type: Number,
        default: 102400
    },
    others: {
        type: Object,
    }

}, { timestamps: true })

const User = mongoose.model("User", userSchema);
module.exports = User