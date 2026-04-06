/* global Bare */
console.log('Bare.argv:', JSON.stringify(Bare.argv))
Bare.IPC.write(JSON.stringify({ type: 'argv', argv: Bare.argv }) + '\n')
