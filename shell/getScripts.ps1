git -C C:\Users\Administrator\Desktop\scripts clone https://github.com/samuelmartensson/adflow-scripts.git .
cd C:\Users\Administrator\Desktop\scripts\
npm install
Copy-Item "C:\Users\Administrator\Desktop\creds\.env" -Destination "C:\Users\Administrator\Desktop\scripts\"
Copy-Item "C:\Users\Administrator\Desktop\creds\serviceaccountcred.json" -Destination "C:\Users\Administrator\Desktop\scripts\"