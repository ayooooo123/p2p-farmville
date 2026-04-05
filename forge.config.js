module.exports = {
  packagerConfig: {
    icon: 'build/icon'
  },
  makers: [
    { name: '@electron-forge/maker-zip', platforms: ['darwin'] },
    { name: '@electron-forge/maker-deb', platforms: ['linux'] }
  ]
}
