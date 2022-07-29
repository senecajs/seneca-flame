
const Seneca = require('seneca')


let seneca = Seneca({legacy:false})
    .test('print')
    .use('promisify')
    .use('..')
    .use('repl',{port:41414})

// TOOD: fix seneca/@flame to work with top level messages:
// Uncaught TypeError: Cannot destructure property 'name' of 'plugin' as it is undefined.
//    at outwardHandler (/Users/richard/Projects/seneca/flame/dist/flame.js:25:13)

    .use(function foo() {
      this
        .add('cc:3', function f3(msg, reply, meta) {
          console.log(meta)
          let start = Date.now()
          setTimeout(()=>{
            reply({x:msg.x+1, f1:Date.now()-start})
          },100)
        })
        .add('bb:2', function f2(msg, reply) {
          let start = Date.now()
          setTimeout(()=>{
            this.act({cc:3,x:msg.x}, (err, out)=>{
              out.x+=2
              out.f2 = Date.now()-start
              reply(out)
            })
          },100)
        })
        .add('aa:1', function f1(msg, reply) {
          let start = Date.now()
          setTimeout(()=>{
            this.act({bb:2,x:msg.x}, (err, out)=>{
              out.x+=3
              out.f3 = Date.now()-start
              reply(out)
            })
          },100)
        })
    })



