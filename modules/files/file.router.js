const { uploadFiles } = require('../../helper/multer.conf');
const { userChecker, adminChecker } = require("../../helper/authChecker");
const File = require('./file.model');
const router = require('express').Router();
const fs = require('fs');
const path = require('path');
const User = require('../user/user.model');

router.post('/upload', userChecker, uploadFiles.array('file'), async (req, res) => {
    try {
        const files = req.files;
        const folder = req.headers.folder
        // Process each uploaded image
        await files.map(async file => {
            const newFile = {
                ...file,
            }
            if (folder) {
                newFile.folder = folder
            }
            newFile.user = req.user._id
            const result = new File({ ...newFile, extension: path.extname(file.originalname) })
            await result.save()
            const fileSize = file.size / 1024 / 1024;
            // decrease the size of the file
            await User.findByIdAndUpdate(req.user._id, {
                $inc: { storage: -fileSize }
            })
        });
        res.json(files);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
})


// get all files of a user

router.get('/user/:id', userChecker, async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const category = req.query.category

    try {
        const query = { user: req.params.id, $or: [{ deleted: { $exists: false } }, { deleted: false }] }
        if (category) query.mimetype = { $regex: category, $options: 'i' }
        const files = await File.find(query)
            .populate('user', 'name email')
            .skip(skip)
            .sort({ createdAt: -1 })
            .limit(limit)
            .exec();
        const total = await File.countDocuments(query)
        res.send({
            data: files,
            total,
            page,
            limit
        })

    } catch (error) {
        res.status(500).send({ message: error.message })
    }
});

// dowload file
// router.get('/download/:id', async (req, res) => {
//     try {
//         const file = await File.findById(req.params.id)
//         if (!file) return res.status(404).send({ message: "File not found" })

//         const filePath = file.path; // Replace this with the path to your file
//         const fileName = file.originalname; // Replace this with the name of your file

//         // Check if the file exists
//         if (fs.existsSync(filePath)) {
//             // Set headers to trigger download
//             res.setHeader('Content-Disposition', `attachment; filename=${fileName}`);
//             res.setHeader('Content-Type', 'application/octet-stream');

//             // Read the file and send it as response
//             const fileStream = fs.createReadStream(filePath);
//             fileStream.pipe(res);
//         } else {
//             // If file not found, send error response
//             res.status(404).send('File not found');
//         }
//     } catch (error) {
//         res.status(500).send({ message: error.message })
//     }
// })

router.get('/download/:id', async (req, res) => {
    try {
        const file = await File.findById(req.params.id);
        if (!file) return res.status(404).send({ message: "File not found" });

        const filePath = file.path; // Adjust this to match your file path
        const fileName = file.originalname; // Adjust this to match your file name

        res.download(filePath, fileName); // Send file as attachment
    } catch (error) {
        res.status(500).send({ message: error.message });
    }
});
// get bins files

router.get('/bin/:user', userChecker, async (req, res) => {
    try {
        const files = await File.find({ user: req.params.user, deleted: true })
            .populate('user', 'name email')
            .exec();
        res.send({
            data: files
        })
    } catch (error) {
        res.status(500).send({ message: error.message })
    }
})

router.post('/folder', userChecker, async (req, res) => {
    const body = req.body
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    try {
        const files = await File.find({
            folder: body.folder,
            user: body.user
        })
            .populate('user', 'name email')
            .skip(skip)
            .limit(limit)
            .exec();
        const total = await File.countDocuments({
            folder: body.folder,
            user: body.user
        })
        let size = 0
        files.map(file => {
            size += file.size
        })
        res.send({
            data: files,
            size: size / 1024 / 1024,
            total,
            page,
            limit
        })
    } catch (error) {
        res.status(500).send({ message: error.message })
    }
})

router.get('/', async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    try {
        const files = await File.find({})
            .populate('user', 'name email')
            .skip(skip)
            .limit(limit)
            .exec();

        res.send(files)
    } catch (error) {
        res.status(500).send({ message: error.message })
    }
})


// send on recycle bin
router.post('/bin/:id', userChecker, async (req, res) => {
    try {
        await File.findByIdAndUpdate(req.params.id, { deleted: true })
        res.json({ message: 'File deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
})


// delete a file by id
router.delete('/:id', userChecker, async (req, res) => {
    try {
        const file = await File.findById(req.params.id);
        if (!file) return res.status(404).json({ message: 'File not found' });

        // delete file from system 

        const filePath = file.path
        // check if file exists
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }

        // delete file from database
        await File.findByIdAndDelete(file._id);
        const fileSize = file.size / 1024 / 1024;
        // increase the size of the file
        await User.findByIdAndUpdate(req.user._id, {
            $inc: { storage: fileSize }
        })
        res.json({ message: 'File deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
})
module.exports = router;