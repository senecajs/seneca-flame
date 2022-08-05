
const Seneca = require('seneca')


let seneca = Seneca({legacy:false})
    .test('print')
    .use('promisify')
    .use('..')
    .use('repl',{port:40404})
    .add('a:1', function f1(msg, reply, meta) {
      console.log(meta)
      let start = Date.now()
      setTimeout(()=>{
        reply({x:msg.x+1, f1:Date.now()-start})
      },100)
    })
    .add('a:1', function f2(msg, reply) {
      let start = Date.now()
      setTimeout(()=>{
        this.prior(msg, (err, out)=>{
          out.x+=2
          out.f2 = Date.now()-start
          reply(out)
        })
      },100)
    })
    .add('a:1', function f3(msg, reply) {
      let start = Date.now()
      setTimeout(()=>{
        this.prior(msg, (err, out)=>{
          out.x+=3
          out.f3 = Date.now()-start
          reply(out)
        })
      },100)
    })





