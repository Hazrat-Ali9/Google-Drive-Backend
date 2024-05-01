const mongoose = require("mongoose");

const folderSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    parent: {
        type: String,
        required: true
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    }
}, { timestamps: true })

const Folder = mongoose.model("Folder", folderSchema);
module.exports = Folder