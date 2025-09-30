import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
    host: process.env.MAIL_HOST,
    port: process.env.MAIL_PORT,
    auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS,
    },
});

export const sendPasswordResetEmail = async (to, token) => {
    const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;

    const mailOptions = {
        from: `SSO Project <${process.env.MAIL_FROM}>`,
        to,
        subject: 'Redefinição de Palavra-passe',
        html: `
            <p>Recebeu este e-mail porque solicitou uma redefinição de palavra-passe para a sua conta.</p>
            <p>Clique no link abaixo para redefinir a sua palavra-passe:</p>
            <a href="${resetLink}">${resetLink}</a>
            <p>Se não solicitou esta redefinição, por favor, ignore este e-mail.</p>
        `,
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log('E-mail de redefinição de palavra-passe enviado para:', to);
    } catch (error) {
        console.error('Erro ao enviar e-mail:', error);
        throw new Error('Não foi possível enviar o e-mail de redefinição.');
    }
};

// NOVA FUNÇÃO
export const sendVerificationEmail = async (to, token) => {
    const verificationLink = `${process.env.FRONTEND_URL}/verify-email?token=${token}`;

    const mailOptions = {
        from: `SSO Project <${process.env.MAIL_FROM}>`,
        to,
        subject: 'Verifique o seu endereço de e-mail',
        html: `
            <p>Obrigado por se registar! Por favor, verifique o seu endereço de e-mail clicando no link abaixo:</p>
            <a href="${verificationLink}">${verificationLink}</a>
        `,
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log('E-mail de verificação enviado para:', to);
    } catch (error) {
        console.error('Erro ao enviar e-mail de verificação:', error);
        throw new Error('Não foi possível enviar o e-mail de verificação.');
    }
};