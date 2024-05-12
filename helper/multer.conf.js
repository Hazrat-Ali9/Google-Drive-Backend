// Multer 
const multer = require('multer');
const path = require('path');
const fs = require('fs');
// Generate 5 Digit Random Number
const generateRandomNumber = () => {
    return Math.floor(100000 + Math.random() * 10);
}
const uploadFiles = multer({
    storage: multer.diskStorage({
        destination: (req, file, cb) => {
            const destination = path.join('uploads/files/', req.headers.userid);
            if (!fs.existsSync(destination)) {
                fs.mkdirSync(destination);
            }
            cb(null, destination)
        },
        filename: function (req, file, cb) {
            cb(null, generateRandomNumber() + '-' + file.originalname);
        }

    }),

});
const uploadFile = multer({
    storage: multer.diskStorage({
        destination: (req, file, cb) => {
            const destination = path.join('uploads/profile');
            if (!fs.existsSync(destination)) {
                fs.mkdirSync(destination);
            }
            cb(null, destination)
        },
        filename: function (req, file, cb) {
            cb(null, req.headers.userid + path.extname(file.originalname));
        }

    }),
});
module.exports = {
    uploadFiles,
    uploadFile
}