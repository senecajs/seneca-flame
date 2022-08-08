import Flame from '../src/flame';

const Seneca = require('seneca')

function sleep(time: number) {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(true);
    }, time)
  })  
}

describe('flame', () => {

  test('happy', async () => {
    const seneca = Seneca({ legacy: false }).test().use('promisify').use(Flame)
    await seneca.ready()
  })

  test('collects-data', async () => {
    jest.setTimeout(10000);

    const seneca = Seneca({ legacy: false })
      .test()
      .use('promisify')
      .use(Flame, { capture: true })
      .add('a:1', function b1(msg, reply, meta) {
        setTimeout(()=>{
          reply({x:1+msg.x})
        }, 400+(400*Math.random()))
      })


      await seneca.post('a:1');

      await sleep(1000);

      const flameChart = await seneca.post('sys:flame,cmd:get');
      const { children } = flameChart;
      expect(children).toBeInstanceOf(Array);
      expect(children).toHaveLength(1);

      const rootPlugin = flameChart.children.find((c) => c.name === "root$");
      expect(rootPlugin).not.toBeNull();
  })
})

