const nodemailer = require("nodemailer");

async function main() {
  let transporter = nodemailer.createTransport({
    host: "smtp-mail.outlook.com",
    port: 587,
    secure: false, // true for 465, false for other ports
    auth: {
      user: "MBAplanner@outlook.com",
      pass: "byfxigwgfnwvppyf",
    },
  });

  try {
    let info = await transporter.sendMail({
      from: '"MBA Planner Test" <MBAplanner@outlook.com>',
      to: "tarun.shekhawat2027@bitsom.edu.in",
      subject: "Test Email from SMTP Setup",
      text: "If you are reading this, your Outlook SMTP is working!",
      html: "<b>If you are reading this, your Outlook SMTP is working!</b>",
    });
    console.log("Message sent successfully: %s", info.messageId);
  } catch (error) {
    console.error("Error occurred while sending email:");
    console.error(error);
  }
}

main();
