const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.yandex.ru',
    port: parseInt(process.env.EMAIL_PORT) || 465,
    secure: true,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

async function sendVerificationCode(email, code) {
    const mailOptions = {
        from: `"MEME XCHANGE" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: 'Код подтверждения | MEME XCHANGE',
        html: `
            <div style="font-family: Arial; max-width: 400px; margin: 0 auto; padding: 20px; background: #0A0A0F; color: #EDEDED; border-radius: 16px; border: 1px solid #00FF88;">
                <h2 style="color: #00FF88;">🚀 MEME XCHANGE</h2>
                <p>Твой код подтверждения:</p>
                <div style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #00FF88; background: #111117; padding: 16px; text-align: center; border-radius: 12px; margin: 20px 0;">${code}</div>
                <p style="color: #7A7A8C; font-size: 14px;">Код действителен 10 минут.</p>
            </div>
        `
    };
    return transporter.sendMail(mailOptions);
}

module.exports = { sendVerificationCode };