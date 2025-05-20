// src/mailer.js
require('dotenv').config();
const nodemailer = require('nodemailer');
const fs = require('fs');

// 1. Configurar el transportador SMTP
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT, 10),
  secure: false, // false = STARTTLS (puerto 587), true = TLS directo (puerto 465)
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

// 2. Leer destinatarios desde el JSON
let recipients = [];
try {
  const data = fs.readFileSync('./src/recipients.json', 'utf8');
  recipients = JSON.parse(data);
} catch (err) {
  console.error('❌ Error al leer recipients.json:', err.message);
  process.exit(1);
}

// 3. Tamaño del lote: cuántos correos enviar en paralelo
const BATCH_SIZE = parseInt(process.env.MAX_CONCURRENT_EMAILS || '5', 10);

// 4. Función para enviar un solo correo
async function sendEmail({ name, email }) {
  const mailOptions = {
    from: '"Mi Empresa" <noreply@miempresa.com>',
    to: email,
    subject: 'Correo Masivo',
    html: `<p>Hola <b>${name}</b>, este es un correo masivo enviado con Node.js y Nodemailer.</p>`
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ Enviado a ${email}: ${info.messageId}`);
  } catch (err) {
    console.error(`❌ Error al enviar a ${email}: ${err.message}`);
    // Opcional: registrar error en un archivo
    // fs.appendFileSync('errores.log', `${new Date().toISOString()} | ${email} | ${err.message}\n`);
  }
}

// 5. Función que divide el arreglo en “batches” (lotes) de tamaño BATCH_SIZE
function chunkArray(array, size) {
  const chunks = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

// 6. Función principal: envía los correos en lotes secuenciales
async function sendAllEmailsInBatches() {
  const batches = chunkArray(recipients, BATCH_SIZE);
  console.log(`📬 Total de destinatarios: ${recipients.length}`);
  console.log(`⚙️ Enviando en lotes de ${BATCH_SIZE}… (${batches.length} lote(s) en total)\n`);

  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    console.log(`➡️ Iniciando lote ${i + 1}/${batches.length} (${batch.length} correos)…`);

    // Para cada correo del lote, creamos una promesa sendEmail(...)
    const promises = batch.map(person => sendEmail(person));

    // Esperamos a que todos en este lote terminen (éxito o fallo)
    await Promise.all(promises);

    console.log(`✅ Lote ${i + 1} completado.\n`);

    // Opcional: si quieres un pequeño delay entre lotes (para no “golpear” demasiado al SMTP),
    // podrías descomentar las líneas siguientes:
    // await new Promise(res => setTimeout(res, 2000)); // espera 2 segundos
  }

  console.log('🎉 Todos los correos han sido procesados.');
}

// 7. Ejecutar la función
sendAllEmailsInBatches();
