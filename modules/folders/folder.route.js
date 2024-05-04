// Folder Route
const { userChecker, adminChecker } = require('../../helper/authChecker');
const File = require('../files/file.model');
const User = require('../user/user.model');
const Folder = require('./folder.model');
const fs = require('fs');
const path = require('path');
const archiver = require("archiver");
const router = require('express').Router();

router.post('/create', userChecker, async (req, res) => {
    const body = req.body
    try {
        const generateRandomNumber = () => {
            return Math.floor(Math.random() * 1000) + 90000
        }
        const folder = { ...body }
        if (!body.code) {
            folder.code = generateRandomNumber()
        }
        const newFolder = new Folder(folder)
        const result = await newFolder.save()
        res.send(result)
    } catch (error) {
        res.status(500).send({ message: error.message })
    }
})

router.get('/', adminChecker, async (req, res) => {
    try {
        const result = await Folder.find()
            .populate('user', 'name email')
            .populate('parent', 'name')
            .sort({ createdAt: -1 })
            .exec();

        const total = await Folder.countDocuments()
        // total file into this folder
        let data = []
        await Promise.all(result.map(async (d) => {
            const file = await File.find({ folder: d.code })
            const folders = await Folder.countDocuments({ parent: d._id })
            data.push({ ...d.toObject(), folders, files: file.length, size: file.reduce((a, b) => a + b.size, 0) / 1024 / 1024 })
        }))
        res.send({
            data,
            total
        })
    } catch (error) {
        res.status(500).send({ message: error.message })
    }
})

// get user folders

router.get('/user/:id', userChecker, async (req, res) => {
    const id = req.params.id
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    try {
        const query = { parent: { $exists: false } }
        if (req.user?.role !== 'admin') query.user = id
        const result = await Folder.find(query)
            .skip(skip)
            .limit(limit)
            .populate('user', 'name email')
            .populate('parent', 'name')
            .sort({ createdAt: -1 })
            .exec();

        const total = await Folder.countDocuments({ user: id })
        // total file into this folder
        let data = []
        await Promise.all(result.map(async (d) => {
            const file = await File.find({ folder: d.code })
            const folders = await Folder.countDocuments({ parent: d._id })
            data.push({ ...d.toObject(), folders, files: file.length, size: file.reduce((a, b) => a + b.size, 0) / 1024 / 1024 })
        }))
        res.send({
            data,
            total
        })
    } catch (error) {
        res.status(500).send({ message: error.message })
    }
})

router.get('/user-folder/:id/:folder', userChecker, async (req, res) => {
    const id = req.params.id
    try {
        const query = { _id: { $ne: req.params.folder } }
        if (req.user?.role !== 'admin') query.user = id
        const result = await Folder.find(query)
            .populate('user', 'name email')
            .populate('parent', 'name user')
            .exec();

        const total = await Folder.countDocuments({ user: id })
        // total file into this folder
        let data = []
        await Promise.all(result.map(async (d) => {
            const file = await File.find({ folder: d.code })
            const folders = await Folder.countDocuments({ parent: d._id })
            data.push({ ...d.toObject(), folders, files: file.length, size: file.reduce((a, b) => a + b.size, 0) / 1024 / 1024 })
        }))
        res.send({
            data,
            total
        })
    } catch (error) {
        res.status(500).send({ message: error.message })
    }
})
// search folders

router.post('/search', userChecker, async (req, res) => {
    const { _id, role } = req.user
    const { search } = req.body
    try {
        const query = { name: { $regex: search, $options: 'i' } }
        if (role !== 'admin') query.user = _id
        const result = await Folder.find(query)
        const total = await Folder.countDocuments(query)
        // total file into this folder
        let data = []
        await Promise.all(result.map(async (d) => {
            const file = await File.find({ folder: d.code })
            const folders = await Folder.countDocuments({ parent: d._id })
            data.push({ ...d.toObject(), folders, files: file.length, size: file.reduce((a, b) => a + b.size, 0) / 1024 / 1024 })
        }))
        res.send({
            data,
            total
        })
    } catch (error) {
        res.status(500).send({ message: error.message })
    }
})


// get subfolders

router.get('/folder/:id', userChecker, async (req, res) => {
    const id = req.params.id
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    try {
        const result = await Folder.find({ parent: id, })
            .skip(skip)
            .limit(limit)
            .exec();

        const total = await Folder.countDocuments({ parent: id })
        // total file into this folder
        let data = []
        await Promise.all(result.map(async (d) => {
            const file = await File.find({ folder: d.code })
            data.push({ ...d.toObject(), files: file.length, size: file.reduce((a, b) => a + b.size, 0) / 1024 / 1024 })
        }))
        res.send({
            data,
            total
        })
    } catch (error) {
        res.status(500).send({ message: error.message })
    }
})
// delete a folder

router.delete('/:id', userChecker, async (req, res) => {
    const id = req.params.id
    try {
        const folder = await Folder.findById(id)
        const count = await Folder.countDocuments({ code: folder.code })
        const files = await File.find({ folder: folder.code })
        const child = await Folder.findOne({ parent: id })
        if (child) {
            const filesChild = await File.find({ folder: child.code })
            await Promise.all(filesChild.map(async (file) => {
                // check if file exists
                const filePath = file.path
                // check if file exists
                if (count === 1) {
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
                }
                await Folder.deleteMany({ parent: id })
            }))
        }
        await Promise.all(files.map(async (file) => {
            // check if file exists
            const filePath = file.path
            // check if file exists
            if (count === 1) {
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
            }
            await Folder.deleteMany({ parent: id })
        }))
        await Folder.findByIdAndDelete(id)
        res.send({ message: "Folder Deleted Success" })
    } catch (error) {
        res.status(500).send({ message: error.message })
    }
})

// download a folder
router.get('/download/:id', userChecker, async (req, res) => {
    const id = req.params.id
    try {
        const folder = await Folder.findById(id)
        const result = await File.find({ folder: folder.code });

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
})
// update folder
router.put('/:id', userChecker, async (req, res) => {
    const id = req.params.id
    const body = req.body
    try {
        const result = await Folder.findByIdAndUpdate(id, body)
        res.send(result)
    } catch (error) {
        res.status(500).send({ message: error.message })
    }
})
// move folder
router.post('/move', userChecker, async (req, res) => {
    const body = req.body
    try {
        if (body.parent === "root") {
            const result = await Folder.findByIdAndUpdate(body._id, {
                $unset: { parent: body.parent }
            },
                { new: true })
            res.send(result)
        }
        else {
            const result = await Folder.findByIdAndUpdate(body._id, {
                $set: { parent: body.parent }
            },
                { new: true })
            res.send(result)
        }
    } catch (error) {
        res.status(500).send({ message: error.message })
    }
})

// copy folder
router.post('/copy', userChecker, async (req, res) => {
    const body = req.body
    try {
        const newF = {
            name: body.name,
            user: body.user,
        }
        if (body.parent) {
            newF.parent = body.parent
        }
        const result = await Folder.create(newF)
        res.send(result)
    } catch (error) {
        res.status(500).send({ message: error.message })
    }
})
module.exports = router