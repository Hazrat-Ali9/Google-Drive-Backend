const mongoose = require("mongoose");

const fileSchema = new mongoose.Schema({
    filename: {
        type: String,
        required: true
    },
    originalname: {
        type: String,
        required: true
    },
    mimetype: {
        type: String,
        required: true
    },
    path: {
        type: String,
        required: true
    },
    size: {
        type: Number,
        required: true
    },
    mimetype: {
        type: String,
        required: true
    },
    extension: {
        type: String,
        required: true
    },
    destination: {
        type: String,
        required: true
    },
    folder: {
        type: String,
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    },
    share: {
        type: Array,
        default: []
    },
    deleted: {
        type: Boolean,
        default: false
    }
}, { timestamps: true })

const File = mongoose.model("File", fileSchema);
module.exports = File