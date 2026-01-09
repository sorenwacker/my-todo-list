/* eslint-env node */
const { execSync } = require('child_process')
const path = require('path')

exports.default = async function (context) {
  if (process.platform !== 'darwin') return

  const appPath = path.join(
    context.appOutDir,
    `${context.packager.appInfo.productFilename}.app`
  )

  console.log('Re-signing app with ad-hoc signature:', appPath)

  try {
    execSync(`codesign --remove-signature "${appPath}"`, { stdio: 'inherit' })
  } catch (e) {
    // Ignore if no signature to remove
  }

  execSync(`codesign --force --deep --sign - "${appPath}"`, { stdio: 'inherit' })
  console.log('App signed successfully')
}
