const { userChecker } = require('../../helper/authChecker');
const File = require('../files/file.model');
const Shared = require('./share.model');

const router = require('express').Router();


router.get('/:id', async (req, res) => {
    const id = req.params.id
    try {
        const container = await Shared.findById(id)
        const files = await File.find({ _id: { $in: container.files } })
            .populate('user', 'name email')
            .populate('folder', 'name')
            .exec();
            
        res.send({ files, container })
    } catch (error) {
        res.status(500).send({ message: error.message })
    }
})

// create share link

router.post('/', userChecker, async (req, res) => {
    const { files, user, type } = req.body
    try {
        const container = new Shared({ files, user, type })
        const result = await container.save()
        res.send({ message: 'Shared link created successfully', result })
    } catch (error) {
        res.status(500).send({ message: error.message })
    }
})

// delete share link
router.delete('/:id', userChecker, async (req, res) => {
    const id = req.params.id
    try {
        await Shared.findByIdAndDelete(id)
        res.send({ message: 'Shared link deleted successfully' })
    } catch (error) {
        res.status(500).send({ message: error.message })
    }
})

module.exports = router