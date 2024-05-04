const { uploadFiles, uploadFile } = require('../../helper/multer.conf');
const { userChecker, adminChecker } = require("../../helper/authChecker");
const File = require('./file.model');
const router = require('express').Router();
const fs = require('fs');
const path = require('path');
const User = require('../user/user.model');
const archiver = require("archiver");
const Folder = require('../folders/folder.model');

router.post('/upload', userChecker, uploadFiles.array('file'), async (req, res) => {
    try {
        const files = req.files;
        const folderId = req.headers.folder
        const folder = folderId ? await Folder.findById(folderId) : null
        const size = files.reduce((acc, file) => acc + file.size, 0)
        const availableStorage = req.user.storage * 1024 * 1024
        if (size > availableStorage) {
            // delete uploaded files
            await Promise.all(files.map(async (file) => {
                const filePath = file.path
                // check if file exists
                if (fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath);
                }
            }))
            return res.status(400).json({ message: "Storage limit exceeded" })
        }
        // Process each uploaded image
        await files.map(async file => {
            const newFile = {
                ...file,
            }
            if (folderId) {
                newFile.folder = folder.code
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

// upload single file

router.post('/single', userChecker, uploadFile.single('file'), async (req, res) => {
    try {
        res.json(req.file);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
})
// get all files
router.get('/', adminChecker, async (req, res) => {
    try {
        const files = await File.find({})
            .populate('user', 'name email')
            .populate('folder', 'name')
            .sort({ createdAt: -1 })
            .exec();
        res.send(files)
    } catch (error) {

    }
})

// get all files of a user

router.get('/user/:id', userChecker, async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const category = req.query.category

    try {
        const query = {

            $or: [{
                deleted: { $exists: false }
            },
            { deleted: false }
            ],
        }
        if (category) query.mimetype = { $regex: category, $options: 'i' }
        if (req.user?.role !== 'admin') query.user = req.params.id
        const files = await File.find(query)
            .populate('user', 'name email')
            .populate('folder', 'name')
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

// download multiple files
router.post('/download', async (req, res) => {
    const { ids } = req.body;
    try {
        const result = await File.find({ _id: { $in: ids } });

        // Create an array of file objects containing path and name
        const files = result.map(file => ({
            path: file.path,
            name: file.originalname // Assuming 'name' is a property of your file object
        }));

        // Create a zip archive
        const archive = archiver('zip', { zlib: { level: 9 } });
        archive.on('error', (err) => {
            throw err;
        });

        // Pipe the files to the archive
        files.forEach((file) => {
            archive.file(file.path, { name: file.name });
        });

        // Set response headers
        res.attachment('files.zip');
        archive.pipe(res);

        // Finalize the archive and send it to the client
        archive.finalize();
    } catch (error) {
        res.status(500).send({ message: error.message });
    }
});

// get bins files

router.get('/bin/:user', userChecker, async (req, res) => {
    try {
        const query = { deleted: true }
        if (req.user?.role !== 'admin') query.user = req.params.user

        const files = await File.find(query)
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
        const folder = await Folder.findById(body.folder)
        if (!folder) return res.status(404).send({ message: "Folder not found" })
        const files = await File.find({
            folder: folder.code,
            user: body.user,
            $or: [{ deleted: false }, { deleted: { $exists: false } }]
        })
            .populate('user', 'name email')
            .populate('folder', 'name')
            .skip(skip)
            .sort({ createdAt: -1 })
            .limit(limit)
            .exec();
        const total = await File.countDocuments({
            folder: folder.code,
            user: body.user
        })
        let size = 0
        files.map(file => {
            size += file.size
        })
        res.send({
            data: files,
            folder,
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
// search files

router.post('/search', userChecker, async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    const search = req.body.search
    try {
        const query = {

            $or: [
                { originalname: { $regex: search, $options: 'i' } },
                { filename: { $regex: search, $options: 'i' } },
                { mimetype: { $regex: search, $options: 'i' } },
            ]
        }
        if (req.user?.role !== 'admin') query.user = _id
        const files = await File.find(query)
            .populate('user', 'name email')
            .skip(skip)
            .limit(limit)
            .exec();
        res.send(files)
    } catch (error) {

    }
})
// get a file

router.get('/:id', userChecker, async (req, res) => {
    try {
        const file = await File.findById(req.params.id);
        if (!file) return res.status(404).json({ message: 'File not found' });
        res.send(file);
    } catch (error) {
        res.status(500).json({ message: error.message });
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
// delete multiple files
router.post('/delete', userChecker, async (req, res) => {
    try {

        const files = await File.find({ _id: { $in: req.body.ids } })


        // delete all files from system 

        await Promise.all(files.map(async (file) => {
            // check if file exists
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
        }))

        res.json({ message: 'File deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
})
/// update one file
router.put('/:id', userChecker, async (req, res) => {
    try {
        await File.updateOne({ _id: req.params.id }, req.body, { new: true })
        res.send({ message: 'File updated successfully' })
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
})
/// Share one file
router.put('/share/:id', userChecker, async (req, res) => {
    const { email } = req.body
    try {
        const user = await User.findOne({ email: email })
        if (!user) return res.status(404).json({ message: 'User not found' });
        await File.updateOne(
            { _id: req.params.id },
            { $addToSet: { share: { id: user._id, email: user.email, name: user.name } } },
            { new: true }
        );
        res.send({ message: 'File updated successfully' })
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
})
// remove shared

router.post('/remove', userChecker, async (req, res) => {
    const { ids, id } = req.body
    console.log(req.body)
    try {
        const user = await User.findOne({ _id: id })
        if (!user) return res.status(404).json({ message: 'User not found' });
        const result = await File.updateMany({ _id: { $in: ids } }, { $pull: { share: { email: user.email } } })
        res.send({ message: 'File updated successfully' })
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
})
router.get('/sharedwith/:id', userChecker, async (req, res) => {
    try {
        const result = await File.find({ share: { $elemMatch: { email: req.user.email } } })
            .populate('user', 'name email')
            .sort({ createdAt: -1 })
            .exec();
        res.send(result)
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
})
// update multiple files
router.post('/update', userChecker, async (req, res) => {
    const { ids, update } = req.body
    try {
        await File.updateMany({ _id: { $in: ids } }, update)
        res.send({ message: 'File updated successfully' })
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
})
module.exports = router;