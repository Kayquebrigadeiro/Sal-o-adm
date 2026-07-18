function sendInvitation(email, { tempPass, salao_id, role }) {
  console.log(`Enviar convite para ${email} | salao: ${salao_id} | role: ${role} | senha temporaria: ${tempPass}`);
  // Aqui comentar onde plugar um provedor real (SendGrid/Mailgun):
  // - gerar template HTML
  // - enviar através do client do provedor
}

function sendEmail(email, subject, body) {
  console.log(`Enviar email para ${email} | subject: ${subject} | body: ${body}`);
}

module.exports = { sendInvitation, sendEmail };
