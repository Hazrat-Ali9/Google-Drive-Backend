const multer = require('multer');
const path = require('path');
const fs = require('fs');
// generate 5 digit random number
const generateRandomNumber = () => {
    return Math.floor(100000 + Math.random() * 900000);
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

module.exports = {
    uploadFiles
}