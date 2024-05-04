// Node Mailer
const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
    host: "smtp-relay.brevo.com",
    port: 587,
    secure: false, // upgrade later with STARTTLS
    auth: {
        user: "mdtomiz71@gmail.com",
        pass: "pEWbBwa5D0NPIrOn",
    },
});


module.exports = transporter