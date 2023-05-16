var main = {}
const LOAD_FULL_THRESHOLD_MS = 120_000;


dom.ready(function() {

	main.vp    = dom.one('.viewport')
	main.cvs   = dom.one('.place')
	main.img   = new Image();

	main.timer = new Timer(tick)
	main.view  = new Viewport(main.vp)

	main.lastFullImage = new Date(0);

	main.viewPositionVersion = -1

	init();
})

function init() {
	main.socket = new ReconnectingWebSocket('wss://btmc.live:32727/ws');

	main.socket.onopen = () => {
		console.log('Successfully Connected');
	};

	main.socket.onclose = event => {
		console.log('Socket Closed Connection: ', event);
		main.socket.send('Client Closed!');
	};

	main.socket.onerror = error => { console.log('Socket Error: ', error); };


	main.socket.onmessage = event => {
		let data = event.data;
		if (data.startsWith('partial|')) {
			console.log(`Got a partial update: ${data.split('|')[1]}`)
			main.img.src = data.split('|')[1]
			return;
		}

		if ((new Date() - main.lastFullImage) > LOAD_FULL_THRESHOLD_MS && data.startsWith('full|')) {
			console.log(`Got a full canvas: ${data.split('|')[1]}`)
			main.img.src = data.split('|')[1]
			main.lastFullImage = new Date()
		}
	};

	main.scale = 2
	main.sizeX = 1000
	main.sizeY = 1000
	main.meta = {}

	main.cvs.width  = main.sizeX
	main.cvs.height = main.sizeY
	main.ctx = main.cvs.getContext('2d')
	main.ctx.imageSmoothingEnabled = false

	main.img.crossOrigin = "anonymous";
	main.img.src = "https://cuno-do-spaces.ams3.digitaloceanspaces.com/mcplace/latest.png"
	main.img.onload = function () {
		main.ctx.drawImage(main.img, 0, 0, main.img.width, main.img.height);
	}

	main.ctx.fillStyle = '#727272'
	main.ctx.fillRect(0, 0, main.sizeX, main.sizeY)
	main.idat = main.ctx.getImageData(0, 0, main.sizeX, main.sizeY)

	dom.on('resize', window, onresize)

	var zin  = dom.one('.zoom-in')
	,   zout = dom.one('.zoom-out')
	,   zfit = dom.one('.zoom-fit')

	dom.on('tap', zin,  f.binda(zoom,  null, [1/2]))
	dom.on('tap', zout, f.binda(zoom,  null, [  2]))
	dom.on('tap', zfit, fit)

	var zic = zin.getContext('2d')
	zic.scale(4, 4)
	zic.fillRect(1, 3, 5, 1)
	zic.fillRect(3, 1, 1, 5)

	var zoc = zout.getContext('2d')
	zoc.scale(4, 4)
	zoc.fillRect(1, 3, 5, 1)

	var zfc = zfit.getContext('2d')
	zfc.scale(4, 4)
	zfc.fillRect(1, 1, 5, 5)
	zfc.clearRect(2, 2, 3, 3)
	zfc.clearRect(3, 1, 1, 5)
	zfc.clearRect(1, 3, 5, 1)

	setTimeout(run)
}

function run() {
	onresize()

	main.timer.play()
	main.view.setDistance(16, Math.max(main.sizeX, main.sizeY) * 1.1)
	main.view.setBorders(main.sizeX, main.sizeY, 100)
	main.view.animationStart()

	fit()
}

function tick(t) {
	updateTransformVP()
}

function onresize() {

}

function zoom(s) {
	main.view.zoom(s)
}

function fit() {
	main.view.setPosition(0, 0, main.sizeY * 1.1)
}

function updateTransformVP() {
	// var cp = main.view.getCenter()
	// var tl = main.view.getScreenPoint(-main.sizeX / 2, +main.sizeY / 2)
	// var tr = main.view.getScreenPoint(+main.sizeX / 2, +main.sizeY / 2)
	// var bl = main.view.getScreenPoint(-main.sizeX / 2, -main.sizeY / 2)
	// var br = main.view.getScreenPoint(+main.sizeX / 2, -main.sizeY / 2)

	// dom.one('.point.cp').style.transform = ['translate(', cp[0], 'px,', cp[1], 'px)'].join('')
	// dom.one('.point.tl').style.transform = ['translate(', tl[0], 'px,', tl[1], 'px)'].join('')
	// dom.one('.point.tr').style.transform = ['translate(', tr[0], 'px,', tr[1], 'px)'].join('')
	// dom.one('.point.bl').style.transform = ['translate(', bl[0], 'px,', bl[1], 'px)'].join('')
	// dom.one('.point.br').style.transform = ['translate(', br[0], 'px,', br[1], 'px)'].join('')

	if(main.viewPositionVersion !== main.view.positionUpdated) {
		main.viewPositionVersion = main.view.positionUpdated

		var t = main.view.getTransform(main.sizeX, main.sizeY)
		var s = (t[2] + t[3]) / 2

		main.cvs.style.transform = ''
			+' translate('+ t[0] +'px,'+ t[1] +'px)'
			+' scale('+ s +')'
			// +' scale('+ Math.pow(2, Math.round(Math.log2(s))) +')'

		main.cvs.style.transformOrigin = '0 0'
	}
}


function parseColor(color) {
	var r = parseInt(color.slice(1, 3), 16)
	,   g = parseInt(color.slice(3, 5), 16)
	,   b = parseInt(color.slice(5, 7), 16)

	return [r, g, b]
}

function fillColors(result, colors) {
	colors.forEach(function(color, index) {
		var parsed = parseColor(color)
		result[index * 3 + 0] = parsed[0]
		result[index * 3 + 1] = parsed[1]
		result[index * 3 + 2] = parsed[2]
	})
}
