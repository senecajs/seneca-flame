import { mkdtempSync, readFileSync, rmSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'

import Flame from '../src/flame'

const Seneca = require('seneca')

function sleep(time: number) {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(true)
    }, time)
  })
}

describe('flame', () => {
  test('happy', async () => {
    const seneca = Seneca({ legacy: false }).test().use(Flame)
    await seneca.ready()
    expect(await seneca.post('sys:flame,cmd:capture_status')).toEqual({
      status: false,
    })
    await seneca.close()
  })

  test('collects-data', async () => {
    jest.setTimeout(10000)

    const seneca = Seneca({ legacy: false })
      .test()
      .use(Flame, { capture: true })
      .add('a:1', function b1(this: any, msg: any, reply: any) {
        setTimeout(() => {
          reply({ x: 1 + msg.x })
        }, 400 + 400 * Math.random())
      })

    await seneca.post('a:1')

    await sleep(1000)

    const flameChart = await seneca.post('sys:flame,cmd:get')
    const { children } = flameChart
    expect(children).toBeInstanceOf(Array)
    expect(children).toHaveLength(1)

    const rootPlugin = flameChart.children.find((c: any) => c.name === 'root$')
    expect(rootPlugin).toBeDefined()
    expect(rootPlugin.children.map((c: any) => c.name)).toEqual(['a:1'])

    // An unchanged graph is not sent again.
    expect(await seneca.post('sys:flame,cmd:get,cached:true')).toEqual(
      flameChart
    )
    expect(await seneca.post('sys:flame,cmd:get,cached:true')).toEqual({
      data: false,
    })

    // Checks if it creates and gets data for individual graph's
    const { id } = await seneca.post('sys:flame,cmd:create_frame')

    await seneca.post('a:1')
    await sleep(1000)

    const { success, data } = await seneca.post(
      `sys:flame,cmd:get_frame,id:${id}`
    )
    expect(success).toBe(true)
    expect(data).not.toBeNull()

    expect(data.children).toHaveLength(1)

    await seneca.close()
  })

  // @seneca/debug starts and stops capture with sys:flame,capture:<bool>.
  test('capture', async () => {
    const seneca = Seneca({ legacy: false })
      .test()
      .use(Flame)
      .message('a:1', async function a1(msg: any) {
        return { x: msg.x }
      })
    await seneca.ready()

    await seneca.post('a:1,x:1')
    await sleep(200)
    expect((await seneca.post('sys:flame,cmd:get')).children).toEqual([])

    expect(await seneca.post('sys:flame,capture:true')).toEqual({
      capture: true,
    })
    expect(await seneca.post('sys:flame,cmd:capture_status')).toEqual({
      status: true,
    })

    await seneca.post('a:1,x:2')
    await sleep(200)
    const graph = await seneca.post('sys:flame,cmd:get')
    expect(graph.children.map((c: any) => c.name)).toEqual(['root$'])

    expect(await seneca.post('sys:flame,capture:false')).toEqual({
      capture: false,
    })
    expect(await seneca.post('sys:flame,cmd:capture_status')).toEqual({
      status: false,
    })

    // Closing stops capture.
    await seneca.post('sys:flame,capture:true')
    await seneca.close()
    expect(await seneca.post('sys:flame,cmd:capture_status')).toEqual({
      status: false,
    })
  })

  // A message that matches no action has no plugin metadata.
  test('no-action', async () => {
    const seneca = Seneca({ legacy: false })
      .test()
      .quiet()
      .use(Flame, { capture: true })
    await seneca.ready()

    await expect(seneca.post('not:found')).rejects.toMatchObject({
      code: 'act_not_found',
    })
    expect(await seneca.post('sys:flame,cmd:capture_status')).toEqual({
      status: true,
    })

    await seneca.close()
  })

  test('frames', async () => {
    const seneca = Seneca({ legacy: false })
      .test()
      .use(Flame)
      .message('a:1', async function a1(msg: any) {
        return { x: msg.x }
      })
    await seneca.ready()

    const { id } = await seneca.post('sys:flame,cmd:create_frame')

    await seneca.post('a:1,x:1')
    await sleep(200)
    expect(
      (await seneca.post('sys:flame,cmd:get_frame', { id })).data.children
    ).toHaveLength(1)

    // A paused frame records nothing.
    expect(
      await seneca.post('sys:flame,cmd:toggle_frame', { id, state: 'off' })
    ).toEqual({ success: true })
    await seneca.post('a:1,x:2')
    await sleep(200)
    const paused = await seneca.post('sys:flame,cmd:get_frame', { id })
    expect(paused.data.children[0].children[0]._inner.count).toEqual(1)

    expect(
      await seneca.post('sys:flame,cmd:toggle_frame', { id, state: 'on' })
    ).toEqual({ success: true })
    await seneca.post('a:1,x:3')
    await sleep(200)
    const resumed = await seneca.post('sys:flame,cmd:get_frame', { id })
    expect(resumed.data.children[0].children[0]._inner.count).toEqual(2)

    const destroyed = await seneca.post('sys:flame,cmd:destroy_flame', { id })
    expect(destroyed.success).toEqual(true)
    expect(destroyed.data.children).toHaveLength(1)

    for (const msg of [
      'sys:flame,cmd:toggle_frame',
      'sys:flame,cmd:toggle_frame,state:on,id:x',
      'sys:flame,cmd:get_frame',
      'sys:flame,cmd:get_frame,id:x',
      'sys:flame,cmd:destroy_flame',
      'sys:flame,cmd:destroy_flame,id:x',
    ]) {
      expect((await seneca.post(msg)).success).toEqual(false)
    }

    await seneca.close()
  })

  test('snapshot', async () => {
    const seneca = Seneca({ legacy: false }).test().use(Flame)
    await seneca.ready()

    // Without a valid format the action replies once.
    expect(await seneca.post('sys:flame,cmd:snapshot')).toEqual({
      message: 'No format found.',
    })
    expect(await seneca.post('sys:flame,cmd:snapshot,format:pdf')).toEqual({
      message: 'No format found.',
    })

    // Snapshots are written below the working directory.
    const cwd = process.cwd()
    const dir = mkdtempSync(join(tmpdir(), 'seneca-flame-'))
    try {
      process.chdir(dir)

      const json = await seneca.post('sys:flame,cmd:snapshot,format:json')
      expect(json.filename).toMatch(/-snapshot\.json$/)
      expect(JSON.parse(readFileSync(json.filename, 'utf8')).name).toEqual(
        'root'
      )

      const html = await seneca.post('sys:flame,cmd:snapshot,format:html')
      expect(html.filename).toMatch(/index\.html$/)
      const text = readFileSync(html.filename, 'utf8')
      expect(text).not.toContain('$JSON_FILE')
      expect(text).toContain('-snapshot.json')
    } finally {
      process.chdir(cwd)
      rmSync(dir, { recursive: true, force: true })
    }

    await seneca.close()
  })
})
