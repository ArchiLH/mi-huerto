const fs = require('fs')
const path = require('path')

const stripeGradle = path.join(__dirname, 'node_modules/@capacitor-community/stripe/android/build.gradle')

if (fs.existsSync(stripeGradle)) {
  let content = fs.readFileSync(stripeGradle, 'utf8')
  
  // Cambiar jvmTarget a 17 solo en el plugin de Stripe
  content = content.split('jvmTarget = "21"').join('jvmTarget = "17"')
  content = content.split("jvmTarget = '21'").join("jvmTarget = '17'")
  content = content.split('VERSION_21').join('VERSION_17')
  
  fs.writeFileSync(stripeGradle, content)
  console.log('✅ Fixed Stripe plugin build.gradle')
}

// Restaurar android/build.gradle sin forzar versiones
const androidBuildGradle = path.join(__dirname, 'android/app/capacitor.build.gradle')
if (fs.existsSync(androidBuildGradle)) {
  let content = fs.readFileSync(androidBuildGradle, 'utf8')
  content = content.split('VERSION_17').join('VERSION_21')
  fs.writeFileSync(androidBuildGradle, content)
  console.log('✅ Fixed capacitor.build.gradle')
}

const cordovaGradle = path.join(__dirname, 'android/capacitor-cordova-android-plugins/build.gradle')
if (fs.existsSync(cordovaGradle)) {
  let content = fs.readFileSync(cordovaGradle, 'utf8')
  content = content.split('VERSION_17').join('VERSION_21')
  fs.writeFileSync(cordovaGradle, content)
  console.log('✅ Fixed cordova plugins build.gradle')
}

console.log('🔧 All Gradle files fixed!')