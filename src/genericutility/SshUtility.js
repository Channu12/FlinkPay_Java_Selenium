// Port of org.tyss.flinkpay.genericutility.SshUtility (JSch -> ssh2)
const fs = require('fs');
const path = require('path');
const { Client } = require('ssh2');
const { UtilityObjectClass } = require('./UtilityObjectClass');

class SshUtility {
  async connectToUnixServer(host, port, username, password) {
    const session = new Client();
    try {
      await new Promise((resolve, reject) => {
        session.on('ready', resolve).on('error', reject).connect({
          host, port: parseInt(port, 10), username, password,
          readyTimeout: 20000,
          // StrictHostKeyChecking=no
          hostVerifier: () => true,
        });
      });
      return session;
    } catch (e) {
      console.error('SSH connection failed:', e.message); // Java: e.printStackTrace()
      return null;
    }
  }

  async disconnectFromUnixServer(session) {
    try { if (session) session.end(); } catch (e) { console.error(e.message); }
  }

  async ftpFromLocalToRemote(session, localFilePath, remoteDirectory) {
    let remoteFilePath = '';
    if (!fs.existsSync(localFilePath)) console.log('Local file not found: ' + localFilePath);
    let sftp;
    try {
      if (!session) throw new Error('No SSH session - check sshHost/sshPortNumber/sshUsername/sshPassword in CommonData.properties');
      sftp = await new Promise((resolve, reject) => session.sftp((err, s) => (err ? reject(err) : resolve(s))));
      remoteFilePath = remoteDirectory + path.basename(localFilePath);
      // If the file exists, remove it before uploading the new file
      await new Promise((resolve) => sftp.unlink(remoteFilePath, () => resolve()));
      await new Promise((resolve, reject) => sftp.fastPut(localFilePath, remoteFilePath, (err) => (err ? reject(err) : resolve())));
      UtilityObjectClass.getExtentTest()?.info('File transfer successful. ' + localFilePath);
    } catch (e) {
      UtilityObjectClass.getExtentTest()?.info('Failed to transfer the files..' + e.message);
    } finally {
      if (sftp) sftp.end();
    }
    return remoteFilePath;
  }

  async executeUnixCommand(session, command) {
    let res = '';
    try {
      if (!session) throw new Error('No SSH session - cannot run: ' + command);
      res = await new Promise((resolve, reject) => {
        session.exec(command, (err, stream) => {
          if (err) return reject(err);
          let out = '';
          stream.on('data', (d) => { out += d.toString(); })
            .on('close', () => resolve(out));
          stream.stderr.on('data', (d) => process.stderr.write(d));
        });
      });
      console.log(command + ' Command Execution is Successful');
    } catch (e) {
      console.error(e.message);
      console.log(command + ' Command Execution is Failed');
    }
    return res;
  }
}

module.exports = { SshUtility };
