const { userChecker, adminChecker } = require('../../helper/authChecker');
const File = require('../files/file.model');
const Folder = require('./folder.model');

const router = require('express').Router();

router.post('/create', userChecker, async (req, res) => {
    const body = req.body
    try {
        const newFolder = new Folder(body)
        const result = await newFolder.save()
        res.send(result)
    } catch (error) {
        res.status(500).send({ message: error.message })
    }
})

router.get('/', adminChecker, async (req, res) => {
    try {
        const data = await Folder.find({})
        res.send(data)
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
        const result = await Folder.find({ user: id })
            .skip(skip)
            .limit(limit)
            .exec();

        const total = await Folder.countDocuments({ user: id })
        // total file into this folder
        let data = []
        await Promise.all(result.map(async (d) => {
            const file = await File.find({ folder: d._id })
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
        await File.deleteMany({ folder: id })
        await Folder.findByIdAndDelete(id)
        res.send({ message: "Folder Deleted Success" })
    } catch (error) {
        res.status(500).send({ message: error.message })
    }
})
module.exports = router