import smtplib
from email.mime.text import MIMEText

msg = MIMEText('If you are reading this, your Outlook SMTP is working!')
msg['Subject'] = 'Test Email from SMTP Setup'
msg['From'] = 'MBAplanner@outlook.com'
msg['To'] = 'tarun.shekhawat2027@bitsom.edu.in'

try:
    server = smtplib.SMTP('smtp-mail.outlook.com', 587)
    server.set_debuglevel(1)
    server.starttls()
    server.login('MBAplanner@outlook.com', 'byfxigwgfnwvppyf')
    server.send_message(msg)
    server.quit()
    print("Email sent successfully!")
except Exception as e:
    print(f"Failed to send email: {e}")
