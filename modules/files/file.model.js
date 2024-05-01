//File Model 
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
        type: mongoose.Schema.Types.ObjectId,
        ref: "Folder"
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    }, 
    deleted: {
        type: Boolean,
        default: false
    }
}, { timestamps: true })

const File = mongoose.model("File", fileSchema);
module.exports = File