// http://localhost:8000/p1?x=1
const Express = require('express')
const Seneca = require('seneca')
import FlamePlugin from '../src/flame'

setupSeneca()

function setupSeneca() {
  Seneca()
    .test()
    .use('repl', { port: 10015 })
    /*
    .use('debug', {
			express: {
				port: 8890,
				host: 'localhost',
			},
			ws: {
				port: 8891,
			},
			wspath: '/debug',
			store: false,
			test: false,
			prod: false,
			flame: true,
		})
    */
    .use(FlamePlugin, { capture: true })
    .add('a:1', function actionC(msg, reply, meta) {
      setTimeout(() => {
        this.act('b:1', { x: msg.x }, function (err, out) {
          reply({ x: 2 * out.x })
        })
      }, 400 + 400 * Math.random())
    })
    .add('a:1', function actionB(msg, reply, meta) {
      setTimeout(() => {
        this.prior(msg, function (err, out) {
          reply({ x: out.x + 2 })
        })
      }, 400 + 400 * Math.random())
    })
    .add('a:1', function actionA(msg, reply, meta) {
      setTimeout(() => {
        this.prior(msg, function (err, out) {
          reply({ x: out.x + 1 })
        })
      }, 400 + 400 * Math.random())
    })
    .add('b:1', function b1(msg, reply, meta) {
      setTimeout(() => {
        reply({ x: 1 + msg.x })
      }, 400 + 400 * Math.random())
    })
    .ready(function () {
      setupExpress(this)
    })
}

function setupExpress(seneca) {
  Express()
    .get('/p1', function p1(req, res) {
      let x = parseInt(req.query.x || 1)

      seneca.act('a:1', { x }, function p1r(err, out, meta) {
        res.send({ ...out, t: Date.now() })
      })
    })
    .get('/p2', function p2(req, res) {
      seneca.act('sys:flame,cmd:get,cached:true', function p2r(err, out, meta) {
        res.send({ ...out })
      })
    })
    .get('/p3', function p3(req, res) {
      seneca.act('sys:flame,capture:true', function p3r(err, out, meta) {
        res.send(out)
      })
    })
    .get('/snapshot-json', function snapshotJson(req, res) {
      seneca.act(
        'sys:flame,cmd:snapshot,format:json',
        function snapshotJsonResponse(err, out, meta) {
          res.send(out)
        }
      )
    })
    .get('/snapshot-html', function snapshotHtml(req, res) {
      seneca.act(
        'sys:flame,cmd:snapshot,format:html',
        function snapshotJsonResponse(err, out, meta) {
          res.send(out)
        }
      )
    })
    .get('/create-frame', function createFrame(req, res) {
      seneca.act(
        'sys:flame,cmd:create_frame',
        function createFlameFrameResponse(err, out, meta) {
          res.send(out)
        }
      )
    })
    .get('/get-frame', function getFrame(req, res) {
      const { id } = req.query
      seneca.act(
        `sys:flame,cmd:get_frame,id:${id}`,
        function getFrameResponse(err, out, meta) {
          res.send(out)
        }
      )
    })
    .listen(8005)
}
