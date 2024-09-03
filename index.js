// Index js
const express = require("express");
const cors = require("cors");
const bodyparser = require("body-parser");
const mongoose = require("mongoose");
require("dotenv").config();

const app = express();
const port = process.env.PORT || 4500;
app.use(bodyparser.json());
app.use(cors());

// MongoDB Connection
const uri = process.env.DBURL

const connectDB = async () => {
    if (!uri) {
        return console.log("MongoDB URI not found")
    }
    try {
        await mongoose.connect(uri);
        console.log("MongoDB connected");
    } catch (error) {
        console.error(error.message);
        process.exit(1);
    }
}
connectDB();

// Routes
app.use("/api/user", require("./modules/user/user.route"));
// Upload Files
app.use("/api/file", require("./modules/files/file.router"));
// Folders
app.use("/api/folder", require("./modules/folders/folder.route"));

// Share

app.use('/api/share', require('./modules/share/share.route'))

// Read Uploaded Files
app.use('/uploads', express.static('uploads'));
// Start Server


app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
})