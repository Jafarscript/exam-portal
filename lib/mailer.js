import nodemailer from 'nodemailer';

let transporter = null;
function getTransporter() {
  if (transporter) return transporter;
  if (!process.env.SMTP_HOST) {
    return null;
  }
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    connectionTimeout: 3000,
    greetingTimeout: 3000,
    socketTimeout: 3000,
  });
  return transporter;
}

// Fire-and-forget: email failures must never block or delay the HTTP response.
export function sendMail({ to, subject, html }) {
  // Use setImmediate / setTimeout so caller returns immediately
  setTimeout(async () => {
    try {
      const t = getTransporter();
      if (!t) {
        console.log(`[mail:dev] to=${to} subject="${subject}"`);
        return;
      }
      await t.sendMail({ from: process.env.MAIL_FROM || 'noreply@examportal.com', to, subject, html });
    } catch (err) {
      console.warn('Failed to send email (non-blocking):', err.message);
    }
  }, 0);
}

const wrap = (title, body) => `
  <div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;color:#1B2B26">
    <h2 style="color:#234A3F">${title}</h2>
    <div>${body}</div>
    <p style="color:#888;font-size:12px;margin-top:32px">Al-Huda Exam Portal</p>
  </div>`;

export const templates = {
  parentRegistrationReceived: (name) =>
    wrap('Registration received', `<p>Assalamu alaikum ${name},</p><p>Your parent account has been created and is pending teacher approval. You'll receive an email once it's reviewed.</p>`),
  parentApproved: (name) =>
    wrap('Account approved', `<p>Assalamu alaikum ${name},</p><p>Your parent account has been approved. You can now log in and add your children.</p>`),
  parentRejected: (name) =>
    wrap('Registration update', `<p>Assalamu alaikum ${name},</p><p>Your parent account registration was not approved. Please contact the teacher directly for more information.</p>`),
  newParentForTeacher: (name, email) =>
    wrap('New parent registration', `<p>${name} (${email}) has registered as a parent and is awaiting approval.</p>`),
  passwordReset: (link) =>
    wrap('Reset your password', `<p>Click the link below to reset your password. This link expires in 1 hour.</p><p><a href="${link}">${link}</a></p>`),
  examSubmittedForTeacher: (studentName, examTitle) =>
    wrap('Exam submitted', `<p>${studentName} has submitted "${examTitle}".</p>`),
  gradingPendingForTeacher: (studentName, examTitle) =>
    wrap('Manual grading pending', `<p>${studentName}'s submission for "${examTitle}" has questions awaiting manual grading.</p>`),
  resultFinalized: (studentName, examTitle, percentage, passed) =>
    wrap('Result finalized', `<p>The result for ${studentName} on "${examTitle}" is ready: <b>${percentage}%</b> - <b>${passed ? 'PASS' : 'FAIL'}</b>.</p>`),
  examDeadlineReminder: (studentName, examTitle, deadline) =>
    wrap('Exam deadline reminder', `<p>${studentName} has not yet completed "${examTitle}", due ${deadline}.</p>`),
};
