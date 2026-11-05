// Firma ad-hoc dell'app (senza certificato Apple): senza firma macOS la considera
// "danneggiata"; con la firma ad-hoc basta "Apri comunque" una volta.
const path = require('path');
const { execFileSync } = require('child_process');

exports.default = async function adhocSign(context) {
  if (context.electronPlatformName !== 'darwin') return;
  const appPath = path.join(context.appOutDir, `${context.packager.appInfo.productFilename}.app`);
  execFileSync('codesign', ['--force', '--deep', '--sign', '-', appPath], { stdio: 'inherit' });
};
