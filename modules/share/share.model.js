const mongoose = require("mongoose");

const folderSchema = new mongoose.Schema({
    files: {
        type: [mongoose.Schema.Types.ObjectId],
        ref: "File"
    },
    type: {
        type: String,
        required: true  
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    }
}, { timestamps: true })

const Shared = mongoose.model("Shared", folderSchema);
module.exports = Shared