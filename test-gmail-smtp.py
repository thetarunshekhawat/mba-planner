import smtplib
from email.mime.text import MIMEText

msg = MIMEText('If you are reading this, your Gmail SMTP is working perfectly!')
msg['Subject'] = 'Test Email from Gmail SMTP Setup'
msg['From'] = 'tarunsinghshekhwat@gmail.com'
msg['To'] = 'tarun.shekhawat2027@bitsom.edu.in'

try:
    server = smtplib.SMTP_SSL('smtp.gmail.com', 465)
    server.set_debuglevel(1)
    server.login('tarunsinghshekhwat@gmail.com', 'injkxjkzspusjkaq')
    server.send_message(msg)
    server.quit()
    print("Email sent successfully!")
except Exception as e:
    print(f"Failed to send email: {e}")
